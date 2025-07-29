import { promises as fs } from 'fs'
import { join } from 'path'

// This script generates source configurations
// Similar to the newsnow project's source generation

async function generateSources() {
  const sources = {
    hackernews: {
      name: 'Hacker News',
      type: 'html',
      url: 'https://news.ycombinator.com',
      interval: 300,
      enabled: true,
      config: {
        selectors: {
          title: '.titleline a',
          link: '.titleline a',
          date: '.age',
        }
      }
    },
    github: {
      name: 'GitHub Trending',
      type: 'html', 
      url: 'https://github.com/trending',
      interval: 600,
      enabled: true,
      config: {
        selectors: {
          title: 'h2 a',
          link: 'h2 a',
          content: 'p',
        }
      }
    },
    // Add more default sources here
  }

  const sourcesDir = join(process.cwd(), 'shared')
  await fs.mkdir(sourcesDir, { recursive: true })
  
  await fs.writeFile(
    join(sourcesDir, 'default-sources.json'),
    JSON.stringify(sources, null, 2)
  )

  console.log('✅ Default sources generated')
}

generateSources().catch(console.error)