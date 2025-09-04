import Taro, { ScrollViewContext } from '@tarojs/taro'

/**
 * 节流函数工具类
 * @param fn 回调函数
 * @param delay 延迟毫秒数
 * @param mustRunDelay 延迟多少毫秒，强制执行一下
 */
export const throttle = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
    mustRunDelay: number
): ((...args: Parameters<T>) => void) => {
    let timer: NodeJS.Timeout | null = null
    let startTime: number | null = null
    let lastArgs: Parameters<T> | null = null

    return (...args: Parameters<T>) => {
        const curTime = Date.now()
        lastArgs = args

        if (timer) {
            clearTimeout(timer)
            timer = null
        }

        if (!startTime) {
            startTime = curTime
        }

        if (curTime - startTime >= mustRunDelay) {
            fn.apply(null, args)
            startTime = curTime
            lastArgs = null
        } else {
            timer = setTimeout(() => {
                if (lastArgs) {
                    fn.apply(null, lastArgs)
                    lastArgs = null
                }
                timer = null
            }, delay)
        }
    }
}

/**
 * 创建延迟Promise
 */
export const createDeferred = <T = unknown>() => {
    let resolve: ((value: T | PromiseLike<T>) => void) | null = null
    let reject: ((reason?: any) => void) | null = null

    const promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve
        reject = _reject
    })

    return {
        promise,
        resolve: resolve!,
        reject: reject!
    }
}

/**
 * 分页逻辑
 */
export const getSegmentList = <T = any>(list: T[], segmentNum: number): T[][] => {
    // 边界检查
    if (!Array.isArray(list) || list.length === 0) {
        return []
    }

    if (segmentNum <= 0) {
        return [list]
    }

    // 预分配数组大小，提高性能
    const totalPages = Math.ceil(list.length / segmentNum)
    const result: T[][] = new Array(totalPages)

    for (let i = 0; i < totalPages; i++) {
        const start = i * segmentNum
        const end = Math.min(start + segmentNum, list.length)
        result[i] = list.slice(start, end)
    }

    return result
}

/**
 * 选择器工具类 - 添加缓存和更好的性能
 */
export class SelectorUtils {
    private listId: string
    // 选择器缓存，避免重复字符串拼接
    private selectorCache = new Map<string, string>()

    constructor(listId: string) {
        this.listId = listId
    }

    /**
     * 带缓存的选择器生成
     */
    private getCachedSelector(key: string, generator: () => string): string {
        if (!this.selectorCache.has(key)) {
            this.selectorCache.set(key, generator())
        }
        return this.selectorCache.get(key)!
    }

    /**
     * 获取虚拟列表的容器选择器
     */
    getVlSelector() {
        return this.getCachedSelector('vl', () => `#${this.listId}`)
    }

    /**
     * 获取头部选择器
     */
    getHeaderSelector() {
        return this.getCachedSelector('header', () => `${this.getVlSelector()} .header-content`)
    }

    /**
     * 获取页面选择器
     * @param pageIndex 页面索引
     */
    getPageSelector(pageIndex: number) {
        return this.getCachedSelector(`page-${pageIndex}`, () => `${this.getVlSelector()} .vl-page-${pageIndex}`)
    }

    /**
     * 仅返回页面的 class 选择器，用于 IntersectionObserver
     * 小程序的 IntersectionObserver 对后代选择器支持较弱，
     * 使用简单选择器能显著提高兼容性。
     */
    getPageClass(pageIndex: number) {
        return this.getCachedSelector(`page-class-${pageIndex}`, () => `.vl-page-${pageIndex}`)
    }

    /**
     * 获取项目的选择器
     * @param pageIndex 页面索引
     */
    getItemSelector(pageIndex: number) {
        return this.getCachedSelector(`item-${pageIndex}`, () => `${this.getPageSelector(pageIndex)} .vl-item`)
    }

    /**
     * 获取具体项目的选择器
     * @param pageIndex 页面索引
     * @param itemIndex 页面内的项目索引
     */
    getSpecificItemSelector(pageIndex: number, itemIndex: number) {
        return this.getCachedSelector(`item-${pageIndex}-${itemIndex}`, () => `#vl-item-${pageIndex}-${itemIndex}`)
    }

