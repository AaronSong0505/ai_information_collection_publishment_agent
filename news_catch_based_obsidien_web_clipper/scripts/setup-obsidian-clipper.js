#!/usr/bin/env node

// 设置 Obsidian Web Clipper 依赖的脚本
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🔧 设置 Obsidian Web Clipper 依赖...')

const obsidianClipperPath = path.join(__dirname, '../obsidian-clipper')

// 检查 obsidian-clipper 目录是否存在
if (!fs.existsSync(obsidianClipperPath)) {
  console.log('📥 克隆 Obsidian Web Clipper...')
  execSync('git clone https://github.com/obsidianmd/obsidian-clipper.git', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  })
}

// 进入 obsidian-clipper 目录并安装依赖
console.log('📦 安装 Obsidian Web Clipper 依赖...')
try {
  execSync('npm install', {
    cwd: obsidianClipperPath,
    stdio: 'inherit'
  })
  console.log('✅ Obsidian Web Clipper 依赖安装完成')
} catch (error) {
  console.error('❌ 安装依赖失败:', error.message)
  process.exit(1)
}

// 创建符号链接或复制必要的文件
console.log('🔗 设置模块链接...')

const srcPath = path.join(obsidianClipperPath, 'src')
const linkPath = path.join(__dirname, '../src/obsidian-clipper-src')

// 如果链接已存在，先删除
if (fs.existsSync(linkPath)) {
  fs.rmSync(linkPath, { recursive: true, force: true })
}

// 创建符号链接（Windows 上可能需要管理员权限）
try {
  fs.symlinkSync(srcPath, linkPath, 'dir')
  console.log('✅ 符号链接创建成功')
} catch (error) {
  console.log('⚠️ 符号链接创建失败，尝试复制文件...')
  
  // 如果符号链接失败，复制文件
  const copyRecursive = (src, dest) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    
    const items = fs.readdirSync(src)
    
    for (const item of items) {
      const srcPath = path.join(src, item)
      const destPath = path.join(dest, item)
      
      if (fs.statSync(srcPath).isDirectory()) {
        copyRecursive(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
  
  copyRecursive(srcPath, linkPath)
  console.log('✅ 文件复制完成')
}

console.log('🎉 Obsidian Web Clipper 设置完成！')
console.log('')
console.log('现在你可以：')
console.log('1. npm run build - 构建项目')
console.log('2. npm run demo - 运行演示')
console.log('3. npm run dev - 开发模式启动')