// 改进的服务器启动脚本
import { spawn } from 'child_process'

console.log('🚀 启动 News Catch 服务器...')

const server = spawn('npx', ['tsx', 'server/simple-app.ts'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3000'
  }
})

server.on('error', (error) => {
  console.error('❌ 服务器启动失败:', error)
  process.exit(1)
})

server.on('close', (code) => {
  if (code !== 0) {
    console.log(`❌ 服务器异常退出，代码: ${code}`)
  } else {
    console.log('✅ 服务器正常关闭')
  }
  process.exit(code)
})

// 优雅关闭处理
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...')
  server.kill('SIGINT')
})

process.on('SIGTERM', () => {
  console.log('\n🛑 收到终止信号，关闭服务器...')
  server.kill('SIGTERM')
})

console.log('✅ 服务器启动中，请稍候...')
console.log('📍 启动完成后访问: http://localhost:3000/health')
console.log('🛑 按 Ctrl+C 停止服务器')