#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_URL = 'https://github.com/ibelick/webclaw'

function printBanner() {
  process.stdout.write(`              ▄▄          ▄▄               \n`)
  process.stdout.write(`              ██          ██               \n`)
  process.stdout.write(`██   ██ ▄█▀█▄ ████▄ ▄████ ██  ▀▀█▄ ██   ██ \n`)
  process.stdout.write(`██ █ ██ ██▄█▀ ██ ██ ██    ██ ▄█▀██ ██ █ ██ \n`)
  process.stdout.write(` ██▀██  ▀█▄▄▄ ████▀ ▀████ ██ ▀█▄██  ██▀██ \n\n`)
  process.stdout.write(`Fast web client for OpenClaw\n\n`)
}

function printHelp() {
  process.stdout.write(`webclaw CLI\n\n`)
  process.stdout.write(`Usage:\n`)
  process.stdout.write(`  webclaw                 Initialize in current directory\n`)
  process.stdout.write(`  webclaw init [dir]      Initialize a new project\n`)
  process.stdout.write(`  webclaw dev             Run development server\n`)
  process.stdout.write(`  webclaw build           Build project\n`)
  process.stdout.write(`  webclaw preview         Preview production build\n`)
  process.stdout.write(`  webclaw test            Run tests\n`)
  process.stdout.write(`  webclaw lint            Run lint\n`)
  process.stdout.write(`  webclaw doctor          Validate local setup\n`)
  process.stdout.write(`\nOptions:\n`)
  process.stdout.write(`  --force                 Allow init in non-empty directory\n`)
  process.stdout.write(`  --skip-env              Skip .env.local setup prompts\n`)
  process.stdout.write(`  -h, --help              Show help\n`)
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  })
  if (result.error) {
    throw result.error
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status)
  }
}

function detectPackageManager(cwd) {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

function detectProjectRoot(cwd) {
  const appDir = path.join(cwd, 'apps', 'webclaw')
  const appPackage = path.join(appDir, 'package.json')
  if (fs.existsSync(appPackage)) {
    return { mode: 'monorepo', appDir }
  }
  const packagePath = path.join(cwd, 'package.json')
  if (fs.existsSync(packagePath)) {
    return { mode: 'single', appDir: cwd }
  }
  return null
}

function runProjectScript(scriptName) {
  const detected = detectProjectRoot(process.cwd())
  if (!detected) {
    process.stderr.write(
      `No WebClaw project found in this directory. Run \`webclaw init\` first.\n`,
    )
    process.exit(1)
  }

  const packageManager = detectPackageManager(process.cwd())

  if (detected.mode === 'monorepo') {
    if (packageManager === 'pnpm') {
      runCommand('pnpm', ['-C', 'apps/webclaw', scriptName], process.cwd())
      return
    }
    runCommand(packageManager, ['run', scriptName], detected.appDir)
    return
  }

  runCommand(packageManager, ['run', scriptName], detected.appDir)
}

function ensureDir(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
}

function copyDir(sourceDir, targetDir) {
  ensureDir(targetDir)
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue
    if (entry.name === '.git') continue
    if (entry.name === '.env.local') continue
    if (entry.name === '.openclaw') continue
    if (entry.name === '.webclaw') continue
    if (entry.name === '.tanstack') continue
    if (entry.name === '.DS_Store') continue
    const sourcePath = path.join(sourceDir, entry.name)
    const targetPath = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath)
    } else {
      fs.copyFileSync(sourcePath, targetPath)
    }
  }
}

function isDirEmpty(targetDir) {
  if (!fs.existsSync(targetDir)) return true
  const files = fs
    .readdirSync(targetDir)
    .filter((file) => file !== '.DS_Store' && file !== '.git')
  return files.length === 0
}

function cloneRepo(targetDir) {
  runCommand('git', ['clone', '--depth', '1', REPO_URL, targetDir], process.cwd())
}

function resolveEnvFile(targetDir) {
  const monorepoEnv = path.join(targetDir, 'apps', 'webclaw', '.env.local')
  if (fs.existsSync(path.join(targetDir, 'apps', 'webclaw'))) {
    return monorepoEnv
  }
  return path.join(targetDir, '.env.local')
}

async function askQuestion(rl, question) {
  const answer = await rl.question(question)
  return answer.trim()
}

