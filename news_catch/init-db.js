// 数据库初始化脚本
import { spawn } from 'child_process'

console.log('🗄️ 初始化数据库和默认新闻源...')

const initScript = `
import { initDatabase } from './server/database/index.js'
import { SourceStorage } from './server/database/sources.js'
import useDatabase from './server/database/index.js'

const defaultSources = [
  {
    name: 'BBC News RSS',
    url: 'http://feeds.bbci.co.uk/news/rss.xml',
    type: 'rss',
    config: {},
    enabled: true,
    interval: 300,
  },
  {
    name: 'TechCrunch RSS',
    url: 'https://techcrunch.com/feed/',
    type: 'rss',
    config: {},
    enabled: true,
    interval: 600,
  },
]

async function init() {
  try {
    console.log('🚀 初始化数据库...')
    await initDatabase()
    console.log('✅ 数据库初始化完成')
    
    const db = useDatabase()
    const sourceStorage = new SourceStorage(db)
    
    console.log('📰 添加默认新闻源...')
    for (const source of defaultSources) {
      try {
        const sourceId = await sourceStorage.add(source)
        console.log(\`✅ 添加成功: \${source.name} (\${sourceId})\`)
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(\`⚠️ 已存在: \${source.name}\`)
        } else {
          console.log(\`❌ 添加失败: \${source.name}\`, error.message)
        }
      }
    }
    
    console.log('🎉 初始化完成！')
    process.exit(0)
  } catch (error) {
    console.error('❌ 初始化失败:', error)
    process.exit(1)
  }
}

init()
`

// 写入临时文件并执行
import { writeFileSync } from 'fs'
writeFileSync('temp-init.js', initScript)

const init = spawn('npx', ['tsx', 'temp-init.js'], {
  stdio: 'inherit',
  shell: true
})

init.on('close', (code) => {
  // 清理临时文件
  import('fs').then(fs => {
    try {
      fs.unlinkSync('temp-init.js')
    } catch (e) {}
  })
  
  if (code === 0) {
    console.log('\n✅ 数据库初始化完成！')
    console.log('📝 现在可以启动服务器: node start-server.js')
  } else {
    console.log('\n❌ 数据库初始化失败')
  }
  process.exit(code)
})