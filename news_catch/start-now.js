// 立即启动服务器
import { spawn } from 'child_process'

console.log('🚀 启动 News Catch 服务器...')
console.log('📍 服务器将在 http://localhost:3000 启动')
console.log('🛑 按 Ctrl+C 停止服务器\n')

const server = spawn('npx', ['tsx', 'server/simple-server.ts'], {
  stdio: 'inherit',
  shell: true
})

server.on('error', (error) => {
  console.error('❌ 启动失败:', error)
})

server.on('close', (code) => {
  console.log(`\n服务器已停止 (代码: ${code})`)
})

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...')
  server.kill('SIGINT')
})