    /**
     * 清理缓存方法
     */
    clearCache() {
        this.selectorCache.clear()
    }
}

/**
 * 查询工具类 - 添加缓存和错误重试机制
 */
export class QueryUtils {
    private selectorUtils: SelectorUtils
    private context?: Taro.PageInstance
    // 查询结果缓存
    private queryCache = new Map<string, { data: any; timestamp: number }>()
    private readonly CACHE_TTL = 1000 // 缓存存活时间 1秒

    constructor(selectorUtils: SelectorUtils, context?: Taro.PageInstance) {
        this.selectorUtils = selectorUtils
        this.context = context
    }

    /**
     * 带缓存的查询方法
     */
    private async getCachedQuery<T>(key: string, queryFn: () => Promise<T>, useCache = false): Promise<T> {
        if (useCache) {
            const cached = this.queryCache.get(key)
            if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
                return Promise.resolve(cached.data)
            }
        }

        return queryFn().then((result) => {
            if (useCache) {
                this.queryCache.set(key, { data: result, timestamp: Date.now() })
            }
            return result
        })
    }

    /**
     * 获取滚动视图信息 - 添加错误处理和重试机制
     */
    async getScrollViewInfo(useCache = false) {
        return this.getCachedQuery(
            'scrollViewInfo',
            () =>
                new Promise<{ height: number; scrollHeight: number; scrollTop: number }>((resolve, reject) => {
                    const query = Taro.createSelectorQuery()
                    if (this.context) {
                        query.in(this.context)
                    }

                    let retryCount = 0
                    const maxRetries = 3

                    const executeQuery = () => {
                        query
                            .select(this.selectorUtils.getVlSelector())
                            .fields({ size: true, scrollOffset: true }, (res) => {
                                if (res && (res.height > 0 || retryCount >= maxRetries)) {
                                    resolve({
                                        height: res?.height || 0,
                                        scrollHeight: res?.scrollHeight || 0,
                                        scrollTop: res?.scrollTop || 0
                                    })
                                } else if (retryCount < maxRetries) {
                                    retryCount++
                                    setTimeout(executeQuery, 50 * retryCount)
                                } else {
                                    reject(new Error('Failed to get scroll view info after retries'))
                                }
                            })
                        query.exec()
                    }

                    executeQuery()
                }),
            useCache
        )
    }

    /**
     * 获取滚动视图节点
     */
    async getScrollViewNode() {
        return new Promise<ScrollViewContext>((resolve) => {
            const query = Taro.createSelectorQuery()
            if (this.context) {
                query.in(this.context)
            }

            query.select(this.selectorUtils.getVlSelector()).node((res) => {
                resolve(res?.node as ScrollViewContext)
            })
            query.exec()
        })
    }

    /**
     * 获取头部高度
     */
    async getHeaderHeight() {
        return new Promise<number>((resolve) => {
            const query = Taro.createSelectorQuery()
            if (this.context) {
                query.in(this.context)
            }
            query.select(this.selectorUtils.getHeaderSelector()).fields({ size: true }, (res) => {
                resolve(res?.height || 0)
            })
            query.exec()
        })
    }

    /**
     * 获取页面信息
     */
    async getPageInfo(pageIndex: number) {
        return new Promise<{ height: number; items: { height: number }[] }>((resolve) => {
            const query = Taro.createSelectorQuery()
            if (this.context) {
                query.in(this.context)
            }

            // 获取页面高度
            query.select(this.selectorUtils.getPageSelector(pageIndex)).boundingClientRect()

            // 获取所有子项高度
            query.selectAll(this.selectorUtils.getItemSelector(pageIndex)).boundingClientRect()
            query.exec(([pageRes, itemsRes]) => {
                const items = (Array.isArray(itemsRes) ? itemsRes : [itemsRes])
                    .filter(Boolean)
                    .map((item) => ({ height: item?.height || 0 }))

                resolve({
                    height: pageRes?.height || 0,
                    items
                })
            })
        })
    }

    /**
     * 检查元素是否存在 - 添加超时和缓存
     */
    async checkElementExists(selector: string, useCache = false) {
        return this.getCachedQuery(
            `exists-${selector}`,
            () =>
                new Promise<boolean>((resolve) => {
                    const query = Taro.createSelectorQuery()
                    if (this.context) {
                        query.in(this.context)
                    }

                    // 设置超时，避免长时间等待
                    const timeout = setTimeout(() => {
                        resolve(false)
                    }, 5000)

                    query.select(selector).boundingClientRect()
                    query.exec(([res]) => {
                        clearTimeout(timeout)
                        // 检查元素是否真的存在并且有有效的尺寸
                        resolve(!!(res && (res.width > 0 || res.height > 0)))
                    })
                }),
            useCache
        )
    }

    /**
     * 清理查询缓存
     */
    clearCache() {
        this.queryCache.clear()
    }

    /**
     * 滚动到指定元素（将元素滚动到可视区顶部）
     */
    async scrollToElement(
        selector: string,
        {
            offsetTop = 0,
            ...options
        }: Omit<Parameters<ScrollViewContext['scrollTo']>[0], 'top'> & { offsetTop?: number } = {
            animated: false
        }
    ) {
        return new Promise<boolean>((resolve) => {
            const query = Taro.createSelectorQuery()
            if (this.context) {
                query.in(this.context)
            }

            try {
                // 获取目标元素的位置信息
                query.select(selector).boundingClientRect()

                // 获取滚动容器的位置和滚动信息
                query.select(this.selectorUtils.getVlSelector()).boundingClientRect()
                query.select(this.selectorUtils.getVlSelector()).scrollOffset()
                query.select(this.selectorUtils.getVlSelector()).node()

                query.exec((res) => {
                    const elementRect = res[0]
                    const containerRect = res[1]
                    const scrollOffset = res[2]
                    const scrollViewNode = res[3]?.node as ScrollViewContext

                    if (!elementRect || !containerRect || !scrollOffset || !scrollViewNode) {
                        console.warn('获取元素位置或滚动容器信息失败')
                        resolve(false)
                        return
                    }

                    // 计算目标滚动位置
                    // elementRect.top 是相对于可视区域的位置
                    // 需要加上当前滚动位置，再减去容器顶部位置
                    const targetScrollTop = scrollOffset.scrollTop + elementRect.top - containerRect.top
                    const finalScrollTop = Math.min(Math.max(targetScrollTop - offsetTop, 0), scrollOffset.scrollHeight)

                    if (scrollViewNode.scrollTo) {
                        scrollViewNode.scrollTo({
                            top: finalScrollTop,
                            ...options
                        })

                        resolve(true)
                    } else {
                        resolve(false)
                    }
                })
            } catch {
                resolve(false)
            }
        })
    }
}

