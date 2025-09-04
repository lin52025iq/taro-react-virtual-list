# 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且此项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2025-09-04

### 新增

-   🎉 首次发布 taro-react-virtual-list 组件
-   ✨ 支持高性能虚拟化列表渲染
-   🚀 智能分页算法，自动计算最优分页数量
-   📱 支持微信小程序、支付宝小程序等多端平台
-   🎯 精确滚动定位功能
-   🔍 基于 IntersectionObserver 的智能渲染
-   💾 自动内存回收，优化性能
-   🛠️ 完整的 TypeScript 类型支持
-   📊 丰富的 API 和配置选项

### 功能特性

-   **虚拟化渲染**: 只渲染可见区域的列表项，支持万级数据流畅滚动
-   **智能分页**: 自动计算最优分页数量，减少渲染节点
-   **精确滚动**: 支持滚动到指定索引位置
-   **交叉观察器**: 使用 IntersectionObserver 实现智能渲染
-   **内存优化**: 自动回收不可见区域的 DOM 节点
-   **高度可定制**: 支持自定义渲染函数、样式和交互

### API 方法

-   `scrollTo(index, offsetTop?)` - 滚动到指定索引位置
-   `scrollIntoView(index, offsetTop?)` - 将指定项滚动到视图中
-   `getItemScrollTop(index)` - 获取指定项的滚动信息
-   `updateHeaderHeight()` - 更新头部高度
-   `updateRenderList(callback?)` - 更新渲染列表
-   `getScrollInfo()` - 获取滚动信息
-   `getPageScrollTop(index)` - 获取指定页的滚动信息

### 配置选项

-   `segmentNum` - 分段数配置（支持 'smart' 智能模式）
-   `screenNum` - 预渲染屏幕数配置
-   `guessItemHeight` - 预估项目高度
-   `renderItem` - 自定义渲染函数
-   `renderEmpty` - 空状态渲染
-   `renderLoading` - 加载状态渲染
-   `renderTop/renderBottom` - 顶部/底部内容渲染

### 技术实现

-   基于 React Hooks 的现代化实现
-   使用 TypeScript 提供完整类型支持
-   优化的选择器查询和缓存机制
-   防抖和节流优化滚动性能
-   错误处理和重试机制
-   专注于小程序平台，移除 H5 支持以减小包体积

### 文档

-   📖 完整的 README 文档
-   💡 丰富的使用示例
-   🔧 详细的 API 文档
-   🎯 性能优化指南
-   ❓ 常见问题解答

---

## 版本说明

### 版本号规则

-   **主版本号**: 不兼容的 API 修改
-   **次版本号**: 向下兼容的功能性新增
-   **修订号**: 向下兼容的问题修正

### 支持

-   支持 Taro 4.x 版本
-   支持 React 18.x 版本
-   支持微信小程序、支付宝小程序、H5 等平台
