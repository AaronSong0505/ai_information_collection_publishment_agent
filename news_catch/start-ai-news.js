#!/usr/bin/env node

// AI 技术新闻爬虫启动器
import { spawn } from 'child_process'
import { readFileSync } from 'fs'

console.log('🤖 AI 技术新闻爬虫启动器')
console.log('=' .repeat(50))

// 显示菜单
function showMenu() {
  console.log('\n请选择运行方式:')
  console.log('1. 快速测试 - 直接运行 AI 新闻爬虫')
  console.log('2. 完整服务 - 启动服务器 + AI 新闻爬虫')
  console.log('3. 查看已抓取的新闻')
  console.log('4. 清空新闻数据')
  console.log('5. 退出')
  console.log('')
}

// 获取用户输入
function getUserInput() {
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim())
    })
  })
}

// 运行快速测试
function runQuickTest() {
  console.log('\n🚀 启动快速测试...')
  const child = spawn('npx', ['tsx', 'test-ai-crawler.js'], {
    stdio: 'inherit',
    shell: true
  })
  
  child.on('close', (code) => {
    console.log(`\n测试完成 (退出代码: ${code})`)
    main()
  })
}

// 运行完整服务
function runFullService() {
  console.log('\n🚀 启动完整服务...')
  const child = spawn('npx', ['tsx', 'ai-news-test.js'], {
    stdio: 'inherit',
    shell: true
  })
  
  child.on('close', (code) => {
    console.log(`\n服务完成 (退出代码: ${code})`)
    main()
  })
}

// 查看已抓取的新闻
function viewNews() {
  try {
    const data = readFileSync('./data/articles.json', 'utf-8')
    const articles = JSON.parse(data)
    
    if (articles.length === 0) {
      console.log('\n📭 暂无新闻数据')
    } else {
      console.log(`\n📚 共有 ${articles.length} 篇新闻:`)
      console.log('-'.repeat(50))
      
      articles.forEach((article, index) => {
        console.log(`${index + 1}. [${article.source}] ${article.title}`)
        console.log(`   🔗 ${article.url}`)
        console.log(`   📅 ${new Date(article.publishTime).toLocaleString()}`)
        console.log('')
      })
    }
  } catch (error) {
    console.log('\n❌ 读取新闻数据失败:', error.message)
  }
  
  console.log('\n按回车键返回菜单...')
  getUserInput().then(() => main())
}

// 清空新闻数据
function clearNews() {
  try {
    const fs = require('fs')
    fs.writeFileSync('./data/articles.json', '[]')
    console.log('\n✅ 新闻数据已清空')
  } catch (error) {
    console.log('\n❌ 清空数据失败:', error.message)
  }
  
  console.log('\n按回车键返回菜单...')
  getUserInput().then(() => main())
}

// 主函数
async function main() {
  showMenu()
  process.stdout.write('请输入选项 (1-5): ')
  
  const choice = await getUserInput()
  
  switch (choice) {
    case '1':
      runQuickTest()
      break
    case '2':
      runFullService()
      break
    case '3':
      viewNews()
      break
    case '4':
      clearNews()
      break
    case '5':
      console.log('\n👋 再见！')
      process.exit(0)
      break
    default:
      console.log('\n❌ 无效选项，请重新选择')
      main()
      break
  }
}

// 启动程序
main()