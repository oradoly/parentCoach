import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const DEFAULT_API_PORT = 3001
const DEFAULT_WEB_PORT = 4174
const DEFAULT_WEB_DIR = "/private/tmp/parent-coach-phone-web"

const parseArgs = (argv) => {
  const options = {
    apiPort: DEFAULT_API_PORT,
    skipExport: false,
    webDir: DEFAULT_WEB_DIR,
    webPort: DEFAULT_WEB_PORT,
  }

  for (const arg of argv) {
    if (arg === "--") {
      continue
    }
    if (arg === "--skip-export") {
      options.skipExport = true
    } else if (arg.startsWith("--lan-ip=")) {
      options.lanIp = arg.slice("--lan-ip=".length)
    } else if (arg.startsWith("--api-port=")) {
      options.apiPort = Number.parseInt(arg.slice("--api-port=".length), 10)
    } else if (arg.startsWith("--web-port=")) {
      options.webPort = Number.parseInt(arg.slice("--web-port=".length), 10)
    } else if (arg.startsWith("--web-dir=")) {
      options.webDir = arg.slice("--web-dir=".length)
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  return options
}

const readCommand = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim()
  } catch (error) {
    if (error instanceof Error) {
      return ""
    }
    throw error
  }
}

const detectLanIp = (configured) => {
  if (configured !== undefined && configured.trim() !== "") {
    return configured.trim()
  }

  const envIp = process.env["PARENT_COACH_LAN_IP"]?.trim()
  if (envIp !== undefined && envIp !== "") {
    return envIp
  }

  const en0 = readCommand("ipconfig", ["getifaddr", "en0"])
  if (en0 !== "") {
    return en0
  }

  const ifconfig = readCommand("ifconfig", [])
  const match =
    /inet (192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)/u.exec(
      ifconfig,
    )
  if (match?.[1] !== undefined) {
    return match[1]
  }

  throw new Error("Could not detect LAN IP. Pass --lan-ip=<MAC_LAN_IP>.")
}

const collectFiles = (dir, extension) => {
  if (!existsSync(dir)) {
    return []
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return collectFiles(path, extension)
    }
    return entry.isFile() && entry.name.endsWith(extension) ? [path] : []
  })
}

const runExpoExport = ({ apiBaseUrl, webDir }) => {
  const result = spawnSync(
    "./node_modules/.bin/expo",
    ["export", "--platform", "web", "--output-dir", webDir],
    {
      cwd: "apps/mobile",
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: "1",
        EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
      },
      encoding: "utf8",
      stdio: "pipe",
    },
  )

  if (result.status !== 0) {
    throw new Error(
      [
        "Expo export failed.",
        result.stdout.trim(),
        result.stderr.trim(),
        "Run `pnpm install` if `apps/mobile/node_modules/.bin/expo` is missing.",
      ]
        .filter((line) => line !== "")
        .join("\n"),
    )
  }
}

const assertBundleContains = ({ apiBaseUrl, webDir }) => {
  const bundleFiles = collectFiles(webDir, ".js")
  const matched = bundleFiles.some((file) => readFileSync(file, "utf8").includes(apiBaseUrl))
  if (!matched) {
    throw new Error(`Exported bundle does not contain ${apiBaseUrl}`)
  }
}

const fetchText = async (url, init) => {
  const response = await fetch(url, init)
  const body = await response.text()
  return { body, response }
}

const assertHttpOk = async (url) => {
  const { body, response } = await fetchText(url)
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status.toString()}: ${body}`)
  }
  return body
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  const lanIp = detectLanIp(options.lanIp)
  const apiBaseUrl = `http://${lanIp}:${options.apiPort.toString()}`
  const webOrigin = `http://${lanIp}:${options.webPort.toString()}`

  if (!options.skipExport) {
    runExpoExport({ apiBaseUrl, webDir: options.webDir })
  }
  assertBundleContains({ apiBaseUrl, webDir: options.webDir })

  const health = await assertHttpOk(`${apiBaseUrl}/health`)
  const staticHtml = await assertHttpOk(`${webOrigin}/`)
  const cors = await fetch(`${apiBaseUrl}/v1/problem-sessions`, {
    headers: {
      "Access-Control-Request-Method": "POST",
      Origin: webOrigin,
    },
    method: "OPTIONS",
  })
  if (cors.status !== 204) {
    throw new Error(`CORS preflight returned ${cors.status.toString()}`)
  }

  console.log(
    [
      "Parent Coach phone smoke is ready.",
      `LAN IP: ${lanIp}`,
      `API: ${apiBaseUrl}`,
      `Static web: ${webOrigin}`,
      `Phone URL: ${webOrigin}/?m9-phone-smoke=1`,
      `Health: ${health}`,
      `Static bytes: ${staticHtml.length.toString()}`,
      "",
      "AI mode note:",
      "The fallback API command below uses ENABLE_LOCAL_AI_FIXTURES=true for phone smoke only.",
      "In fixture mode, every uploaded image returns the same sample problem and coaching.",
      "For photo-specific AI checks, start the API without ENABLE_LOCAL_AI_FIXTURES and keep OPENAI_API_KEY server-side.",
      "",
      "If the static server is not running, start it with:",
      `python3 -m http.server ${options.webPort.toString()} --bind 0.0.0.0 --directory ${options.webDir}`,
      "",
      "If the API server is not running, start it with:",
      `ENABLE_LOCAL_AI_FIXTURES=true NODE_ENV=development ALLOWED_WEB_ORIGINS=${webOrigin},http://127.0.0.1:${options.webPort.toString()} PORT=${options.apiPort.toString()} ./node_modules/.bin/tsx apps/api/src/index.ts`,
    ].join("\n"),
  )
}

await main()
