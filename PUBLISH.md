# 发布指南

## 📦 发布配置

项目使用动态生成发布配置的方式：

-   `package.json` - 开发环境配置，包含所有开发依赖
-   发布时动态生成精简的发布配置，不包含开发依赖

## 🚀 发布步骤

### 1. 测试发布配置

```bash
# 测试发布配置（不会实际发布）
npm run test:publish
```

### 2. 正式发布

```bash
# 使用发布脚本（推荐）
npm run publish:lib
```

## 📋 发布检查清单

-   [ ] 更新 `package.json` 中的版本号
-   [ ] 更新 `CHANGELOG.md`
-   [ ] 运行 `npm run test:publish` 检查发布配置
-   [ ] 确保构建成功
-   [ ] 检查发布包内容
-   [ ] 发布到 npm

## 🔧 发布配置说明

### 动态生成的发布配置特点

-   **最小依赖**：`dependencies` 为空对象
-   **peerDependencies**：用户需要自己安装的依赖
-   **精简配置**：只包含必要的发布信息
-   **小包体积**：约 31.8 kB

### 用户安装方式

```bash
# 安装组件
npm install taro-react-virtual-list

# 安装 peer dependencies
npm install @tarojs/components @tarojs/taro react react-dom
```

## 🎯 版本管理

```bash
# 更新版本号（在 package.json 中）
# 1.0.0 -> 1.0.1 (patch)
# 1.0.0 -> 1.1.0 (minor)
# 1.0.0 -> 2.0.0 (major)

# 发布新版本
npm run publish:lib
```

## ⚠️ 注意事项

1. **发布时自动生成配置**：发布脚本会自动生成精简的发布配置
2. **版本号管理**：只需要在 `package.json` 中更新版本号
3. **测试发布**：发布前务必运行 `npm run test:publish`
4. **备份重要**：发布脚本会自动备份和恢复 package.json

## 🐛 故障排除

### 发布失败

```bash
# 恢复原始配置
git checkout package.json

# 重新尝试
npm run publish:lib
```

### 版本冲突

```bash
# 检查当前版本
npm view taro-react-virtual-list version

# 更新版本号后重新发布
```
