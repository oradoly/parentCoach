import { serve } from "@hono/node-server"

import { app } from "./server"

const DEFAULT_PORT = 3001
const DEFAULT_HOST = "0.0.0.0"

const parsePort = (value: string | undefined): number => {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_PORT
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("PORT must be an integer between 1 and 65535")
  }

  return port
}

const port = parsePort(process.env["PORT"])
const configuredHost = process.env["HOST"]?.trim()
const host = configuredHost === "" ? DEFAULT_HOST : (configuredHost ?? DEFAULT_HOST)

serve({
  fetch: app.fetch,
  hostname: host,
  port,
})

console.log(`Parent Coach API listening on http://${host}:${port.toString()}`)
