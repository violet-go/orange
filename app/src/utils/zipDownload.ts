import JSZip from 'jszip'
import { saveAs } from 'file-saver'

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

  // Concurrent download (batch of 5)
  const batchSize = 5
  for (let i = 0; i < imageArray.length; i += batchSize) {
    const batch = imageArray.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (img, idx) => {
        try {
          const response = await fetch(img.url)
          if (!response.ok) throw new Error(`Failed to fetch ${img.url}`)

          const blob = await response.blob()
          const folder = img.filename.startsWith('emotion-')
            ? emotionsFolder
            : surprisesFolder

          folder?.file(img.filename, blob)
          onProgress?.(i + idx + 1, imageArray.length)
        } catch (error) {
          console.error(`Failed to download ${img.filename}:`, error)
        }
      })
    )
  }

  // Generate ZIP
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // Trigger download
  saveAs(zipBlob, zipFilename)
}
