import { describe, test, expect, spyOn } from 'bun:test'
import { createLogger } from '../../base/logger/proc'

describe('Logger', () => {
  test('五个级别都能输出', () => {
    const logger = createLogger({ level: 'debug' })

    // Spy on console methods to verify they're called
    const logSpy = spyOn(console, 'log')
    const warnSpy = spyOn(console, 'warn')
    const errorSpy = spyOn(console, 'error')

    logger.debug('debug message')
    logger.info('info message')
    logger.warn('warn message')
    logger.error('error message')

    expect(logSpy).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalled()

    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  test('子 logger 能继承', () => {
    const logger = createLogger()
    const child = logger.child('test-module')

    const logSpy = spyOn(console, 'log')

    child.info('test message')

    // Verify the prefix is included in the output
    expect(logSpy).toHaveBeenCalled()
    const callArgs = logSpy.mock.calls[0][0]
    expect(callArgs).toContain('[test-module]')

    logSpy.mockRestore()
  })

  test('日志级别过滤', () => {
    const logger = createLogger({ level: 'info' })

    const logSpy = spyOn(console, 'log')

    // debug should not output
    logger.debug('debug message')
    expect(logSpy).not.toHaveBeenCalled()

    // info should output
    logger.info('info message')
    expect(logSpy).toHaveBeenCalled()

    logSpy.mockRestore()
  })

  test('带 context 的日志', () => {
    const logger = createLogger()
    const logSpy = spyOn(console, 'log')

    logger.info('test with context', { userId: '123', action: 'login' })

    expect(logSpy).toHaveBeenCalled()
    const callArgs = logSpy.mock.calls[0][0]
    expect(callArgs).toContain('userId')
    expect(callArgs).toContain('123')

    logSpy.mockRestore()
  })
})
