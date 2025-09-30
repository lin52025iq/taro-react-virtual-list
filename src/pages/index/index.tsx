import { useRef, useState, useCallback, useEffect } from 'react'
import { View, Button, Input } from '@tarojs/components'

import { VirtualList, VirtualListRef } from '@/components'

const Index: React.FC = () => {
    const listRef = useRef<VirtualListRef>(null)
    const [isCompleted, setIsCompleted] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState<number>(0)
    // 高亮项位置状态
    const [highlightPosition, setHighlightPosition] = useState<'above' | 'visible' | 'below' | 'unknown'>('unknown')
    const [scrollInfo, setScrollInfo] = useState<{
        height: number
        scrollHeight: number
        scrollTop: number
    } | null>(null)
    // 滚动位置输入
    const [scrollPosition, setScrollPosition] = useState<string>('0')
    const [isRenderCompleted, setIsRenderCompleted] = useState(false)

    const dataVersion = useRef(0)

    const [data, setData] = useState<{ id: number; text: string; content: string }[]>(
        Array.from({ length: 10000 }, (_, index) => ({
            id: index,
            text: `项目 ${index} version:${dataVersion.current}`,
            content: `这是第${index}个项目的内容`.repeat(Math.floor(index / 100) + 1)
        }))
    )

    const updateData = useCallback(() => {
        setIsCompleted(false)
        setIsRenderCompleted(false)
        setData((prev) => {
            const newList = prev.map((item) => ({
                ...item,
                text: `项目 ${item.id} version:${dataVersion.current}`
            }))
            return newList
        })
        dataVersion.current += 1
    }, [])

    // 检查高亮项位置的函数
    const checkHighlightPosition = useCallback(async () => {
        if (!isCompleted || !listRef.current) return

        try {
            // 获取当前滚动信息
            const currentScrollInfo = await listRef.current.getScrollInfo()
            setScrollInfo(currentScrollInfo)

            // 获取高亮项的滚动位置信息
            const itemScrollInfo = listRef.current.getItemScrollTop(highlightIndex)

            if (itemScrollInfo.rendered) {
                const itemTop = itemScrollInfo.scrollTop
                const itemBottom = itemTop + itemScrollInfo.height
                const viewportTop = currentScrollInfo.scrollTop
                const viewportBottom = viewportTop + currentScrollInfo.height

                if (itemBottom < viewportTop) {
                    setHighlightPosition('above')
                } else if (itemTop > viewportBottom) {
                    setHighlightPosition('below')
                } else {
                    setHighlightPosition('visible')
                }
            } else {
                // 未渲染项：根据页面位置和当前视口位置进行估算
                const pageIndex = itemScrollInfo.pageIndex
                const pageScrollInfo = listRef.current.getPageScrollTop(pageIndex)
                const estimatedItemTop = pageScrollInfo.scrollTop
                const estimatedItemBottom = estimatedItemTop + pageScrollInfo.height
                const viewportTop = currentScrollInfo.scrollTop
                const viewportBottom = viewportTop + currentScrollInfo.height
                if (estimatedItemBottom < viewportTop) {
                    setHighlightPosition('above')
                } else if (estimatedItemTop > viewportBottom) {
                    setHighlightPosition('below')
                } else {
                    setHighlightPosition('visible')
                }
            }
        } catch (error) {
            console.error('检查高亮项位置时出错:', error)
            setHighlightPosition('unknown')
        }
    }, [isCompleted, highlightIndex])

    // 监听滚动事件，实时更新位置信息
    const handleScroll = useCallback(async () => {
        // 延迟检查位置，避免频繁更新
        setTimeout(() => {
            checkHighlightPosition()
        }, 100)
    }, [checkHighlightPosition])

    // 当高亮索引变化时检查位置
    useEffect(() => {
        if (isCompleted) {
            checkHighlightPosition()
        }
    }, [highlightIndex, isCompleted, checkHighlightPosition])

    // 获取位置描述文本
    const getPositionText = useCallback(() => {
        switch (highlightPosition) {
            case 'above':
                return '上方（不可见）'
            case 'below':
                return '下方（不可见）'
            case 'visible':
                return '可见区域'
            case 'unknown':
                return '未知位置'
            default:
                return '未知位置'
        }
    }, [highlightPosition])

    // 获取位置颜色
    const getPositionColor = useCallback(() => {
        switch (highlightPosition) {
            case 'above':
                return '#ff9500'
            case 'below':
                return '#ff3b30'
            case 'visible':
                return '#34c759'
            case 'unknown':
                return '#8e8e93'
            default:
                return '#8e8e93'
        }
    }, [highlightPosition])

    const renderItem = useCallback((item: (typeof data)[0], pageIndex: number, index: number) => {
        return (
            <View
                key={`${pageIndex}-${index}`}
                style={{
                    padding: '10px',
                    borderBottom: '1px solid #eee',
                    color: `var(--high-color-${item.id}, #666)`,
                    fontSize: '14px',
                    backgroundColor: `var(--high-bg-${item.id}, transparent)`,
                    transition: 'all 0.3s ease'
                }}
                onClick={() => {
                    setHighlightIndex(item.id)
                }}
            >
                {item.text} (页面: {pageIndex}, 索引: {index}) {item.content}
            </View>
        )
    }, [])

    const handleCompleted = useCallback(async () => {
        if (!isRenderCompleted && isCompleted) {
            await listRef.current!.scrollToOffset(scrollInfo?.scrollTop || 0)
            setIsRenderCompleted(true)
        }
        setIsCompleted(true)
    }, [scrollInfo, isRenderCompleted, isCompleted])

    // 处理输入框变化
    const handleHighlightIndexChange = useCallback(
        (e: any) => {
            const value = parseInt(e.detail.value) || 0
            // 限制范围在有效数据范围内
            if (value >= 0 && value < data.length) {
                setHighlightIndex(value)
            }
        },
        [data.length]
    )

    // 滚动到高亮项
    const scrollToHighlightItem = useCallback(() => {
        if (isCompleted && highlightIndex >= 0) {
            listRef.current?.scrollTo(highlightIndex)
        }
    }, [isCompleted, highlightIndex])

    // 滚动到指定像素位置
    const scrollToOffset = useCallback(async () => {
        if (listRef.current && isCompleted) {
            const position = parseInt(scrollPosition, 10)
            if (!Number.isNaN(position)) {
                await listRef.current.scrollToOffset(position)
            }
        }
    }, [scrollPosition, isCompleted])

    // 处理滚动位置输入变化
    const handleScrollPositionChange = useCallback((e: any) => {
        setScrollPosition(e.detail.value)
    }, [])

    // 手动刷新位置信息
    const refreshPosition = useCallback(() => {
        checkHighlightPosition()
    }, [checkHighlightPosition])

    return (
        <View style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <View style={{ padding: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* 高亮索引输入控制区域 */}
                <View style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '15px' }}>
                    <View style={{ fontSize: '14px', color: '#333', whiteSpace: 'nowrap' }}>高亮项索引:</View>
                    <Input
                        type="number"
                        value={highlightIndex.toString()}
                        placeholder="输入索引"
                        onInput={handleHighlightIndexChange}
                        style={{
                            width: '80px',
                            height: '32px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            padding: '0 8px',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}
                    />
                    <Button
                        size="mini"
                        type="primary"
                        onClick={scrollToHighlightItem}
                        disabled={!isCompleted}
                        style={{ margin: 0, fontSize: '12px' }}
                    >
                        定位
                    </Button>
                    <Button
                        size="mini"
                        type="primary"
                        onClick={updateData}
                        disabled={!isCompleted}
                        style={{ margin: 0, fontSize: '12px' }}
                    >
                        更新数据
                    </Button>
                </View>

                {/* 滚动位置输入控制区域 */}
                <View style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '15px' }}>
                    <View style={{ fontSize: '14px', color: '#333', whiteSpace: 'nowrap' }}>滚动位置(px):</View>
                    <Input
                        type="number"
                        value={scrollPosition}
                        placeholder="输入像素值"
                        onInput={handleScrollPositionChange}
                        style={{
                            width: '80px',
                            height: '32px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            padding: '0 8px',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}
                    />
                    <Button
                        size="mini"
                        type="primary"
                        onClick={scrollToOffset}
                        disabled={!isCompleted}
                        style={{ margin: 0, fontSize: '12px' }}
                    >
                        滚动位置
                    </Button>
                    {scrollInfo && (
                        <View style={{ fontSize: '12px', color: '#999' }}>
                            (0-{scrollInfo.scrollHeight - scrollInfo.height}px)
                        </View>
                    )}
                </View>

                {/* 高亮项位置显示区域 */}
                <View
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '6px',
                        border: '1px solid #e0e0e0'
                    }}
                >
                    <View style={{ fontSize: '12px', color: '#666' }}>位置:</View>
                    <View
                        style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: getPositionColor(),
                            padding: '4px 8px',
                            backgroundColor: 'white',
                            borderRadius: '4px',
                            border: `1px solid ${getPositionColor()}20`
                        }}
                    >
                        {getPositionText()}
                    </View>
                    <Button
                        size="mini"
                        onClick={refreshPosition}
                        disabled={!isCompleted}
                        style={{ margin: 0, fontSize: '10px', padding: '0 6px' }}
                    >
                        刷新
                    </Button>
                </View>

                <View style={{ fontSize: '12px', color: isCompleted ? 'green' : 'orange' }}>
                    状态: {isCompleted ? '已完成' : '加载中...'}
                </View>
            </View>

            {/* 滚动信息显示区域 */}
            {scrollInfo && (
                <View
                    style={{
                        padding: '8px 10px',
                        backgroundColor: '#f8f9fa',
                        borderBottom: '1px solid #e9ecef',
                        fontSize: '12px',
                        color: '#6c757d',
                        display: 'flex',
                        gap: '15px',
                        flexWrap: 'wrap'
                    }}
                >
                    <View>视口高度: {scrollInfo.height}px</View>
                    <View>滚动高度: {scrollInfo.scrollHeight}px</View>
                    <View>当前滚动: {scrollInfo.scrollTop.toFixed(0)}px</View>
                    <View>高亮项索引: {highlightIndex}</View>
                </View>
            )}

            <View
                style={{
                    flex: '1 1 auto',
                    overflow: 'hidden',
                    [`--high-color-${highlightIndex}`]: '#fff',
                    [`--high-bg-${highlightIndex}`]: '#1890ff'
                }}
            >
                <VirtualList
                    ref={listRef}
                    list={data}
                    renderItem={renderItem}
                    onCompleted={handleCompleted}
                    onScroll={handleScroll}
                    renderLoading={() => (
                        <View
                            style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#666',
                                backgroundColor: '#fffa',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            正在初始化虚拟列表...
                        </View>
                    )}
                    renderEmpty={() => (
                        <View
                            style={{
                                color: '#999',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            暂无数据
                        </View>
                    )}
                />
            </View>
        </View>
    )
}

export default Index
