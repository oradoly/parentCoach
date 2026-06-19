import { serve } from "@hono/node-server"

import { app } from "./server"

const DEFAULT_PORT = 3001

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

serve({
  fetch: app.fetch,
  port,
})

console.log(`Parent Coach API listening on http://localhost:${port.toString()}`)
