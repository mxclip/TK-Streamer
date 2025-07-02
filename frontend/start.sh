#!/bin/bash
echo "🌐 启动TikTok Streamer Frontend..."
cd /Users/wenxindou/Desktop/MX/TK\ Streamer/frontend

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 清理缓存
echo "🧹 清理缓存..."
rm -rf node_modules/.cache

# 启动开发服务器
echo "🚀 启动开发服务器..."
npm start
