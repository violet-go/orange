export interface StorageConfig {
  basePath: string
}

export interface Storage {
  save(relativePath: string, buffer: Buffer): Promise<void>
  read(relativePath: string): Promise<Buffer>
  exists(relativePath: string): Promise<boolean>
  delete(relativePath: string): Promise<void>
}
