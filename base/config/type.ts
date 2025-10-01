export interface Config {
  port: number
  nanoBananaApiKey: string
  nanoBananaBaseUrl: string
  dbPath: string
  storagePath: string
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
}
