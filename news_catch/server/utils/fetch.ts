import { ofetch } from 'ofetch'
import logger from './logger.js'

// 更真实的浏览器请求头
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0'
}

// 图片请求头
const IMAGE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'cross-site'
}

export const myFetch = ofetch.create({
  headers: BROWSER_HEADERS,
  timeout: 30000,
  retry: 3,
  retryDelay: 1000,
  onRequest({ request, options }) {
    // 对于图片请求，使用图片专用请求头
    if (options.responseType === 'arrayBuffer') {
      // 根据域名设置特定的Referer
      let referer = 'https://www.google.com/';
      if (typeof request === 'string') {
        if (request.includes('36kr.com') || request.includes('36krcdn.com')) {
          referer = 'https://36kr.com/';
        } else if (request.includes('ithome.com')) {
          referer = 'https://www.ithome.com/';
        } else if (request.includes('juejin.cn') || request.includes('byteimg.com')) {
          referer = 'https://juejin.cn/';
        } else if (request.includes('sspai.com')) {
          referer = 'https://sspai.com/';
        } else if (request.includes('solidot.org')) {
          referer = 'https://www.solidot.org/';
        } else {
          try {
            const url = new URL(request);
            referer = `${url.protocol}//${url.hostname}/`;
          } catch (e) {
            // 保持默认referer
          }
        }
      }

      options.headers = {
        ...IMAGE_HEADERS,
        'Referer': referer
      }
    }
  },
  onRequestError({ error }) {
    logger.error('Request error:', error.message)
  },
  onResponseError({ response, request }) {
    logger.error('Response error:', response.status, response.statusText, 'for URL:', request)
  },
})

export default myFetch