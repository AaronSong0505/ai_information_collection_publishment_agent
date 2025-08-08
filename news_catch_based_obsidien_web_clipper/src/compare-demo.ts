// 对比演示 - 比较简单版本 vs Obsidian 集成版本
import { consola } from 'consola'
import { WebClipperAdapter } from './clipper/web-clipper-adapter.js'
import { ObsidianClipperWrapper } from './clipper/obsidian-clipper-wrapper.js'

const logger = consola.withTag('CompareDemo')

async function compareClippers() {
  logger.info('🎬 开始对比演示...')
  logger.info('📊 比较简单版本 vs Obsidian 集成版本')
  
  const testUrl = 'https://sspai.com'
  
  try {
    // 1. 测试简单版本
    logger.info('\n🔧 测试简单版本...')
    const simpleClipper = new WebClipperAdapter()
    
    const simpleResult = await simpleClipper.extractContent(testUrl)
    
    logger.info('📊 简单版本结果:')
    logger.info(`   标题: ${simpleResult.title}`)
    logger.info(`   内容长度: ${simpleResult.content.length} 字符`)
    logger.info(`   图片数量: ${simpleResult.images.length} 张`)
    logger.info(`   内容预览: ${simpleResult.content.substring(0, 100)}...`)
    
    // 2. 测试 Obsidian 集成版本
    logger.info('\n🚀 测试 Obsidian 集成版本...')
    
    try {
      const obsidianClipper = new ObsidianClipperWrapper()
      const obsidianResult = await obsidianClipper.extractContent(testUrl)
      
      logger.info('📊 Obsidian 版本结果:')
      logger.info(`   标题: ${obsidianResult.title}`)
      logger.info(`   内容长度: ${obsidianResult.content.length} 字符`)
      logger.info(`   图片数量: ${obsidianResult.images.length} 张`)
      logger.info(`   内容预览: ${obsidianResult.content.substring(0, 100)}...`)
      
      // 3. 对比分析
      logger.info('\n📈 对比分析:')
      logger.info(`   内容长度差异: ${obsidianResult.content.length - simpleResult.content.length} 字符`)
      logger.info(`   图片数量差异: ${obsidianResult.images.length - simpleResult.images.length} 张`)
      
      if (obsidianResult.content.length > simpleResult.content.length) {
        logger.success('✅ Obsidian 版本提取了更多内容')
      } else if (obsidianResult.content.length < simpleResult.content.length) {
        logger.info('📝 简单版本提取了更多内容')
      } else {
        logger.info('⚖️ 两个版本提取的内容长度相同')
      }
      
    } catch (obsidianError) {
      logger.error('❌ Obsidian 集成版本测试失败:', obsidianError.message)
      logger.info('💡 可能的原因:')
      logger.info('   1. Obsidian Web Clipper 依赖未正确安装')
      logger.info('   2. 模块导入路径问题')
      logger.info('   3. 环境兼容性问题')
      
      logger.info('\n🔄 回退到简单版本...')
      logger.success('✅ 简单版本仍然可以正常工作')
    }
    
  } catch (error) {
    logger.error('❌ 对比演示失败:', error)
  }
}

// 运行对比演示
compareClippers().catch(console.error)