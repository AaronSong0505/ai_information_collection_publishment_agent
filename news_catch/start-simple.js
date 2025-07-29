// 简单启动脚本
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🚀 启动 News Catch 服务器...')

// 启动服务器
const server = spawn('npx', ['tsx', 'server/app.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
})

server.on('error', (error) => {
  console.error('❌ 启动失败:', error)
})

server.on('close', (code) => {
  console.log(`服务器进程退出，代码: ${code}`)
})

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...')
  server.kill('SIGINT')
  process.exit(0)
})

console.log('✅ 服务器启动中...')
console.log('📍 访问 http://localhost:3000/health 检查状态')
console.log('🛑 按 Ctrl+C 停止服务器')