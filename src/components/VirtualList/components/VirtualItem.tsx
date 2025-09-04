import React, { memo, useMemo } from 'react'
import { View, ViewProps } from '@tarojs/components'

interface VirtualItemProps<T = any> extends ViewProps {
    /** 项目数据 */
    item: T
    /** 页面索引 */
    pageIndex: number
    /** 项目索引 */
    index: number
    /** 渲染函数 */
    renderItem: (item: T, pageIndex: number, index: number) => React.ReactElement
}

/**
 * 🚀 优化的虚拟列表项组件
 * 使用memo和useMemo进一步优化渲染性能
 */
export const VirtualItem = memo<VirtualItemProps>(
    ({ item, pageIndex, index, renderItem, className, style, ...restProps }) => {
        // 🚀 优化：缓存类名和ID，避免重复计算
        const { itemClassName, itemId } = useMemo(
            () => ({
                itemClassName: `vl-item ${className || ''}`.trim(),
                itemId: `vl-item-${pageIndex}-${index}`
            }),
            [className, pageIndex, index]
        )

        // 🚀 优化：缓存渲染内容，避免函数重复调用
        const renderedContent = useMemo(() => {
            try {
                return renderItem(item, pageIndex, index)
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(`虚拟列表项渲染错误 (page: ${pageIndex}, index: ${index}):`, error)
                }
                return <View>渲染错误</View>
            }
        }, [item, pageIndex, index, renderItem])

        // 🚀 优化：合并样式，避免对象重新创建
        const mergedStyle = useMemo(() => {
            return style || undefined
        }, [style])

        return (
            <View className={itemClassName} id={itemId} style={mergedStyle} {...restProps}>
                {renderedContent}
            </View>
        )
    },
    (prevProps, nextProps) => {
        // 首先比较最可能改变的属性
        if (prevProps.item !== nextProps.item) return false
        if (prevProps.pageIndex !== nextProps.pageIndex) return false
        if (prevProps.index !== nextProps.index) return false

        // 然后比较样式和类名
        if (prevProps.style !== nextProps.style) return false
        if (prevProps.className !== nextProps.className) return false

        // 在大多数情况下，renderItem应该是稳定的引用
        if (prevProps.renderItem !== nextProps.renderItem) return false

        // 比较其他props（排除已经比较过的）
        const {
            item: prevItem,
            pageIndex: prevPageIndex,
            index: prevIndex,
            style: prevStyle,
            className: prevClassName,
            renderItem: prevRenderItem,
            ...prevRest
        } = prevProps
        const {
            item: nextItem,
            pageIndex: nextPageIndex,
            index: nextIndex,
            style: nextStyle,
            className: nextClassName,
            renderItem: nextRenderItem,
            ...nextRest
        } = nextProps

        // 简单的浅比较其他props
        const prevKeys = Object.keys(prevRest)
        const nextKeys = Object.keys(nextRest)

        if (prevKeys.length !== nextKeys.length) return false

        for (const key of prevKeys) {
            if (!(key in nextRest) || prevRest[key] !== nextRest[key]) {
                return false
            }
        }

        return true
    }
)

VirtualItem.displayName = 'VirtualItem'