async function maybeSetupEnv(targetDir, options) {
  if (options.has('--skip-env')) return
  if (!process.stdin.isTTY || !process.stdout.isTTY) return

  const envFile = resolveEnvFile(targetDir)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    const createAnswer = await askQuestion(
      rl,
      `Create ${envFile} now? [Y/n]: `,
    )
    const shouldCreate =
      createAnswer.length === 0 ||
      createAnswer.toLowerCase() === 'y' ||
      createAnswer.toLowerCase() === 'yes'

    if (!shouldCreate) {
      process.stdout.write(
        `Skipping env file. Create it later at ${envFile} with:\n` +
          `CLAWDBOT_GATEWAY_URL=...\n` +
          `CLAWDBOT_GATEWAY_TOKEN=...\n\n`,
      )
      return
    }

    if (fs.existsSync(envFile)) {
      const overwriteAnswer = await askQuestion(
        rl,
        `${envFile} already exists. Overwrite? [y/N]: `,
      )
      const shouldOverwrite =
        overwriteAnswer.toLowerCase() === 'y' ||
        overwriteAnswer.toLowerCase() === 'yes'
      if (!shouldOverwrite) {
        process.stdout.write(`Keeping existing ${envFile}\n\n`)
        return
      }
    }

    const gatewayUrl = await askQuestion(rl, 'CLAWDBOT_GATEWAY_URL: ')
    const gatewayToken = await askQuestion(rl, 'CLAWDBOT_GATEWAY_TOKEN: ')

    ensureDir(path.dirname(envFile))
    fs.writeFileSync(
      envFile,
      `CLAWDBOT_GATEWAY_URL=${gatewayUrl}\nCLAWDBOT_GATEWAY_TOKEN=${gatewayToken}\n`,
    )
    process.stdout.write(`Wrote ${envFile}\n\n`)
  } finally {
    rl.close()
  }
}

async function initProject(rawTarget, options) {
  printBanner()
  const targetDir = path.resolve(process.cwd(), rawTarget ?? '.')
  const force = options.has('--force')
  const isCurrentDir = targetDir === process.cwd()

  ensureDir(targetDir)
  if (!force && !isDirEmpty(targetDir)) {
    process.stderr.write(
      `Target directory is not empty. Use --force to continue: ${targetDir}\n`,
    )
    process.exit(1)
  }

  if (force && !isDirEmpty(targetDir) && isCurrentDir) {
    process.stderr.write(
      'Refusing to overwrite current directory. Use an empty directory for init.\n',
    )
    process.exit(1)
  }

  if (force && !isDirEmpty(targetDir) && !isCurrentDir) {
    for (const entry of fs.readdirSync(targetDir)) {
      if (entry === '.git') continue
      fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true })
    }
  }

  if (!fs.existsSync(path.join(targetDir, '.git')) && isDirEmpty(targetDir)) {
    if (!isCurrentDir) {
      cloneRepo(targetDir)
    } else {
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'webclaw-'))
      const tempCloneDir = path.join(tempRoot, 'repo')
      cloneRepo(tempCloneDir)
      copyDir(tempCloneDir, targetDir)
      fs.rmSync(tempRoot, { recursive: true, force: true })
    }
  }

  await maybeSetupEnv(targetDir, options)

  process.stdout.write(`\nWebClaw project created at ${targetDir}\n\n`)
  process.stdout.write(`Next steps:\n`)
  process.stdout.write(`  cd ${path.relative(process.cwd(), targetDir) || '.'}\n`)
  process.stdout.write(`  pnpm install\n`)
  process.stdout.write(`  pnpm dev\n\n`)
}

function doctor() {
  const nodeMajor = Number(process.versions.node.split('.')[0] || 0)
  const hasPnpm = spawnSync('pnpm', ['--version'], { stdio: 'ignore' }).status === 0
  const issues = []

  if (nodeMajor < 20) {
    issues.push('Node.js >= 20 is required.')
  }
  if (!hasPnpm) {
    issues.push('pnpm is recommended but was not found in PATH.')
  }

  if (issues.length === 0) {
    process.stdout.write('Environment looks good.\n')
    return
  }

  for (const issue of issues) {
    process.stderr.write(`- ${issue}\n`)
  }
  process.exit(1)
}

async function main() {
  const args = process.argv.slice(2)
  const options = new Set(args.filter((arg) => arg.startsWith('-')))
  const command = args.find((arg) => !arg.startsWith('-'))

  if (options.has('-h') || options.has('--help')) {
    printHelp()
    return
  }

  if (!command) {
    await initProject('.', options)
    return
  }

  if (command === 'init') {
    const target = args.find((arg, index) => {
      if (arg.startsWith('-')) return false
      const previous = args[index - 1]
      return previous === 'init'
    })
    await initProject(target, options)
    return
  }

  if (command === 'doctor') {
    doctor()
    return
  }

  if (
    command === 'dev' ||
    command === 'build' ||
    command === 'preview' ||
    command === 'test' ||
    command === 'lint'
  ) {
    runProjectScript(command)
    return
  }

  process.stderr.write(`Unknown command: ${command}\n\n`)
  printHelp()
  process.exit(1)
}

void main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exit(1)
})
