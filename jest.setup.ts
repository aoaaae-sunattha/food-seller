import '@testing-library/jest-dom'
const { TextEncoder, TextDecoder } = require('node:util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

const { ReadableStream } = require('node:stream/web')
global.ReadableStream = ReadableStream

const { MessagePort, MessageChannel } = require('node:worker_threads')
global.MessagePort = MessagePort
global.MessageChannel = MessageChannel

const { Blob, File, FormData } = require('node:buffer')
global.Blob = Blob
global.File = File
global.FormData = FormData

if (typeof Request === 'undefined') {
  const { Request, Response, Headers } = require('undici')
  global.Request = Request
  global.Response = Response
  global.Headers = Headers
}

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString() },
    clear: () => { store = {} },
    removeItem: (key: string) => { delete store[key] }
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })
