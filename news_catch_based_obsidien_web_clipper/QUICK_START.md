# 快速开始

## 🎯 核心理念

这个项目**直接复用** Obsidian Web Clipper 的代码，而不是重新实现它的功能。

## 🚀 一键启动

### Windows
```cmd
# 运行安装脚本
install.bat

# 然后运行演示
npm run demo
```

### Linux/macOS
```bash
# 运行安装脚本
chmod +x install.sh
./install.sh

# 然后运行演示
npm run demo
```

### 手动安装
```bash
# 1. 安装依赖
npm install

# 2. 设置 Obsidian Web Clipper 集成
npm run setup

# 3. 构建项目
npm run build

# 4. 运行演示
npm run demo
```

## 🔧 使用方式

### 推荐：使用 Obsidian Web Clipper
```typescript
import { ContentProcessor } from './src/processor/content-processor.js'

// 使用 Obsidian Web Clipper (推荐)
const processor = new ContentProcessor(undefined, './data/images', true)
const result = await processor.processUrl('https://example.com')
```

### 备用：简单实现
```typescript
// 使用简单实现 (备用)
const processor = new ContentProcessor(undefined, './data/images', false)
```

## 📁 关键文件

- `obsidian-clipper/` - Obsidian Web Clipper 源码 (复用)
- `src/clipper/obsidian-clipper-wrapper.ts` - 主要适配器
- `src/clipper/web-clipper-adapter.ts` - 备用方案
- `scripts/setup-obsidian-clipper.js` - 自动设置脚本

## 🎯 优势

- ✅ **代码复用** - 直接使用专业代码
- ✅ **功能完整** - 获得所有高级功能
- ✅ **持续更新** - 跟随 Obsidian 更新
- ✅ **减少维护** - 不需要维护重复实现

就这么简单！