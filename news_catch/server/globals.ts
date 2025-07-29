import { defineEventHandler } from 'h3'
import myFetch from './utils/fetch.js'

// Make these available globally like in the original newsnow project
declare global {
  var defineEventHandler: typeof defineEventHandler
  var myFetch: typeof myFetch
}

// Only set globals if they don't exist
if (!globalThis.defineEventHandler) {
  globalThis.defineEventHandler = defineEventHandler
}
if (!globalThis.myFetch) {
  globalThis.myFetch = myFetch
}

export { defineEventHandler, myFetch }