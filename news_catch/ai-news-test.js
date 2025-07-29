// AI 技术新闻测试脚本 - 获取最新的 AI 技术资讯
import { spawn } from 'child_process'

console.log('🤖 启动 AI 技术新闻抓取测试...')
console.log('📊 目标: 抓取 10 篇最新 AI 技术新闻后自动停止服务')
console.log('🎯 新闻源: 36氪、IT之家、掘金、Solidot、少数派')
console.log('🔍 关键词: AI、人工智能、机器学习、大模型、科技创新等')

let serverProcess = null

async function runAINewsTest() {
  try {
    // 启动服务器
    console.log('\n1️⃣ 启动服务器...')
    serverProcess = spawn('npx', ['tsx', 'server/simple-server.ts'], {
      stdio: 'pipe',
      shell: true
    })

    let serverReady = false
    
    // 监听服务器输出
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('📝', output.trim())
      
      // 检查服务器是否准备就绪
      if (output.includes('Server is ready to accept connections')) {
        serverReady = true
        startAICrawling()
      }
      
      // 检查是否自动停止
      if (output.includes('服务已自动停止')) {
        console.log('\n🎉 AI 新闻抓取测试完成！')
        showFinalResults()
      }
    })

    serverProcess.stderr.on('data', (data) => {
      console.log('⚠️', data.toString().trim())
    })

    serverProcess.on('close', (code) => {
      console.log(`\n📊 服务器进程结束 (代码: ${code})`)
      if (code === 0) {
        console.log('✅ AI 新闻抓取测试成功完成！')
      }
    })

    // 30秒后如果服务器还没准备好，强制退出
    setTimeout(() => {
      if (!serverReady) {
        console.log('❌ 服务器启动超时')
        cleanup()
      }
    }, 30000)

  } catch (error) {
    console.error('❌ AI 新闻测试失败:', error)
    cleanup()
  }
}

async function startAICrawling() {
  console.log('\n2️⃣ 等待服务器完全启动...')
  await sleep(3000)
  
  try {
    console.log('3️⃣ 启动 AI 技术新闻爬虫...')
    
    const response = await fetch('http://localhost:3000/api/crawl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        action: 'start',
        type: 'ai'  // 使用 AI 技术新闻爬虫
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ AI 新闻爬虫启动成功:', result.data.message)
      console.log('📊 限制:', result.data.note)
      console.log('🔧 新闻源:', result.data.availableCrawlers.join(', '))
      
      // 开始监控进度
      monitorProgress()
    } else {
      console.error('❌ 爬虫启动失败:', response.status)
      cleanup()
    }
    
  } catch (error) {
    console.error('❌ 启动爬虫时出错:', error.message)
    cleanup()
  }
}

async function monitorProgress() {
  console.log('\n4️⃣ 监控 AI 新闻抓取进度...')
  
  const monitorInterval = setInterval(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/crawl?action=status&type=ai')
      if (response.ok) {
        const status = await response.json()
        const { articleCount, maxArticles, shouldStop } = status.data
        
        console.log(`📈 AI新闻进度: ${articleCount}/${maxArticles} 篇文章`)
        
        if (shouldStop || articleCount >= maxArticles) {
          console.log('🎯 达到目标，等待服务自动停止...')
          clearInterval(monitorInterval)
        }
      }
    } catch (error) {
      // 服务器可能已经停止，这是正常的
      clearInterval(monitorInterval)
    }
  }, 2000) // 每2秒检查一次
  
  // 60秒后停止监控
  setTimeout(() => {
    clearInterval(monitorInterval)
  }, 60000)
}

async function showFinalResults() {
  console.log('\n5️⃣ 显示 AI 新闻抓取结果...')
  
  try {
    // 等待一下确保数据已保存
    await sleep(1000)
    
    // 读取保存的文章数据
    const fs = await import('fs')
    const articlesFile = './data/articles.json'
    
    if (fs.existsSync(articlesFile)) {
      const articlesData = fs.readFileSync(articlesFile, 'utf-8')
      const articles = JSON.parse(articlesData)
      
      console.log(`📚 总共抓取: ${articles.length} 篇 AI 技术新闻`)
      console.log('\n📊 新闻来源统计:')
      
      const sources = {}
      articles.forEach(article => {
        sources[article.source] = (sources[article.source] || 0) + 1
      })
      
      Object.entries(sources).forEach(([source, count]) => {
        console.log(`   - ${source}: ${count} 篇`)
      })
      
      console.log('\n📄 AI 新闻列表:')
      articles.forEach((article, index) => {
        console.log(`   ${index + 1}. [${article.source}] ${article.title}`)
        if (article.tags && article.tags.length > 0) {
          console.log(`      🏷️ 标签: ${article.tags.join(', ')}`)
        }
      })
      
      console.log('\n🔗 可访问的新闻链接:')
      articles.slice(0, 5).forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.url}`)
      })
      
    } else {
      console.log('⚠️ 未找到文章数据文件')
    }
    
  } catch (error) {
    console.error('❌ 显示结果时出错:', error.message)
  }
  
  console.log('\n🎊 AI 技术新闻抓取测试完成！')
  console.log('💡 这些都是最新的 AI 技术相关新闻，可以直接访问查看详细内容。')
}

function cleanup() {
  if (serverProcess) {
    serverProcess.kill('SIGINT')
  }
  process.exit(1)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 优雅关闭处理
process.on('SIGINT', () => {
  console.log('\n🛑 收到中断信号，正在清理...')
  cleanup()
})

// 启动 AI 新闻测试
runAINewsTest()