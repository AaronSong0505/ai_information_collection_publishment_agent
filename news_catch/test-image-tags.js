#!/usr/bin/env node

// 测试图片标签功能
import { getAITechNewsCrawler } from './server/crawler/ai-tech-news.js'
import { getSimpleDatabase } from './server/database/simple.js'

console.log('🧪 测试图片标签功能...')
console.log('📊 目标: 验证正文中的图片是否被正确替换为 <|image_id|> 标签')

async function testImageTags() {
  try {
    // 初始化数据库
    const db = getSimpleDatabase()
    await db.init()
    
    const crawler = getAITechNewsCrawler()
    
    // 设置完成回调
    crawler.setOnComplete(() => {
      console.log('\n🎉 测试完成！')
      showImageTagResults()
    })
    
    // 开始抓取（限制1篇文章用于测试）
    console.log('🚀 开始抓取测试文章...')
    await crawler.startCrawling()
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

async function showImageTagResults() {
  try {
    const { getSimpleDatabase } = await import('./server/database/simple.js')
    const db = getSimpleDatabase()
    
    console.log('\n📋 检查图片标签结果:')
    const result = await db.searchArticles({ limit: 5, offset: 0 })
    
    if (result.items && result.items.length > 0) {
      result.items.forEach((article, index) => {
        console.log(`\n${index + 1}. 文章: ${article.title}`)
        console.log(`   来源: ${article.source}`)
        console.log(`   图片数量: ${article.images ? article.images.length : 0}`)
        
        // 检查正文中的图片标签
        const imageTagMatches = article.content.match(/<\|[^|]+\|>/g)
        const imageTagCount = imageTagMatches ? imageTagMatches.length : 0
        
        console.log(`   正文中的图片标签数量: ${imageTagCount}`)
        
        if (imageTagMatches && imageTagMatches.length > 0) {
          console.log(`   图片标签: ${imageTagMatches.join(', ')}`)
          
          // 验证图片ID是否存在于images数组中
          const imageIds = article.images ? article.images.map(img => img.id) : []
          const validTags = imageTagMatches.filter(tag => {
            const id = tag.replace(/<\||\|>/g, '')
            return imageIds.includes(id)
          })
          
          console.log(`   有效的图片标签: ${validTags.length}/${imageTagMatches.length}`)
          
          if (validTags.length !== imageTagMatches.length) {
            console.log(`   ⚠️ 发现无效的图片标签`)
          } else {
            console.log(`   ✅ 所有图片标签都有效`)
          }
        }
        
        // 显示部分正文内容（包含图片标签）
        const contentPreview = article.content.substring(0, 200)
        console.log(`   正文预览: ${contentPreview}${article.content.length > 200 ? '...' : ''}`)
      })
    } else {
      console.log('   暂无文章数据')
    }
    
    console.log('\n✅ 图片标签功能测试完成')
    process.exit(0)
  } catch (error) {
    console.error('❌ 显示结果时出错:', error)
    process.exit(1)
  }
}

// 启动测试
testImageTags()