import type { Logger, LoggerConfig, LogContext, LogLevel } from './type'

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
  white: '\x1b[37m',
} as const

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.dim,
  info: COLORS.cyan,
  warn: COLORS.yellow,
  error: COLORS.red,
  fatal: `${COLORS.bgRed}${COLORS.white}${COLORS.bold}`,
} as const

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
} as const

const formatTimestamp = (date: Date = new Date()): string => {
  return date.toISOString().replace('T', ' ').slice(0, 23)
}

const formatMessage = (
  level: LogLevel,
  message: string,
  context: LogContext | Error | undefined,
  prefix: string | undefined
): string => {
  const timestamp = formatTimestamp()
  const levelStr = level.toUpperCase().padEnd(5)
  const prefixStr = prefix ? `[${prefix}] ` : ''

  const color = LEVEL_COLORS[level]
  const parts = [
    `${COLORS.dim}${timestamp}${COLORS.reset}`,
    level === 'fatal'
      ? `${color} ${levelStr} ${COLORS.reset}`
      : `${color}${levelStr}${COLORS.reset}`,
    `${prefixStr}${message}`,
  ]

  if (context instanceof Error) {
    parts.push(`${COLORS.red}${context.stack || context.message}${COLORS.reset}`)
  } else if (context && Object.keys(context).length > 0) {
    parts.push(`${COLORS.dim}${JSON.stringify(context)}${COLORS.reset}`)
  }

  return parts.join(' ')
}

export function createLogger(config: LoggerConfig = {}): Logger {
  const minPriority = LEVEL_PRIORITY[config.level || 'info']

  const log = (level: LogLevel, message: string, context?: LogContext | Error, prefix?: string): void => {
    if (LEVEL_PRIORITY[level] < minPriority) {
      return
    }

    const formatted = formatMessage(level, message, context, prefix)

    if (level === 'error' || level === 'fatal') {
      console.error(formatted)
    } else if (level === 'warn') {
      console.warn(formatted)
    } else {
      console.log(formatted)
    }
  }

  const createLoggerInstance = (prefix?: string): Logger => ({
    debug: (message: string, context?: LogContext) => log('debug', message, context, prefix),

    info: (message: string, context?: LogContext) => log('info', message, context, prefix),

    warn: (message: string, context?: LogContext) => log('warn', message, context, prefix),

    error: (message: string, context?: LogContext | Error) => log('error', message, context, prefix),

    fatal: (message: string, context?: LogContext | Error, exitCode = 1): never => {
      const formatted = formatMessage('fatal', message, context, prefix)
      console.error(formatted)

      // Write to crash.log
      try {
        const fs = require('fs')
        const crashLog = {
          timestamp: new Date().toISOString(),
          level: 'fatal',
          message: prefix ? `[${prefix}] ${message}` : message,
          context: context instanceof Error
            ? {
                name: context.name,
                message: context.message,
                stack: context.stack,
              }
            : context,
          exitCode,
        }
        fs.appendFileSync('./data/log/crash.log', JSON.stringify(crashLog) + '\n', 'utf8')
      } catch {
        // Best effort - don't fail if can't write crash log
      }

      if (typeof process !== 'undefined') {
        console.error(`\n${COLORS.bgRed}${COLORS.white} FATAL: Process exiting with code ${exitCode} ${COLORS.reset}\n`)
        process.exit(exitCode)
      }

      throw new Error(`Fatal: ${message}`)
    },

    child: (childPrefix: string) => createLoggerInstance(prefix ? `${prefix}:${childPrefix}` : childPrefix),
  })

  return createLoggerInstance()
}
