import { describe, test, expect, beforeEach } from 'bun:test'
import { loadConfig } from '../../base/config/proc'

describe('Config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Restore original environment before each test
    process.env = { ...originalEnv }
  })

  test('能读取 .env 配置', () => {
    const config = loadConfig()

    expect(config.port).toBe(3000)
    expect(config.nanoBananaApiKey).toBeDefined()
    expect(config.nanoBananaApiKey).not.toBe('')
    expect(config.dbPath).toBeDefined()
  })

  test('缺少必需配置应该抛出错误', () => {
    delete process.env.NANO_BANANA_API_KEY

    expect(() => loadConfig()).toThrow(/Missing required environment variables/)
  })

  test('配置类型正确', () => {
    const config = loadConfig()

    expect(typeof config.port).toBe('number')
    expect(typeof config.nanoBananaApiKey).toBe('string')
    expect(typeof config.nanoBananaBaseUrl).toBe('string')
    expect(typeof config.dbPath).toBe('string')
    expect(typeof config.storagePath).toBe('string')
    expect(['debug', 'info', 'warn', 'error', 'fatal']).toContain(config.logLevel)
  })
})
