import React, { forwardRef, useImperativeHandle, useCallback, useMemo, useEffect } from 'react'
import { ScrollView, View } from '@tarojs/components'
import { getSegmentList } from './utils/virtualList'
import { useVirtualList } from './hooks/useVirtualList'
import { VirtualItem } from './components/VirtualItem'

import type { VirtualListProps, VirtualListRef, IItemScrollTop } from './types'

// 重新导出类型，保持向后兼容性
export type { VirtualListProps, VirtualListRef, IItemScrollTop }
// 生成默认ID的函数
const generateListId = () => `vl-${Math.random().toString(36).slice(2)}-${Date.now()}`

const VirtualListInner = forwardRef<VirtualListRef, VirtualListProps>(
    <T,>(
        {
            list,
            listId,
            segmentNum = 'smart',
            getSegmentNum = getSegmentList,
            screenNum = 2,
            guessItemHeight = 50,
            scrollViewProps = {},
            renderItem,
            renderEmpty,
            renderTop,
            renderBottom,
            renderLoading,
            onCompleted,
            onScroll,
            onScrollToEnd
        }: VirtualListProps<T>,
        ref
    ) => {
        // 🔧 确保listId在组件生命周期内保持稳定
        const stableListId = useMemo(() => {
            if (listId) {
                return listId
            }
            return generateListId()
        }, [listId])

        // 使用自定义Hook管理虚拟列表逻辑
        const { renderList, isCompleted, handleScroll, methods } = useVirtualList({
            list,
            listId: stableListId,
            segmentNum,
            getSegmentNum,
            screenNum,
            guessItemHeight,
            onScrollToEnd,
            onScroll
        })

        // 暴露ref方法
        useImperativeHandle(
            ref,
            () => ({
                ...methods
            }),
            [methods]
        )

        // 当组件初始化完成时触发回调
        useEffect(() => {
            if (isCompleted && onCompleted) {
                onCompleted()
            }
        }, [isCompleted, onCompleted])

        // 滚动处理函数，使用useCallback避免重复创建
        const onScrollHandler = useCallback(
            (event: any) => {
                handleScroll(event)
            },
            [handleScroll]
        )

        // 🚀 优化：渲染内容 - 使用更精细的 useMemo 和组件拆分
        const containerStyle = useMemo(
            () => ({
                height: '100%',
                width: '100%',
                position: 'relative' as const,
                overflow: 'hidden' as const
            }),
            []
        )

        const scrollViewStyle = useMemo(
            () => ({
                height: '100%'
            }),
            []
        )

        const contentAreaStyle = useMemo(
            () => ({
                width: '100%',
                height: '100%'
            }),
            []
        )

        const loadingOverlayStyle = useMemo(
            () => ({
                position: 'absolute' as const,
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                height: '100%',
                width: '100%',
                display: 'flex',
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
                zIndex: 999
            }),
            []
        )

        // 🚀 优化：分离渲染逻辑，减少大型 useMemo 的复杂度
        const renderPageContent = useCallback(
            (page: T[] | { height: number }, pageIndex: number) => (
                <View key={pageIndex} className={`vl-page-${pageIndex}`}>
                    {'height' in page ? (
                        // 占位符
                        <View style={{ height: `${page.height}px` }} />
                    ) : (
                        // 实际内容 - 使用Fragment减少DOM嵌套
                        <>
                            {page.map((item, index) => (
                                <VirtualItem
                                    key={`${pageIndex}-${index}`} // 🚀 优化：更好的key生成
                                    item={item}
                                    pageIndex={pageIndex}
                                    index={index}
                                    renderItem={renderItem}
                                />
                            ))}
                        </>
                    )}
                </View>
            ),
            [renderItem]
        )

        const renderMainContent = useMemo(
            () => (
                <View style={contentAreaStyle}>
                    {renderList.length > 0 ? renderList.map(renderPageContent) : renderEmpty?.()}
                </View>
            ),
            [contentAreaStyle, renderList, renderPageContent, renderEmpty]
        )

        const renderTopContent = useMemo(
            () => (renderTop ? <View className="header-content">{renderTop()}</View> : null),
            [renderTop]
        )

        const renderBottomContent = useMemo(
            () => (renderBottom ? <View className="bottom-content">{renderBottom()}</View> : null),
            [renderBottom]
        )

        const renderLoadingOverlay = useMemo(
            () => (!isCompleted ? <View style={loadingOverlayStyle}>{renderLoading?.()}</View> : null),
            [isCompleted, loadingOverlayStyle, renderLoading]
        )

        const renderContent = useMemo(
            () => (
                <View style={containerStyle}>
                    <ScrollView
                        {...scrollViewProps}
                        scrollY
                        id={stableListId}
                        enhanced
                        enableFlex
                        style={scrollViewStyle}
                        onScroll={onScrollHandler}
                    >
                        {renderTopContent}
                        {renderMainContent}
                        {renderBottomContent}
                    </ScrollView>
                    {renderLoadingOverlay}
                </View>
            ),
            [
                containerStyle,
                scrollViewProps,
                stableListId,
                scrollViewStyle,
                onScrollHandler,
                renderTopContent,
                renderMainContent,
                renderBottomContent,
                renderLoadingOverlay
            ]
        )

        return renderContent
    }
)

// 使用React.memo优化组件，避免不必要的重新渲染
export const VirtualList = React.memo(VirtualListInner, (prevProps, nextProps) => {
    // 自定义比较函数，避免不必要的重新渲染
    const isEqual =
        prevProps.list === nextProps.list &&
        prevProps.listId === nextProps.listId &&
        prevProps.segmentNum === nextProps.segmentNum &&
        prevProps.screenNum === nextProps.screenNum &&
        prevProps.guessItemHeight === nextProps.guessItemHeight &&
        prevProps.renderItem === nextProps.renderItem &&
        prevProps.onCompleted === nextProps.onCompleted &&
        prevProps.onScrollToEnd === nextProps.onScrollToEnd &&
        prevProps.onScroll === nextProps.onScroll

    return isEqual
})

// 设置显示名称便于调试
VirtualList.displayName = 'VirtualList'

// 默认导出主组件
export default VirtualList
