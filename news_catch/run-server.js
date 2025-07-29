// 完整的服务器启动脚本
import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

console.log('🚀 启动 News Catch 服务器...')

const server = spawn('npx', ['tsx', 'server/app.ts'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3000'
  }
})

// 等待启动
await setTimeout(3000)

console.log('\n✅ 服务器应该已经启动')
console.log('📍 健康检查: http://localhost:3000/health')
console.log('📍 API 文档: http://localhost:3000/api/sources')
console.log('🛑 按 Ctrl+C 停止服务器')

// 保持进程运行
server.on('close', (code) => {
  console.log(`\n服务器已停止 (退出代码: ${code})`)
  process.exit(code)
})

process.on('SIGINT', () => {
  console.log('\n🛑 正在停止服务器...')
  server.kill('SIGINT')
})