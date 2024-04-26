import { createPayloadRequest } from "@payloadcms/next/utilities"
import { nextFileUpload } from "./next-fileupload"
import config from '@payload-config'

export const POST = async (incomingRequest: Request) => {
  let data
  let file

  const request = await createPayloadRequest({ config, request: incomingRequest })

  if (
    request.method &&
    ['PATCH', 'POST', 'PUT'].includes(request.method.toUpperCase()) &&
    request.body
  ) {
    const [contentType] = (request.headers.get('Content-Type') || '').split(';')

    if (contentType === 'application/json') {
      try {
        data = await incomingRequest.json()
      } catch (error) {
        data = {}
      }
    } else {
      if (request.headers.has('Content-Length') && request.headers.get('Content-Length') !== '0') {
        const { error, fields, files } = await nextFileUpload({
          request: request as Request,
        })

        if (error) {
          throw new Error(error.message)
        }

        if (files?.file) {
          file = files.file
        }

        if (fields?._payload && typeof fields._payload === 'string') {
          data = JSON.parse(fields._payload)
        }
      }
    }
  }

  return Response.json({ message: 'Success', data }, { status: 200 })
}