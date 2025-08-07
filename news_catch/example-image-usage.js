#!/usr/bin/env node

// 图片标签使用示例
import { getSimpleDatabase } from './server/database/simple.js'
import { 
  extractImageTags, 
  replaceImageTagsWithHtml, 
  replaceImageTagsWithMarkdown,
  validateImageTags,
  getContentStats,
  reorderImagesByContent
} from './server/utils/image-tags.js'

console.log('📖 图片标签功能使用示例')
console.log('=' .repeat(50))

async function demonstrateImageTagUsage() {
  try {
    // 初始化数据库
    const db = getSimpleDatabase()
    await db.init()
    
    // 获取一篇包含图片的文章
    const result = await db.searchArticles({ limit: 1, offset: 0 })
    
    if (!result.items || result.items.length === 0) {
      console.log('❌ 没有找到文章数据，请先运行爬虫抓取一些文章')
      return
    }
    
    const article = result.items[0]
    console.log(`\n📄 文章: ${article.title}`)
    console.log(`📊 来源: ${article.source}`)
    console.log(`🖼️ 图片数量: ${article.images ? article.images.length : 0}`)
    
    if (!article.images || article.images.length === 0) {
      console.log('⚠️ 这篇文章没有图片，无法演示图片标签功能')
      return
    }
    
    // 1. 提取图片标签
    console.log('\n1️⃣ 提取图片标签:')
    const imageIds = extractImageTags(article.content)
    console.log(`   发现 ${imageIds.length} 个图片标签: ${imageIds.join(', ')}`)
    
    // 2. 验证图片标签
    console.log('\n2️⃣ 验证图片标签:')
    const validation = validateImageTags(article.content, article.images)
    console.log(`   总标签数: ${validation.totalTags}`)
    console.log(`   有效标签数: ${validation.validTags}`)
    console.log(`   是否全部有效: ${validation.valid ? '✅' : '❌'}`)
    
    if (validation.invalidTags.length > 0) {
      console.log(`   无效标签: ${validation.invalidTags.join(', ')}`)
    }
    
    if (validation.missingImages.length > 0) {
      console.log(`   未使用的图片: ${validation.missingImages.join(', ')}`)
    }
    
    // 3. 内容统计
    console.log('\n3️⃣ 内容统计:')
    const stats = getContentStats(article.content)
    console.log(`   总长度: ${stats.totalLength} 字符`)
    console.log(`   纯文本长度: ${stats.textLength} 字符`)
    console.log(`   图片标签数量: ${stats.imageTagCount}`)
    
    // 4. 显示原始内容（带图片标签）
    console.log('\n4️⃣ 原始内容（带图片标签）:')
    const contentPreview = article.content.substring(0, 500)
    console.log(`   ${contentPreview}${article.content.length > 500 ? '...' : ''}`)
    
    // 5. 转换为HTML格式
    console.log('\n5️⃣ 转换为HTML格式:')
    const htmlContent = replaceImageTagsWithHtml(article.content, article.images, '/images/')
    const htmlPreview = htmlContent.substring(0, 500)
    console.log(`   ${htmlPreview}${htmlContent.length > 500 ? '...' : ''}`)
    
    // 6. 转换为Markdown格式
    console.log('\n6️⃣ 转换为Markdown格式:')
    const markdownContent = replaceImageTagsWithMarkdown(article.content, article.images, '/images/')
    const markdownPreview = markdownContent.substring(0, 500)
    console.log(`   ${markdownPreview}${markdownContent.length > 500 ? '...' : ''}`)
    
    // 7. 重新排列图片
    console.log('\n7️⃣ 按内容顺序重新排列图片:')
    const reorderedImages = reorderImagesByContent(article.content, article.images)
    console.log(`   原始顺序: ${article.images.map(img => img.id).join(', ')}`)
    console.log(`   内容顺序: ${reorderedImages.map(img => img.id).join(', ')}`)
    
    // 8. 图片详细信息
    console.log('\n8️⃣ 图片详细信息:')
    article.images.forEach((image, index) => {
      console.log(`   ${index + 1}. ID: ${image.id}`)
      console.log(`      原始URL: ${image.originalUrl}`)
      console.log(`      本地路径: ${image.localPath}`)
      console.log(`      格式: ${image.format}`)
      console.log(`      大小: ${image.size} bytes`)
      if (image.width && image.height) {
        console.log(`      尺寸: ${image.width}x${image.height}`)
      }
      console.log('')
    })
    
    console.log('✅ 图片标签功能演示完成！')
    
  } catch (error) {
    console.error('❌ 演示过程出错:', error)
  }
}

// 启动演示
demonstrateImageTagUsage()