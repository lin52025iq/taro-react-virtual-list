/**
 * 虚拟列表类型定义文件
 * 增强类型安全性和开发体验
 */

import { ScrollViewProps } from '@tarojs/components'
import React from 'react'

/**
 * 虚拟列表项滚动位置信息
 */
export interface IItemScrollTop {
    /** 当前项的高度 */
    height: number
    /** 当前项的滚动高度 */
    scrollTop: number
    /** 当前项是否已经渲染 */
    rendered: boolean
    /** 当前项所在的页 */
    pageIndex: number
}

/**
 * 子页面信息
 */
export interface ISubPage {
    /** 页面是否已渲染 */
    rendered: boolean
    /** 页高度 */
    height: number
    /** 页面内容数量 */
    length: number
    /** 每条数据的高度 */
    items: number[]
}

/**
 * 分段方式类型
 */
export type SegmentNumType = number | 'smart'

/**
 * 虚拟列表段落内容类型
 */
export type VirtualListSegment<T> = T[] | { height: number }

/**
 * 自定义分页函数类型
 */
export type GetSegmentNumFunction<T> = (list: T[], segmentNum: number) => T[][]

/**
 * 渲染函数类型
 */
export type RenderItemFunction<T> = (item: T, pageIndex: number, index: number) => React.ReactElement

/**
 * 渲染组件函数类型
 */
export type RenderComponentFunction = () => React.ReactElement

/**
 * 滚动事件处理函数类型
 */
export type ScrollEventHandler = (event: any) => void

/**
 * 虚拟列表属性接口
 */
export interface VirtualListProps<T = any> {
    /**
     * 数据列表
     * - 发生变化时通过比较`前后列表的引用`是否相同来判断是否要更新
     */
    list: T[]

    /** 虚拟列表唯一标识 */
    listId?: string

    /**
     * 分段数 - 单页的项数
     * - 分段数为 Math.sqrt(list.length) 时需要渲染的节点相对最少
     * @default smart - Math.sqrt(list.length)
     */
    segmentNum?: SegmentNumType

    /** 自定义分页 */
    getSegmentNum?: GetSegmentNumFunction<T>

    /** 监听屏幕 @default 2 */
    screenNum?: number

    /** 猜测单条列表项的高度, 与实际值越接近滚动定位的效果越好 @default 50 */
    guessItemHeight?: number

    /** ScrollView 属性 */
    scrollViewProps?: Omit<ScrollViewProps, 'enhanced' | 'scrollY' | 'id' | 'style' | 'onScroll'>

    /** 渲染列表项 */
    renderItem: RenderItemFunction<T>

    /** 渲染空状态 */
    renderEmpty?: RenderComponentFunction

    /** 渲染顶部内容 */
    renderTop?: RenderComponentFunction

    /** 渲染底部内容 */
    renderBottom?: RenderComponentFunction

    /** 渲染加载状态 */
    renderLoading?: RenderComponentFunction

    /** 虚拟组件初始化完成 */
    onCompleted?: () => void

    /** 滚动事件 */
    onScroll?: ScrollEventHandler

    /** 调用 scrollTo, scrollIntoView 完成时触发 */
    onScrollToEnd?: () => void
}

/**
 * 虚拟列表引用方法接口
 */
export interface VirtualListRef {
    /** 将指定位置的列表项滚动到视图顶部 */
    scrollTo: (index: number, offsetTop?: number) => Promise<boolean>

    /** 将指定位置的列表项滚动到视图中，如果已在视图里则不会滚动，不在视图里则滚动到顶部 */
    scrollIntoView: (index: number, offsetTop?: number) => Promise<boolean>

    /** 滚动到指定的像素位置 */
    scrollToOffset: (scrollTop: number) => Promise<boolean>

    /** 获取指定项的滚动信息 */
    getItemScrollTop: (index: number) => IItemScrollTop

    /** 更新顶部内容高度 */
    updateHeaderHeight: () => Promise<void>

    /** 更新渲染列表 */
    updateRenderList: (callback?: () => void) => Promise<void>

    /** 获取滚动列表高度信息 */
    getScrollInfo: () => Promise<{ height: number; scrollHeight: number; scrollTop: number }>

    /** 获取指定页的滚动信息 */
    getPageScrollTop: (index: number) => { scrollTop: number; height: number; rendered: boolean; pageIndex: number }
}

/**
 * useVirtualList Hook 选项接口
 */
export interface UseVirtualListOptions<T> {
    list: T[]
    listId: string
    segmentNum: SegmentNumType
    getSegmentNum: GetSegmentNumFunction<T>
    screenNum: number
    guessItemHeight: number
    onScrollToEnd?: () => void
    onScroll?: ScrollEventHandler
}

/**
 * Hook 返回值接口
 */
export interface UseVirtualListReturn<T> {
    renderList: VirtualListSegment<T>[]
    isCompleted: boolean
    handleScroll: ScrollEventHandler
    methods: VirtualListRef
}

/**
 * 滚动信息接口
 */
export interface ScrollInfo {
    height: number
    scrollHeight: number
    scrollTop: number
}

/**
 * 页面信息接口
 */
export interface PageInfo {
    height: number
    items: { height: number }[]
}

/**
 * 查询结果缓存项接口
 */
export interface QueryCacheItem<T = any> {
    data: T
    timestamp: number
}

/**
 * 选择器缓存映射类型
 */
export type SelectorCacheMap = Map<string, string>

/**
 * 查询缓存映射类型
 */
export type QueryCacheMap<T = any> = Map<string, QueryCacheItem<T>>

/**
 * 观察器状态映射类型
 */
export type ObserverMap = Map<number, Taro.IntersectionObserver>

/**
 * 观察器创建状态集合类型
 */
export type ObserverCreatingSet = Set<number>

/**
 * 子页面映射类型
 */
export type SubPageMap = Map<number, ISubPage>

/**
 * 工具函数类型定义
 */

/**
 * 节流函数类型
 */
export type ThrottleFunction<T extends (...args: any[]) => any> = (
    fn: T,
    delay: number,
    mustRunDelay: number
) => (...args: Parameters<T>) => void

/**
 * 防抖函数返回类型
 */
export interface DebounceResult<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void
    cancel: () => void
    flush: () => void
}

/**
 * 防抖函数类型
 */
export type DebounceFunction<T extends (...args: any[]) => any> = (
    fn: T,
    delay: number,
    immediate?: boolean
) => DebounceResult<T>

/**
 * 延迟 Promise 类型
 */
export interface DeferredPromise<T = unknown> {
    promise: Promise<T>
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: any) => void
}
