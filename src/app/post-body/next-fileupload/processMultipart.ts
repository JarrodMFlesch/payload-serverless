import Busboy from 'busboy'
import httpStatus from 'http-status'
import { APIError } from 'payload/errors'

import type { NextFileUploadOptions, NextFileUploadResponse } from './index'

import { fileFactory } from './fileFactory'
import { memHandler, tempFileHandler } from './handlers'
import { processNested } from './processNested'
import { createUploadTimer } from './uploadTimer'
import { buildFields, debugLog, isFunc, parseFileName } from './utilities'
import { PayloadRequest } from 'payload/types'

const waitFlushProperty = Symbol('wait flush property symbol')

type ProcessMultipart = (args: {
  options: NextFileUploadOptions
  request: PayloadRequest
}) => Promise<NextFileUploadResponse>
export const processMultipart: ProcessMultipart = async ({ options, request }) => {
  let parsingRequest = true

  let fileCount = 0
  let filesCompleted = 0
  let allFilesHaveResolved: (value?: unknown) => void
  let failedResolvingFiles: (err: Error) => void

  const allFilesComplete = new Promise((res, rej) => {
    allFilesHaveResolved = res
    failedResolvingFiles = rej
  })

  const result: NextFileUploadResponse = {
    fields: undefined,
    files: undefined,
  }

  const headersObject: Record<string, any> = {}
  request.headers.forEach((value, name) => {
    headersObject[name] = value
  })

  const busboy = Busboy({ ...options, headers: headersObject })

  // Build multipart req.body fields
  busboy.on('field', (field, val) => {
    result.fields = buildFields(result.fields, field, val)
  })

  busboy.on('finish', async () => {
    debugLog(options, `Busboy finished parsing request.`)
    if (options.parseNested) {
      result.fields = processNested(result.fields)
      result.files = processNested(result.files)
    }

    return result
  })

  busboy.on('error', (err) => {
    debugLog(options, `Busboy error`)
    parsingRequest = false
    throw new APIError('Busboy error parsing multipart request', httpStatus.BAD_REQUEST)
  })

  if (!request.searchParams.has('skip-reader') && request.body) {
    console.log(request.body)
    const reader = request.body.getReader()
    // Start parsing request
    while (parsingRequest) {
      const { done, value } = await reader.read()

      if (done) {
        parsingRequest = false
      }

      if (value) {
        console.log({ value })
        busboy.write(value)
      }
    }

    // if (fileCount !== 0) await allFilesComplete
  }
  console.log({ result })
  return result
}
