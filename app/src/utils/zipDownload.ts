import JSZip from 'jszip'
import fileSaver from 'file-saver'
const { saveAs } = fileSaver

interface ImageToDownload {
  url: string
  filename: string
}

export async function downloadImagesAsZip(
  imageArray: ImageToDownload[],
  zipFilename: string,
  onProgress?: (current: number, total: number) => void
) {
  const zip = new JSZip()
  const emotionsFolder = zip.folder('emotions')
  const surprisesFolder = zip.folder('surprises')

  let successCount = 0
  let failedCount = 0
  const failedImageArray: string[] = []

  // Concurrent download (batch of 5)
  const batchSize = 5
  for (let i = 0; i < imageArray.length; i += batchSize) {
    const batch = imageArray.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (img, idx) => {
        try {
          console.log(`Downloading: ${img.url}`)
          const response = await fetch(img.url, {
            mode: 'cors',
            credentials: 'include'
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const blob = await response.blob()
          console.log(`Downloaded ${img.filename}: ${blob.size} bytes`)

          const folder = img.filename.startsWith('emotion-')
            ? emotionsFolder
            : surprisesFolder

          folder?.file(img.filename, blob)
          successCount++
          onProgress?.(i + idx + 1, imageArray.length)
        } catch (error) {
          failedCount++
          failedImageArray.push(img.filename)
          console.error(`Failed to download ${img.filename}:`, error)
        }
      })
    )
  }

  // Check if any images were successfully downloaded
  if (successCount === 0) {
    throw new Error(
      `所有图片下载失败 (${failedCount}/${imageArray.length})\n` +
      `失败的文件: ${failedImageArray.join(', ')}`
    )
  }

  // Warn if some failed
  if (failedCount > 0) {
    console.warn(`部分图片下载失败: ${failedCount}/${imageArray.length}`)
  }

  // Generate ZIP
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  console.log(`ZIP generated: ${zipBlob.size} bytes`)

  // Trigger download
  saveAs(zipBlob, zipFilename)

  return { successCount, failedCount, failedImageArray }
}
