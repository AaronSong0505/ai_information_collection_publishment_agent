// 演示文件
import { consola } from 'consola';
import { NewsClipperSystem } from '../src/index.js';
const logger = consola.withTag('Demo');
async function runDemo() {
    logger.info('🎬 开始新闻抓取系统演示...');
    const system = new NewsClipperSystem();
    try {
        // 初始化系统
        await system.init();
        // 获取系统状态
        const status = system.getStatus();
        logger.info('📊 系统状态:', status);
        // 手动执行一次抓取
        logger.info('🔄 执行手动抓取...');
        const result = await system.runOnce();
        logger.success(`✅ 抓取完成: ${result.articles.length} 篇文章`);
        // 显示抓取的文章
        if (result.articles.length > 0) {
            logger.info('📰 抓取到的文章:');
            result.articles.slice(0, 5).forEach((article, index) => {
                logger.info(`${index + 1}. ${article.title}`);
                logger.info(`   来源: ${article.source}`);
                logger.info(`   URL: ${article.url}`);
                logger.info(`   图片: ${article.images.length} 张`);
                logger.info('');
            });
        }
        // 获取统计信息
        const stats = system.getStats();
        logger.info('📈 存储统计:', stats);
        // 搜索文章
        const searchResult = system.searchArticles({ limit: 3 });
        logger.info(`🔍 搜索结果: 共 ${searchResult.total} 篇文章`);
        logger.success('🎉 演示完成!');
    }
    catch (error) {
        logger.error('❌ 演示失败:', error);
    }
    finally {
        await system.shutdown();
    }
}
// 运行演示
runDemo().catch(console.error);
//# sourceMappingURL=demo.js.map