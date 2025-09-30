# Taro React Virtual List

🚀 一个高性能的 Taro React 虚拟列表组件，专为小程序环境优化，支持大数据量列表的流畅滚动。

## ✨ 特性

-   🎯 **高性能虚拟化** - 只渲染可见区域的列表项，支持万级数据流畅滚动
-   📱 **多端兼容** - 支持微信小程序、支付宝小程序等多个平台
-   🔧 **智能分页** - 自动计算最优分页数量，减少渲染节点
-   🎨 **高度可定制** - 支持自定义渲染函数、样式和交互
-   📊 **精确滚动定位** - 支持滚动到指定索引位置
-   🔍 **交叉观察器** - 使用 IntersectionObserver 实现智能渲染
-   💾 **内存优化** - 自动回收不可见区域的 DOM 节点
-   🛠️ **TypeScript 支持** - 完整的类型定义和智能提示

## 📦 安装

```bash
npm install taro-react-virtual-list
# 或
yarn add taro-react-virtual-list
# 或
pnpm add taro-react-virtual-list
```

## 🚀 快速开始

### 基础用法

```tsx
import { Text, View } from '@tarojs/components'
import { VirtualList } from 'taro-react-virtual-list'

const Index = () => {
    const data = Array.from({ length: 10000 }, (_, index) => ({
        id: index,
        text: `项目 ${index}`,
        content: `这是第${index}个项目的内容`
    }))

    const renderItem = (item, pageIndex, index) => (
        <View style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
            <Text>{item.text}</Text>
            <Text style={{ color: '#666', fontSize: '12px' }}>{item.content}</Text>
        </View>
    )

    return (
        <View style={{ height: '100vh', overflow: 'hidden' }}>
            <VirtualList list={data} renderItem={renderItem} onCompleted={() => console.log('虚拟列表初始化完成')} />
        </View>
    )
}

export default Index
```

### 高级用法

```tsx
import React, { useCallback, useRef, useState } from 'react'
import { VirtualList, VirtualListRef } from 'taro-react-virtual-list'
import { View, Button, Input, Text } from '@tarojs/components'

const Index = () => {
    const listRef = useRef<VirtualListRef>(null)
    const [highlightIndex, setHighlightIndex] = useState(0)

    const data = Array.from({ length: 50000 }, (_, index) => ({
        id: index,
        title: `标题 ${index}`,
        description: `描述信息 ${index}`,
        category: `分类 ${index % 10}`
    }))

    const renderItem = useCallback(
        (item, pageIndex, index) => (
            <View
                style={{
                    padding: '15px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: 'white'
                }}
                onClick={() => setHighlightIndex(item.id)}
            >
                <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>{item.title}</Text>
                <Text style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>{item.description}</Text>
                <Text style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>{item.category}</Text>
            </View>
        ),
        []
    )

    const scrollToItem = () => {
        listRef.current?.scrollTo(highlightIndex)
    }

    return (
        <View style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* 控制面板 */}
            <View style={{ padding: '10px', backgroundColor: '#f5f5f5' }}>
                <View style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Input
                        type="number"
                        value={highlightIndex.toString()}
                        onInput={(e) => setHighlightIndex(parseInt(e.detail.value) || 0)}
                        style={{ width: '100px', border: '1px solid #d9d9d9', padding: '5px' }}
                    />
                    <Button size="mini" type="primary" onClick={scrollToItem}>
                        滚动到指定项
                    </Button>
                </View>
            </View>

            {/* 虚拟列表 */}
            <View style={{ flex: 1, overflow: 'hidden' }}>
                <VirtualList
                    ref={listRef}
                    list={data}
                    renderItem={renderItem}
                    segmentNum="smart" // 智能分页
                    screenNum={2} // 预渲染屏幕数
                    guessItemHeight={80} // 预估项目高度
                    onScroll={(info) => console.log('滚动信息:', info)}
                    renderLoading={() => <View style={{ padding: '20px', textAlign: 'center' }}>正在加载...</View>}
                    renderEmpty={() => <View style={{ padding: '20px', textAlign: 'center' }}>暂无数据</View>}
                />
            </View>
        </View>
    )
}

export default Index
```

## 📚 API 文档

### VirtualList Props

| 属性              | 类型                                                          | 默认值           | 描述                       |
| ----------------- | ------------------------------------------------------------- | ---------------- | -------------------------- |
| `list`            | `T[]`                                                         | -                | **必需** 数据列表          |
| `renderItem`      | `(item: T, pageIndex: number, index: number) => ReactElement` | -                | **必需** 渲染列表项的函数  |
| `listId`          | `string`                                                      | 自动生成         | 虚拟列表唯一标识           |
| `segmentNum`      | `number \| 'smart'`                                           | `'smart'`        | 分段数，'smart' 为智能计算 |
| `getSegmentNum`   | `(list: T[], segmentNum: number) => T[][]`                    | `getSegmentList` | 自定义分页函数             |
| `screenNum`       | `number`                                                      | `2`              | 监听屏幕数，用于预渲染     |
| `guessItemHeight` | `number`                                                      | `50`             | 预估单条列表项高度         |
| `scrollViewProps` | `ScrollViewProps`                                             | `{}`             | ScrollView 组件属性        |
| `renderEmpty`     | `() => ReactElement`                                          | -                | 空状态渲染函数             |
| `renderTop`       | `() => ReactElement`                                          | -                | 顶部内容渲染函数           |
| `renderBottom`    | `() => ReactElement`                                          | -                | 底部内容渲染函数           |
| `renderLoading`   | `() => ReactElement`                                          | -                | 加载状态渲染函数           |
| `onCompleted`     | `() => void`                                                  | -                | 虚拟列表初始化完成回调     |
| `onScroll`        | `(event: any) => void`                                        | -                | 滚动事件回调               |
| `onScrollToEnd`   | `() => void`                                                  | -                | 滚动结束回调               |

