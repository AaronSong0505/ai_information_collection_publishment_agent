# 图片标签功能指南

## 概述

图片标签功能允许在新闻正文中保持图片的位置信息，通过将图片替换为 `<|image_id|>` 格式的标签，方便后期重新组装完整的内容。

## 功能特性

- ✅ **位置保持** - 图片在正文中的原始位置被保留
- ✅ **唯一标识** - 每张图片都有唯一的ID标识
- ✅ **格式转换** - 支持转换为HTML、Markdown等格式
- ✅ **验证工具** - 提供标签验证和统计功能
- ✅ **向后兼容** - 不影响现有的图片下载功能

## 工作原理

1. **图片抓取** - 首先下载并保存图片，生成唯一ID
2. **内容解析** - 解析HTML内容，识别图片位置
3. **标签替换** - 将图片位置替换为 `<|image_id|>` 标签
4. **映射维护** - 维护图片URL到ID的映射关系

## 使用示例

### 基本使用

```javascript
import { fetchArticleContentWithImages } from './server/crawler/content-fetcher.js'

// 创建图片URL到ID的映射
const imageMap = new Map()
imageMap.set('https://example.com/image1.jpg', 'img-123')
imageMap.set('https://example.com/image2.png', 'img-456')

// 抓取内容并处理图片标签
const content = await fetchArticleContentWithImages(
  'https://example.com/article',
  '文章标题',
  '文章描述',
  '来源',
  imageMap
)

console.log(content.content)
// 输出: "这是文章开头 <|img-123|> 这是中间内容 <|img-456|> 这是结尾"
```

### 标签处理工具

```javascript
import { 
  extractImageTags, 
  replaceImageTagsWithHtml,
  validateImageTags 
} from './server/utils/image-tags.js'

const content = "文章内容 <|img-123|> 更多内容 <|img-456|>"
const images = [
  { id: 'img-123', localPath: '/path/to/image1.jpg', originalUrl: '...' },
  { id: 'img-456', localPath: '/path/to/image2.png', originalUrl: '...' }
]

// 提取图片标签
const imageIds = extractImageTags(content)
console.log(imageIds) // ['img-123', 'img-456']

// 转换为HTML
const htmlContent = replaceImageTagsWithHtml(content, images, '/images/')
console.log(htmlContent)
// 输出: "文章内容 <img src="/images/path/to/image1.jpg" alt="Image img-123" /> 更多内容..."

// 验证标签
const validation = validateImageTags(content, images)
console.log(validation.valid) // true
```

## API 参考

### fetchArticleContentWithImages

抓取文章内容并处理图片标签。

```typescript
function fetchArticleContentWithImages(
  url: string,
  title: string,
  description: string,
  source: string,
  imageMap?: Map<string, string>
): Promise<ArticleContent | null>
```

**参数:**
- `url` - 文章URL
- `title` - 文章标题
- `description` - 文章描述
- `source` - 来源名称
- `imageMap` - 图片URL到ID的映射（可选）

**返回值:**
- `ArticleContent` - 包含图片标签的文章内容

### 工具函数

#### extractImageTags(content)
从内容中提取所有图片标签ID。

#### replaceImageTagsWithHtml(content, images, baseUrl)
将图片标签替换为HTML img标签。

#### replaceImageTagsWithMarkdown(content, images, baseUrl)
将图片标签替换为Markdown图片语法。

#### validateImageTags(content, images)
验证内容中的图片标签是否都有对应的图片。

#### getContentStats(content)
获取内容的统计信息（长度、图片数量等）。

#### reorderImagesByContent(content, images)
按照图片在内容中出现的顺序重新排列图片数组。

## 测试和验证

### 运行测试

```bash
# 测试图片标签功能
npm run test:image-tags

# 查看使用示例
npm run example:image-usage
```

### 手动验证

1. 运行爬虫抓取一些文章
2. 检查 `data/articles.json` 中的内容
3. 查看正文中是否包含 `<<image_id>>` 标签
4. 验证图片ID是否与images数组中的ID匹配

## 数据结构

### ArticleContent

```typescript
interface ArticleContent {
  title: string
  content: string        // 包含 <<image_id>> 标签的正文
  summary: string        // 摘要（智能处理图片标签）
  url: string
  publishTime: Date
  source: string
  hash: string
  imageMap?: Map<string, string>  // 图片URL到ID的映射
}
```

### 存储格式

文章数据存储在 `data/articles.json` 中：

```json
{
  "title": "文章标题",
  "content": "这是正文开头 <|img-1234567890-0|> 这是中间内容 <|img-1234567890-1|> 结尾",
  "images": [
    {
      "id": "img-1234567890-0",
      "originalUrl": "https://example.com/image1.jpg",
      "localPath": "data/images/article-id/img-1234567890-0.jpg",
      "format": "jpg",
      "size": 12345
    }
  ]
}
```

## 最佳实践

1. **图片ID生成** - 使用时间戳和索引确保唯一性
2. **标签格式** - 统一使用 `<<image_id>>` 格式
3. **验证检查** - 定期验证标签和图片的对应关系
4. **性能优化** - 大量图片时考虑分批处理
5. **错误处理** - 图片下载失败时保留原始URL信息

## 故障排除

### 常见问题

**Q: 图片标签没有出现在正文中？**
A: 检查图片URL映射是否正确建立，确保在内容解析前已经下载图片。

**Q: 图片标签ID与实际图片不匹配？**
A: 使用 `validateImageTags` 函数检查标签有效性。

**Q: 摘要被图片标签截断？**
A: 系统会智能处理摘要生成，避免截断图片标签。

**Q: 转换为HTML时图片不显示？**
A: 检查 `baseUrl` 参数和图片本地路径是否正确。

## 更新日志

- **v1.0.0** - 初始版本，支持基本的图片标签功能
- **v1.1.0** - 添加工具函数和验证功能
- **v1.2.0** - 支持HTML和Markdown转换