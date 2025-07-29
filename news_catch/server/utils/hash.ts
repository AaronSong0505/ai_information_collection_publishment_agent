import md5 from 'md5'

export function generateContentHash(title: string, content: string, url: string): string {
  const combined = `${title}|${content}|${url}`
  return md5(combined)
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export default { generateContentHash, generateId }