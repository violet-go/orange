import { mkdir, writeFile, readFile, unlink, exists } from 'fs/promises'
import { dirname, join } from 'path'
import type { Storage, StorageConfig } from './type'

export function createStorage(config: StorageConfig): Storage {
  const basePath = config.basePath

  return {
    async save(relativePath: string, buffer: Buffer): Promise<void> {
      const fullPath = join(basePath, relativePath)
      const dir = dirname(fullPath)

      // Create directory if it doesn't exist
      await mkdir(dir, { recursive: true })

      // Write file
      await writeFile(fullPath, buffer)
    },

    async read(relativePath: string): Promise<Buffer> {
      const fullPath = join(basePath, relativePath)
      return await readFile(fullPath)
    },

    async exists(relativePath: string): Promise<boolean> {
      const fullPath = join(basePath, relativePath)
      return await exists(fullPath)
    },

    async delete(relativePath: string): Promise<void> {
      const fullPath = join(basePath, relativePath)
      await unlink(fullPath)
    },
  }
}
