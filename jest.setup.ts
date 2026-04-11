import '@testing-library/jest-dom'
const { Blob, File, FormData } = require('node:buffer')

// Map these for tests
global.Blob = Blob
global.File = File
global.FormData = FormData

// Ensure Request and Response are global (they should be in Node 25, but let's be sure)
if (typeof Request === 'undefined') {
  const { Request, Response, Headers } = require('undici')
  global.Request = Request
  global.Response = Response
  global.Headers = Headers
}
