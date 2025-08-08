#!/bin/bash

echo "🚀 安装 News Catch 系统..."
echo

echo "[1/3] 安装项目依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "[2/3] 设置 Obsidian Web Clipper..."
npm run setup
if [ $? -ne 0 ]; then
    echo "❌ Obsidian Web Clipper 设置失败"
    exit 1
fi

echo "[3/3] 构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 项目构建失败"
    exit 1
fi

echo
echo "✅ 安装完成！"
echo
echo "现在你可以运行："
echo "  npm run demo    - 运行演示"
echo "  npm run dev     - 启动开发模式"
echo "  npm start       - 启动生产模式"
echo