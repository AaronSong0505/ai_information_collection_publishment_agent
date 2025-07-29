// 系统测试脚本
import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

console.log('🧪 测试 News Catch 系统...')

// 启动服务器
console.log('1️⃣ 启动服务器...')
const server = spawn('npx', ['tsx', 'server/app.ts'], {
  stdio: 'pipe',
  shell: true
})

let serverOutput = ''
server.stdout.on('data', (data) => {
  serverOutput += data.toString()
  console.log('📝', data.toString().trim())
})

server.stderr.on('data', (data) => {
  console.log('⚠️', data.toString().trim())
})

// 等待服务器启动
await setTimeout(5000)

// 测试健康检查
console.log('\n2️⃣ 测试健康检查...')
try {
  const response = await fetch('http://localhost:3000/health')
  if (response.ok) {
    const data = await response.json()
    console.log('✅ 健康检查通过:', data)
  } else {
    console.log('❌ 健康检查失败:', response.status)
  }
} catch (error) {
  console.log('❌ 无法连接到服务器:', error.message)
}

// 测试 API
console.log('\n3️⃣ 测试 API...')
try {
  const response = await fetch('http://localhost:3000/api/sources')
  if (response.ok) {
    const data = await response.json()
    console.log('✅ API 测试通过，新闻源数量:', data.data?.length || 0)
  } else {
    console.log('❌ API 测试失败:', response.status)
  }
} catch (error) {
  console.log('❌ API 请求失败:', error.message)
}

// 关闭服务器
console.log('\n4️⃣ 关闭服务器...')
server.kill('SIGINT')

console.log('\n🎉 测试完成！')
process.exit(0)