import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Taro from '@tarojs/taro'
import { throttle, SelectorUtils, QueryUtils, execIfFunction, debounce } from '../utils/virtualList'

import type {
    IItemScrollTop,
    ISubPage,
    UseVirtualListOptions,
    VirtualListRef as VirtualListMethods,
    UseVirtualListReturn,
    VirtualListSegment,
    ObserverMap,
    ObserverCreatingSet,
    SubPageMap
} from '../types'

export const useVirtualList = <T>({
    list,
    listId,
    segmentNum,
    getSegmentNum,
    screenNum,
    guessItemHeight,
    onScrollToEnd,
    onScroll
}: UseVirtualListOptions<T>): UseVirtualListReturn<T> => {
    // State
    const [renderList, setRenderList] = useState<VirtualListSegment<T>[]>([])
    const [isCompleted, setIsCompleted] = useState(false)

    // 使用ref保持renderList引用，避免依赖变化
    const renderListRef = useRef(renderList)
    renderListRef.current = renderList

    // 使用精确的类型定义
    const segmentListRef = useRef<T[][]>([])
    const subPageMapRef = useRef<SubPageMap>(new Map<number, ISubPage>())
    const observersRef = useRef<ObserverMap>(new Map<number, Taro.IntersectionObserver>())
    const scrollHeightRef = useRef<number>(0)
    const viewHeightRef = useRef<number>(0)
    const headerHeightRef = useRef<number>(0)
    const currentPageRef = useRef<Taro.PageInstance>(Taro.getCurrentInstance().page!)
    const initializingRef = useRef<boolean>(false)
    const listRef = useRef<T[]>(list)
    // 缓存观察器创建状态，避免重复创建
    const observerCreatingRef = useRef<ObserverCreatingSet>(new Set<number>())
    // 缓存滚动位置，减少频繁查询
    const lastScrollInfoRef = useRef<{ scrollTop: number; height: number; scrollHeight: number }>({
        scrollTop: 0,
        height: 0,
        scrollHeight: 0
    })

    // Utils
    const selectorUtils = useMemo(() => {
        return new SelectorUtils(listId)
    }, [listId])

    // 绑定页面上下文，确保在小程序中 selectorQuery 命中正确节点
    const queryUtils = useMemo(() => {
        return new QueryUtils(selectorUtils, currentPageRef.current)
    }, [selectorUtils])
    const windowHeight = useMemo(() => Taro.getWindowInfo().windowHeight, [])

    // 分页逻辑
    const createSegmentList = useCallback(() => {
        const num = segmentNum === 'smart' ? Math.max(10, Math.floor(Math.sqrt(list.length))) : segmentNum
        segmentListRef.current = getSegmentNum(list, num)
    }, [list, segmentNum, getSegmentNum])

    // 清理观察器 - 添加更好的错误处理和状态重置
    const clearObservers = useCallback(() => {
        try {
            observersRef.current.forEach((observer, index) => {
                try {
                    observer?.disconnect()
                } catch (error) {
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`清理观察器 ${index} 时出错:`, error)
                    }
                }
            })
            observersRef.current.clear()
            observerCreatingRef.current.clear()
            subPageMapRef.current.clear()
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('清理观察器时出错:', error)
            }
        }
    }, [])

    // 更新滚动高度 - 添加缓存机制减少频繁查询
    const updateScrollHeight = useCallback(async () => {
        try {
            const info = await queryUtils.getScrollViewInfo()
            viewHeightRef.current = info.height
            scrollHeightRef.current = info.scrollHeight
            lastScrollInfoRef.current = info
            return info
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('更新滚动高度失败:', error)
            }
            return lastScrollInfoRef.current
        }
    }, [queryUtils])

    // 更新头部高度
    const updateHeaderHeight = useCallback(async () => {
        const height = await queryUtils.getHeaderHeight()
        headerHeightRef.current = height
    }, [queryUtils])

    // 初始化高度
    const initHeight = useCallback(
        async (index: number, update = false): Promise<void> => {
            const pageInfo = await queryUtils.getPageInfo(index)
            const height = pageInfo.height || (segmentListRef.current[index]?.length || 0) * guessItemHeight

            const pageData: ISubPage = {
                height,
                rendered: Boolean(pageInfo.items.length),
                items: pageInfo.items.map((item) => item.height),
                length: segmentListRef.current[index]?.length || 0
            }

            subPageMapRef.current.set(index, pageData)

            if (update) {
                setRenderList((prevList) => {
                    const newList = [...prevList]
                    const target = newList[index]
                    if (target && 'height' in target && target.height !== height) {
                        target.height = height
                        return newList
                    }
                    return prevList // 没有变化则返回原列表
                })
            }
        },
        [queryUtils, guessItemHeight]
    )

    // 创建交叉观察器 - 添加防重复创建机制
    const createIntersectionObserver = useCallback(
        async (index: number, retryCount = 0) => {
            // 防止重复创建
            if (observersRef.current.has(index) || observerCreatingRef.current.has(index)) {
                return
            }

            // 检查是否在有效范围内，避免对不存在的页面创建观察器
            if (index >= segmentListRef.current.length || index < 0) {
                return
            }

            // 标记正在创建状态
            observerCreatingRef.current.add(index)

            const pageClassSelector = selectorUtils.getPageClass(index)

            // 检查元素是否存在，最多重试3次
            // 使用简单 class 选择器检测元素是否已渲染
            const elementExists = await queryUtils.checkElementExists(pageClassSelector)

            if (!elementExists && retryCount < 3) {
                // 移除创建状态标记
                observerCreatingRef.current.delete(index)
                setTimeout(
                    () => {
                        createIntersectionObserver(index, retryCount + 1)
                    },
                    50 + retryCount * 50
                )
                return
            }

            // 如果元素仍然不存在，跳过观察器创建，避免错误
            if (!elementExists) {
                observerCreatingRef.current.delete(index)
                return
            }

            const height = viewHeightRef.current || windowHeight

            try {
                // 相对视窗观察，根据 screenNum 动态计算扩展范围
                // screenNum 表示前后各扩展多少个屏幕高度，用于预渲染
                // 先使用较小的扩展范围确保基本功能正常
                const extendHeight = Math.floor(screenNum * height * 0.5) // 暂时减半
                const observer = Taro.createIntersectionObserver(currentPageRef.current, {
                    thresholds: [0, 0.01, 0.05, 0.1, 0.3, 0.5, 1.0]
                }).relativeToViewport({
                    // 前后各扩展范围，用于预渲染
                    // 正数表示向外扩展监听区域，提前触发渲染
                    top: extendHeight,
                    bottom: extendHeight
                })

                // 采用简单 class 选择器，提升 observe 的命中率
                observer.observe(pageClassSelector, (res) => {
                    const intersectionRatio = res?.intersectionRatio || 0
                    const isIntersecting = res?.intersectionRect?.height && res?.intersectionRect?.width

                    // 使用更精确的阈值判断
                    const INTERSECTION_THRESHOLD = 0.001 // 可配置的阈值

                    if (!isIntersecting || intersectionRatio <= INTERSECTION_THRESHOLD) {
                        // 离开视窗，替换为占位符
                        setRenderList((prevList) => {
                            const newList = [...prevList]
                            // 只有当前是真实内容时才替换为占位符
                            if (Array.isArray(newList[index])) {
                                const currentHeight =
                                    subPageMapRef.current.get(index)?.height ||
                                    guessItemHeight * (segmentListRef.current[index]?.length || 0)
                                newList[index] = { height: currentHeight }
                                return newList
                            } else {
                                return prevList // 不需要更新状态
                            }
                        })
                    } else if (intersectionRatio > INTERSECTION_THRESHOLD) {
                        // 进入视窗，渲染实际内容
                        setRenderList((prevList) => {
                            const newList = [...prevList]
                            // 只有当前是占位符时才渲染真实内容
                            if (!Array.isArray(newList[index])) {
                                newList[index] = segmentListRef.current[index] || []
                                return newList
                            } else {
                                return prevList // 不需要更新状态
                            }
                        })

                        // 使用防抖机制避免频繁的相邻页面观察器创建
                        const adjacentObserverDebounce = debounce(() => {
                            const adjacentPages = [index - 1, index + 1, index + 2]
                            adjacentPages.forEach((pageIndex) => {
                                if (
                                    pageIndex >= 0 &&
                                    pageIndex < segmentListRef.current.length &&
                                    !observersRef.current.has(pageIndex) &&
                                    !observerCreatingRef.current.has(pageIndex)
                                ) {
                                    createIntersectionObserver(pageIndex)
                                }
                            })
                        }, 100)

                        requestAnimationFrame(async () => {
                            try {
                                await initHeight(index, true)
                                adjacentObserverDebounce()
                            } catch (error) {
                                if (process.env.NODE_ENV === 'development') {
                                    console.error(`处理交叉观察器回调时出错 (页面 ${index}):`, error)
                                }
                            }
                        })
                    }
                })

                observersRef.current.set(index, observer)
                // 移除创建状态标记
                observerCreatingRef.current.delete(index)
            } catch (error) {
                // 发生错误时也要移除创建状态标记
                observerCreatingRef.current.delete(index)
                if (process.env.NODE_ENV === 'development') {
                    console.error(`页面${index}观察器创建失败:`, error)
                }
            }
        },
        [screenNum, windowHeight, selectorUtils, guessItemHeight, queryUtils, initHeight]
    )

    // 初始化渲染列表
    const initRenderList = useCallback(async () => {
        if (initializingRef.current) return
        initializingRef.current = true

        setIsCompleted(false)
        await updateHeaderHeight()
        await updateScrollHeight()

        clearObservers()
        createSegmentList()

        const newRenderList: VirtualListSegment<T>[] = []

        if (segmentListRef.current.length > 0) {
            // 初始化时，只有第一页渲染为实际内容，其余都是占位符
            // 所有页面都由观察器动态控制渲染
            for (let i = 0; i < segmentListRef.current.length; i++) {
                if (i === 0) {
                    // 第一页直接渲染实际内容
                    newRenderList.push(segmentListRef.current[i])
                } else {
                    // 其余页面为占位符
                    newRenderList.push({ height: segmentListRef.current[i].length * guessItemHeight })
                }
            }
        }

        setRenderList(newRenderList)

        // 初始化高度和观察器
        if (newRenderList.length > 0) {
            try {
                // 并行初始化所有页面高度
                await Promise.allSettled(newRenderList.map((_, index) => initHeight(index)))

                // 批量创建观察器，减少延迟累积
                // 使用 requestAnimationFrame 确保DOM已渲染
                requestAnimationFrame(() => {
                    // 分批创建观察器，避免一次性创建过多导致性能问题
                    const batchSize = 5
                    let currentBatch = 0

                    const createBatch = () => {
                        const start = currentBatch * batchSize
                        const end = Math.min(start + batchSize, segmentListRef.current.length)

                        for (let i = start; i < end; i++) {
                            createIntersectionObserver(i)
                        }

                        currentBatch++
                        if (end < segmentListRef.current.length) {
                            // 下一批在下一帧创建
                            requestAnimationFrame(createBatch)
                        }
                    }

                    createBatch()
                })

                setIsCompleted(true)
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to initialize render list:', error)
                }
                setIsCompleted(true) // 即使出错也要标记完成
            }
        } else {
            setIsCompleted(true)
        }

        initializingRef.current = false
    }, [
        updateHeaderHeight,
        updateScrollHeight,
        clearObservers,
        createSegmentList,
        guessItemHeight,
        initHeight,
        createIntersectionObserver
    ])

    // 获取项目滚动位置 - 使用缓存和更高效的计算
    const getItemScrollTop = useCallback(
        (index: number): IItemScrollTop => {
            let scrollTop = headerHeightRef.current
            let height = 0
            let rendered = false
            let segIdx = 0
            let curIdx = 0

            if (index < 0) {
                return { height: 0, scrollTop: 0, rendered: false, pageIndex: 0 }
            }

            // 使用当前渲染列表的引用，避免依赖数组变化
            const currentRenderList = renderListRef.current

            // 遍历当前渲染列表，计算累积高度
            for (let pageIdx = 0; pageIdx < currentRenderList.length; pageIdx++) {
                const page = currentRenderList[pageIdx]
                const segmentData = segmentListRef.current[pageIdx]

                if (!segmentData) break

                const pageLength = segmentData.length

                if (curIdx + pageLength - 1 < index) {
                    // 目标项在后面的页面，累加当前页面高度
                    curIdx += pageLength

                    if (Array.isArray(page)) {
                        // 当前页面是实际内容，使用实测高度或猜测高度
                        const pageData = subPageMapRef.current.get(pageIdx)
                        const actualHeight = pageData?.height || pageLength * guessItemHeight
                        scrollTop += actualHeight
                    } else {
                        // 当前页面是占位符，使用占位符高度
                        scrollTop += page.height
                    }
                    segIdx++
                } else {
                    // 找到目标项所在页面
                    const pos = index - curIdx

                    if (Array.isArray(page)) {
                        // 页面已渲染，尝试获取实际高度
                        const pageData = subPageMapRef.current.get(pageIdx)
                        if (pageData && pageData.items.length > pos) {
                            height = pageData.items[pos] || guessItemHeight
                            rendered = true
                            // 使用更高效的reduce计算
                            scrollTop += pageData.items.slice(0, pos).reduce((sum, itemHeight) => sum + itemHeight, 0)
                        } else {
                            height = guessItemHeight
                            rendered = true // 页面已渲染，但可能还没测量高度
                            scrollTop += guessItemHeight * pos
                        }
                    } else {
                        // 页面是占位符，使用猜测高度
                        height = guessItemHeight
                        rendered = false
                        scrollTop += guessItemHeight * pos
                    }
                    break
                }
            }

            return {
                height,
                scrollTop,
                rendered,
                pageIndex: Math.min(segIdx, currentRenderList.length - 1)
            }
        },
        [guessItemHeight]
    )

    /** 获取指定页的滚动信息 */
    const getPageScrollTop = useCallback(
        (index: number): { scrollTop: number; height: number; rendered: boolean; pageIndex: number } => {
            let scrollTop = headerHeightRef.current
            let height = 0
            let rendered = false
            let pageIndex = index

            if (index > 0) {
                const pageInfo = subPageMapRef.current.get(index)
                if (pageInfo) {
                    height = pageInfo.height
                    rendered = pageInfo.rendered
                    pageIndex = index

                    for (let i = 0; i < pageIndex; i++) {
                        scrollTop += subPageMapRef.current.get(i)?.height || 0
                    }
                }
            }

            return {
                scrollTop,
                height,
                rendered,
                pageIndex
            }
        },
        []
    )

    // 滚动结束检测
    const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null)
    const onScrollEndRef = useRef(onScrollToEnd)
    onScrollEndRef.current = onScrollToEnd

    // 滚动处理 - 减少不必要的DOM查询和状态更新
    const handleScroll = useMemo(
        () =>
            throttle(
                async () => {
                    try {
                        const info = await queryUtils.getScrollViewInfo()
                        lastScrollInfoRef.current = info
                        execIfFunction(onScroll, info)

                        // 小程序环境下使用 IntersectionObserver，无需基于滚动位置渲染策略
                        if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
                            return
                        }

                        // 使用更智能的页面范围计算
                        const avgPageLength = Math.max(1, Math.floor(list.length / segmentListRef.current.length))
                        const currentPage = Math.floor(info.scrollTop / (guessItemHeight * avgPageLength))
                        const visibleRange = Math.ceil(info.height / (guessItemHeight * avgPageLength)) + 1
                        const startPage = Math.max(0, currentPage - 1)
                        const endPage = Math.min(segmentListRef.current.length - 1, currentPage + visibleRange + 1)

                        // 批量处理状态更新，减少渲染次数
                        let needsUpdate = false
                        const updates: Array<{ index: number; content: T[] | { height: number } }> = []

                        renderListRef.current.forEach((page, pageIndex) => {
                            // 如果页面不在当前视窗范围内且是真实内容，替换为占位符
                            if (Array.isArray(page) && (pageIndex < startPage || pageIndex > endPage)) {
                                const currentHeight =
                                    subPageMapRef.current.get(pageIndex)?.height ||
                                    guessItemHeight * (segmentListRef.current[pageIndex]?.length || 0)
                                updates.push({ index: pageIndex, content: { height: currentHeight } })
                                needsUpdate = true
                            }
                        })

                        // 只有在确实需要更新时才更新状态
                        if (needsUpdate) {
                            setRenderList((prevList) => {
                                const newList = [...prevList]
                                updates.forEach(({ index, content }) => {
                                    newList[index] = content
                                })
                                return newList
                            })
                        }

                        // 批量创建观察器，减少异步操作
                        const observersToCreate: number[] = []
                        for (let i = startPage; i <= endPage; i++) {
                            if (!observersRef.current.has(i) && !observerCreatingRef.current.has(i)) {
                                observersToCreate.push(i)
                            }
                        }

                        // 使用 Promise.allSettled 并行创建观察器
                        if (observersToCreate.length > 0) {
                            Promise.allSettled(observersToCreate.map((i) => createIntersectionObserver(i)))
                        }

                        // 清除之前的定时器
                        if (scrollEndTimerRef.current) {
                            clearTimeout(scrollEndTimerRef.current)
                        }

                        // 设置新的定时器检测滚动结束
                        scrollEndTimerRef.current = setTimeout(() => {
                            execIfFunction(onScrollEndRef.current)
                        }, 300)
                    } catch (error) {
                        if (process.env.NODE_ENV === 'development') {
                            console.error('Scroll handler error:', error)
                        }
                    }
                },
                100,
                300
            ),
        [queryUtils, onScroll, createIntersectionObserver, guessItemHeight, list.length]
    )

    // 计算估算的滚动位置
    const calculateEstimatedScrollTop = useCallback(
        (index: number, pageIndex: number, itemIndexInPage: number) => {
            // 使用已有的 getItemScrollTop 方法计算位置
            const scrollInfo = getItemScrollTop(index)

            if (scrollInfo.rendered) {
                // 如果数据显示已渲染，直接使用计算的位置
                return scrollInfo.scrollTop
            } else {
                // 如果未渲染，使用估算位置
                // 基于前面已渲染页面的高度 + 当前页面的估算高度
                let estimatedTop = 0

                // 累加前面所有页面的高度
                for (let i = 0; i < pageIndex; i++) {
                    const pageHeight =
                        subPageMapRef.current.get(i)?.height ||
                        (segmentListRef.current[i]?.length || 0) * guessItemHeight
                    estimatedTop += pageHeight
                }

                // 加上当前页面内的位置
                estimatedTop += itemIndexInPage * guessItemHeight

                // 加上头部高度
                estimatedTop += headerHeightRef.current

                return estimatedTop
            }
        },
        [getItemScrollTop, segmentListRef, subPageMapRef, guessItemHeight, headerHeightRef]
    )

    // 合并滚动策略 - 一次性滚动到目标位置
    const scrollTo = useCallback(
        async (index: number, offsetTop = 0): Promise<boolean> => {
            if (!isCompleted) return false

            try {
                // 计算目标项在哪一页以及页面内的索引
                let pageIndex = 0
                let itemIndexInPage = index
                let currentCount = 0

                for (let i = 0; i < segmentListRef.current.length; i++) {
                    const pageLength = segmentListRef.current[i].length
                    if (currentCount + pageLength > index) {
                        pageIndex = i
                        itemIndexInPage = index - currentCount
                        break
                    }
                    currentCount += pageLength
                }

                // 检查目标元素是否已存在
                const itemSelector = selectorUtils.getSpecificItemSelector(pageIndex, itemIndexInPage)
                const elementExists = await queryUtils.checkElementExists(itemSelector)

                if (elementExists) {
                    // 元素已存在，直接滚动到精确位置

                    const scrollSuccess = await queryUtils.scrollToElement(itemSelector, { offsetTop })
                    if (scrollSuccess) {
                        execIfFunction(onScrollToEnd)
                        return true
                    } else {
                        return false
                    }
                } else {
                    // 计算估算的滚动位置
                    const estimatedScrollTop = calculateEstimatedScrollTop(index, pageIndex, itemIndexInPage)

                    if (estimatedScrollTop >= 0) {
                        // 直接滚动到估算位置
                        const vlInfo = await queryUtils.getScrollViewInfo()
                        const scrollViewNode = await queryUtils.getScrollViewNode()

                        if (scrollViewNode?.scrollTo) {
                            scrollViewNode.scrollTo({
                                top: Math.min(Math.max(estimatedScrollTop - offsetTop, 0), vlInfo.scrollHeight),
                                animated: false
                            })

                            // 尝试精确定位（如果此时元素已渲染）
                            const nowExists = await queryUtils.checkElementExists(itemSelector)
                            if (nowExists) {
                                const finalSuccess = await queryUtils.scrollToElement(itemSelector, { offsetTop })
                                if (finalSuccess) {
                                    execIfFunction(onScrollToEnd)
                                    return true
                                }
                            } else {
                                execIfFunction(onScrollToEnd)
                                return true
                            }
                        }
                    }

                    return false
                }
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('合并滚动错误:', error)
                }
                return false
            }
        },
        [isCompleted, segmentListRef, selectorUtils, queryUtils, onScrollToEnd, calculateEstimatedScrollTop]
    )

    // 滚动到视图中
    const scrollIntoView = useCallback(
        async (index: number, offsetTop = 0): Promise<boolean> => {
            try {
                const info = await queryUtils.getScrollViewInfo()
                const { scrollTop: targetScrollTop, height: targetHeight } = getItemScrollTop(index)

                const isInView =
                    info.scrollTop <= targetScrollTop && info.scrollTop + info.height >= targetScrollTop + targetHeight

                if (!isInView) {
                    return await scrollTo(index, offsetTop)
                } else {
                    execIfFunction(onScrollToEnd)
                    return true
                }
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('ScrollIntoView error:', error)
                }
                return false
            }
        },
        [queryUtils, getItemScrollTop, scrollTo, onScrollToEnd]
    )

    // 更新渲染列表
    const updateRenderList = useCallback(
        async (callback?: () => void): Promise<void> => {
            try {
                await Promise.allSettled(renderListRef.current.map((_, index) => initHeight(index)))

                setRenderList((prevList) => [...prevList])

                if (callback) {
                    callback()
                }
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Update render list error:', error)
                }
            }
        },
        [initHeight]
    )

    // 获取滚动信息
    const getScrollInfo = useCallback(async () => {
        return await queryUtils.getScrollViewInfo()
    }, [queryUtils])

    // Effects - 只在list引用变化时重新初始化
    useEffect(() => {
        if (list !== listRef.current) {
            listRef.current = list
            initRenderList()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [list])

    // 首次初始化
    useEffect(() => {
        if (!initializingRef.current && renderList.length === 0) {
            initRenderList()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        return () => {
            clearObservers()
        }
    }, [clearObservers])

    const methods: VirtualListMethods = useMemo(() => {
        return {
            scrollTo,
            scrollIntoView,
            getItemScrollTop,
            updateHeaderHeight,
            updateRenderList,
            getScrollInfo,
            getPageScrollTop
        }
    }, [
        scrollTo,
        scrollIntoView,
        getItemScrollTop,
        updateHeaderHeight,
        updateRenderList,
        getScrollInfo,
        getPageScrollTop
    ])

    return {
        renderList,
        isCompleted,
        handleScroll,
        methods
    }
}