/**
 * 执行函数工具
 */
export const execIfFunction = <T extends (...args: any[]) => any>(
    fn: T | undefined,
    ...args: Parameters<T>
): ReturnType<T> | undefined => {
    if (typeof fn === 'function') {
        return fn(...args)
    }
    return undefined
}

/**
 * 防抖函数 - 支持立即执行和取消功能
 */
export const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number, immediate = false) => {
    let timer: NodeJS.Timeout | null = null
    let lastArgs: Parameters<T> | null = null

    const debouncedFn = (...args: Parameters<T>) => {
        lastArgs = args

        if (timer) {
            clearTimeout(timer)
        }

        if (immediate && !timer) {
            fn(...args)
            lastArgs = null
        }

        timer = setTimeout(() => {
            if (!immediate && lastArgs) {
                fn(...lastArgs)
            }
            timer = null
            lastArgs = null
        }, delay)
    }

    debouncedFn.cancel = () => {
        if (timer) {
            clearTimeout(timer)
            timer = null
            lastArgs = null
        }
    }

    debouncedFn.flush = () => {
        if (timer && lastArgs) {
            clearTimeout(timer)
            fn(...lastArgs)
            timer = null
            lastArgs = null
        }
    }

    return Object.assign(debouncedFn, {
        cancel: debouncedFn.cancel,
        flush: debouncedFn.flush
    })
}

/**
 * 延迟执行函数
 */
export const delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
