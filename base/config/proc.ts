import type { Config } from './type'

export function loadConfig(): Config {
  const requiredEnvArray = [
    'PORT',
    'NANO_BANANA_API_KEY',
    'NANO_BANANA_BASE_URL',
    'DB_PATH',
    'STORAGE_PATH'
  ]

  // Check for missing required environment variables
  const missingEnvArray = requiredEnvArray.filter(key => !process.env[key])

  if (missingEnvArray.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvArray.join(', ')}`
    )
  }

  return {
    port: parseInt(process.env.PORT!, 10),
    nanoBananaApiKey: process.env.NANO_BANANA_API_KEY!,
    nanoBananaBaseUrl: process.env.NANO_BANANA_BASE_URL!,
    dbPath: process.env.DB_PATH!,
    storagePath: process.env.STORAGE_PATH!,
    logLevel: (process.env.LOG_LEVEL || 'info') as Config['logLevel']
  }
}
