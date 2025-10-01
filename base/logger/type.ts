export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  [key: string]: unknown
}

export interface Logger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext | Error): void
  fatal(message: string, context?: LogContext | Error, exitCode?: number): never
  child(prefix: string): Logger
}

export interface LoggerConfig {
  level?: LogLevel
}
