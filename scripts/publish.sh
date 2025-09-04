#!/bin/bash

# 发布脚本 - 动态生成发布配置
set -e

# 错误处理函数
cleanup() {
    if [ -f "package.json.backup" ]; then
        echo "🔄 清理：恢复原始 package.json..."
        mv package.json.backup package.json
    fi
}

# 设置退出时清理
trap cleanup EXIT

echo "🚀 开始发布 taro-react-virtual-list..."

# 1. 构建库文件
echo "📦 构建库文件..."
npm run build:lib

# 2. 备份原始 package.json
echo "💾 备份原始 package.json..."
cp package.json package.json.backup

# 3. 动态生成发布配置
echo "🔄 生成发布配置..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// 创建发布配置
const publishPkg = {
  name: pkg.name,
  version: pkg.version,
  private: false,
  description: pkg.description,
  keywords: pkg.keywords,
  homepage: pkg.homepage,
  repository: pkg.repository,
  bugs: pkg.bugs,
  license: pkg.license,
  author: pkg.author,
  main: 'lib/components/index.js',
  types: 'lib/components/index.d.ts',
  files: ['lib', 'README.md', 'LICENSE'],
  engines: {
    'node': '>=14.0.0',
    'npm': '>=6.0.0'
  },
  peerDependencies: {
    '@tarojs/components': '^4.0.0',
    '@tarojs/taro': '^4.0.0',
    'react': '^18.0.0',
    'react-dom': '^18.0.0'
  },
  dependencies: {}
};

fs.writeFileSync('package.json', JSON.stringify(publishPkg, null, 4));
console.log('✅ 发布配置生成完成');
"

# 4. 发布到 npm 或测试
if [ "$1" = "--dry-run" ]; then
    echo "🧪 测试发布配置..."
    npm pack --dry-run
    echo "✅ 测试完成！"
else
    echo "📤 发布到 npm..."
    npm publish
    echo "✅ 发布完成！"
    
    echo "📦 包名: taro-react-virtual-list"
    echo "📋 版本: $(node -p "require('./package.json').version")"
fi

# 5. 恢复原始 package.json（由 trap 自动处理）
echo "🔄 恢复原始 package.json..."
mv package.json.backup package.json
