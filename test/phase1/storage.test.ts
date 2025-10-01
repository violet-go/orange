import { describe, test, expect, afterAll } from 'bun:test'
import { rm } from 'fs/promises'
import { createStorage } from '../../base/storage/proc'

describe('Storage', () => {
  const testBasePath = './test-data'
  const storage = createStorage({ basePath: testBasePath })

  afterAll(async () => {
    // Cleanup test data
    try {
      await rm(testBasePath, { recursive: true })
    } catch {
      // Ignore if doesn't exist
    }
  })

  test('能写入文件', async () => {
    const buffer = Buffer.from('test image data')
    await storage.save('images/test/img.png', buffer)

    // Verify file exists
    const fileExists = await storage.exists('images/test/img.png')
    expect(fileExists).toBe(true)
  })

  test('文件确实存在', async () => {
    const buffer = Buffer.from('test data')
    await storage.save('test-file.txt', buffer)

    const exists = await storage.exists('test-file.txt')
    expect(exists).toBe(true)
  })

  test('能读取文件', async () => {
    const originalBuffer = Buffer.from('test image data')
    await storage.save('images/test/img2.png', originalBuffer)

    const readBuffer = await storage.read('images/test/img2.png')
    expect(readBuffer.equals(originalBuffer)).toBe(true)
  })

  test('路径不存在会自动创建', async () => {
    const buffer = Buffer.from('test data')
    await storage.save('deep/nested/path/file.png', buffer)

    const exists = await storage.exists('deep/nested/path/file.png')
    expect(exists).toBe(true)
  })

  test('能删除文件', async () => {
    const buffer = Buffer.from('test data')
    await storage.save('to-delete.png', buffer)

    // Verify it exists first
    let exists = await storage.exists('to-delete.png')
    expect(exists).toBe(true)

    // Delete it
    await storage.delete('to-delete.png')

    // Verify it's gone
    exists = await storage.exists('to-delete.png')
    expect(exists).toBe(false)
  })
})