### VirtualListRef 方法

| 方法                 | 参数                                  | 返回值                | 描述                 |
| -------------------- | ------------------------------------- | --------------------- | -------------------- |
| `scrollTo`           | `(index: number, offsetTop?: number)` | `Promise<boolean>`    | 滚动到指定索引位置   |
| `scrollToOffset`     | `(scrollTop: number)`                 | `Promise<true>`       | 滚动到指定像素值     |
| `scrollIntoView`     | `(index: number, offsetTop?: number)` | `Promise<boolean>`    | 将指定项滚动到视图中 |
| `getItemScrollTop`   | `(index: number)`                     | `IItemScrollTop`      | 获取指定项的滚动信息 |
| `updateHeaderHeight` | `()`                                  | `Promise<void>`       | 更新头部高度         |
| `updateRenderList`   | `(callback?: () => void)`             | `Promise<void>`       | 更新渲染列表         |
| `getScrollInfo`      | `()`                                  | `Promise<ScrollInfo>` | 获取滚动信息         |
| `getPageScrollTop`   | `(index: number)`                     | `PageScrollInfo`      | 获取指定页的滚动信息 |

### 类型定义

```typescript
interface IItemScrollTop {
    height: number // 当前项的高度
    scrollTop: number // 当前项的滚动高度
    rendered: boolean // 当前项是否已经渲染
    pageIndex: number // 当前项所在的页
}

interface ScrollInfo {
    height: number // 视口高度
    scrollHeight: number // 滚动内容总高度
    scrollTop: number // 当前滚动位置
}
```

## 🎯 使用场景

适用于需要展示大量数据的列表场景，如：

-   商品列表
-   聊天记录
-   搜索结果
-   用户列表
-   消息通知

## ⚡ 性能优化

### 1. 合理设置预估高度

```tsx
// 根据实际项目高度设置，越接近实际值滚动定位越准确
<VirtualList
    list={data}
    renderItem={renderItem}
    guessItemHeight={80} // 根据实际项目高度调整
/>
```

### 2. 使用智能分页

```tsx
// 使用智能分页，组件会自动计算最优分页数量
<VirtualList
    list={data}
    renderItem={renderItem}
    segmentNum="smart" // 推荐使用
/>
```

### 3. 优化渲染函数

```tsx
// 使用 useCallback 缓存渲染函数
const renderItem = useCallback((item, pageIndex, index) => {
    return (
        <View style={styles.item}>
            <Text>{item.title}</Text>
        </View>
    )
}, [])

// 避免在渲染函数中创建新对象
const renderItem = (item, pageIndex, index) => (
    <View style={{ padding: 10 }}>
        {' '}
        {/* ❌ 每次渲染都创建新对象 */}
        <Text>{item.title}</Text>
    </View>
)

const styles = StyleSheet.create({
    item: { padding: 10 } // ✅ 使用样式表
})
```

## 🔧 配置选项

### 分页策略

```tsx
// 固定分页数量
<VirtualList segmentNum={20} />

// 智能分页（推荐）
<VirtualList segmentNum="smart" />

// 自定义分页函数
const customGetSegmentNum = (list, segmentNum) => {
  // 自定义分页逻辑
  return chunk(list, segmentNum)
}

<VirtualList getSegmentNum={customGetSegmentNum} />
```

### 预渲染配置

```tsx
// 预渲染更多屏幕内容，提升滚动体验但会增加内存使用
<VirtualList screenNum={3} />

// 减少预渲染，节省内存但可能影响滚动流畅度
<VirtualList screenNum={1} />
```

## 🐛 常见问题

### Q: 滚动定位不准确怎么办？

A: 调整 `guessItemHeight` 参数，使其尽可能接近实际项目高度。

### Q: 列表项高度不一致怎么处理？

A: 组件会自动测量实际高度，但建议设置一个合理的 `guessItemHeight` 作为初始值。

### Q: 如何实现下拉刷新？

A: 可以在 `renderTop` 中渲染下拉刷新组件，或使用 Taro 的 `PullToRefresh` 组件包裹虚拟列表。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。

## 📄 许可证

MIT License

## 🔗 相关链接

-   [Taro 官方文档](https://taro-docs.jd.com/)
-   [React 官方文档](https://reactjs.org/)
-   [小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/)

---

如果这个项目对你有帮助，请给个 ⭐️ 支持一下！
