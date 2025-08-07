#!/usr/bin/env node

// 简化的图片标签测试
import { getSimpleDatabase } from './server/database/simple.js'

console.log('🧪 简化测试：检查现有文章的图片标签...')

async function testExistingArticles() {
  try {
    const db = getSimpleDatabase()
    await db.init()
    
    const result = await db.searchArticles({ limit: 5, offset: 0 })
    
    if (!result.items || result.items.length === 0) {
      console.log('❌ 没有找到文章数据')
      return
    }
    
    console.log(`📚 找到 ${result.items.length} 篇文章`)
    
    result.items.forEach((article, index) => {
      console.log(`\n${index + 1}. 文章: ${article.title}`)
      console.log(`   来源: ${article.source}`)
      console.log(`   图片数量: ${article.images ? article.images.length : 0}`)
      
      // 检查新格式的图片标签
      const newTagMatches = article.content.match(/<\|[^|]+\|>/g)
      const newTagCount = newTagMatches ? newTagMatches.length : 0
      
      // 检查旧格式的图片标签
      const oldTagMatches = article.content.match(/<<[^>]+>>/g)
      const oldTagCount = oldTagMatches ? oldTagMatches.length : 0
      
      console.log(`   新格式标签 <|id|>: ${newTagCount}`)
      console.log(`   旧格式标签 <<id>>: ${oldTagCount}`)
      
      if (newTagMatches && newTagMatches.length > 0) {
        console.log(`   ✅ 发现新格式标签: ${newTagMatches.slice(0, 3).join(', ')}${newTagMatches.length > 3 ? '...' : ''}`)
      }
      
      if (oldTagMatches && oldTagMatches.length > 0) {
        console.log(`   📝 发现旧格式标签: ${oldTagMatches.slice(0, 3).join(', ')}${oldTagMatches.length > 3 ? '...' : ''}`)
      }
      
      // 显示部分内容
      const contentPreview = article.content.substring(0, 200)
      console.log(`   内容预览: ${contentPreview}${article.content.length > 200 ? '...' : ''}`)
    })
    
    console.log('\n✅ 测试完成')
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

testExistingArticles()