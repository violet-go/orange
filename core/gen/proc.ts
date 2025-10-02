import type { GenService, GenerateParams } from './type'
import type { Database } from '../../base/db/type'
import type { Storage } from '../../base/storage/type'
import type { ImageGen } from '../image/type'
import type { PromptBuilder } from '../prompt/type'
import type { PubSub } from '../../base/pubsub/type'
import type { Logger } from '../../base/logger/type'

export interface GenServiceDeps {
  db: Database
  storage: Storage
  imageGen: ImageGen
  promptBuilder: PromptBuilder
  pubsub: PubSub
  logger: Logger
}

export function createGenService(deps: GenServiceDeps): GenService {
  return {
    async generate(params: GenerateParams): Promise<string> {
      const projectId = crypto.randomUUID()
      const seed = params.seed || Math.floor(Math.random() * 1000000)

      deps.logger.info('Creating project', { projectId, inputType: params.inputType })

      // 1. Create Project record
      deps.db.createProject({
        id: projectId,
        inputType: params.inputType,
        inputContent: params.inputContent,
        styleId: params.styleId || null,
        customPrompt: params.customPrompt || null,
        seed,
        status: 'pending'
      })

      // 2. Parse input content based on input type
      let textPrompt = params.inputContent
      let inputImage: { base64Data: string; mimeType: string } | undefined

      if (params.inputType === 'image' || params.inputType === 'mixed') {
        try {
          // Parse JSON format: { text?: string, base64Data: string, mimeType: string }
          const parsed = JSON.parse(params.inputContent)
          inputImage = {
            base64Data: parsed.base64Data,
            mimeType: parsed.mimeType
          }
          textPrompt = parsed.text || 'Transform this image' // Default prompt if no text
          deps.logger.info('Parsed image input', {
            mimeType: inputImage.mimeType,
            hasText: !!parsed.text,
            dataLength: inputImage.base64Data.length
          })
        } catch (error) {
          deps.logger.error('Failed to parse image input', error)
          throw new Error('Invalid image input format - expected JSON with base64Data and mimeType')
        }
      }

      // 3. Construct base prompt
      let basePrompt = textPrompt
      if (params.styleId) {
        const style = deps.db.getStyle(params.styleId)
        if (style) {
          // User description first, then style template (better prompt engineering)
          basePrompt = `${textPrompt}, ${style.promptTemplate}`
        }
      }
      if (params.customPrompt) {
        basePrompt = `${basePrompt}, ${params.customPrompt}`
      }

      // 3. Build 9 emotion prompts + 7 surprise prompts
      const emotionPromptArray = deps.promptBuilder.buildAllEmotions(basePrompt)
      const surprisePromptArray = deps.promptBuilder.buildAllSurprises(basePrompt)

      // 4. Create 9 emotion Image records (pending)
      const emotionImageRecordArray = emotionPromptArray.map((ep, idx) => {
        const imageId = crypto.randomUUID()
        const imageSeed = seed + idx

        deps.db.createImage({
          id: imageId,
          projectId,
          category: 'emotion',
          emotionType: ep.emotionType,
          surpriseIndex: null,
          prompt: ep.prompt,
          seed: imageSeed,
          filePath: `data/images/${projectId}/${imageId}.png`,
          status: 'pending'
        })

        return { imageId, prompt: ep.prompt, seed: imageSeed }
      })

      // 5. Create 7 surprise Image records (pending)
      const surpriseImageRecordArray = surprisePromptArray.map((sp, idx) => {
        const imageId = crypto.randomUUID()
        const imageSeed = seed + 2000 + idx // Different seed range (avoid retry collision)

        deps.db.createImage({
          id: imageId,
          projectId,
          category: 'surprise',
          emotionType: null,
          surpriseIndex: sp.surpriseIndex,
          prompt: sp.prompt,
          seed: imageSeed,
          filePath: `data/images/${projectId}/${imageId}.png`,
          status: 'pending'
        })

        return { imageId, prompt: sp.prompt, seed: imageSeed }
      })

      // 6. Combine all image records
      const imageRecordArray = [...emotionImageRecordArray, ...surpriseImageRecordArray]

      // 7. Start async generation (don't await)
      generateAsync(projectId, imageRecordArray, inputImage, deps)

      // 8. Return projectId immediately
      return projectId
    }
  }
}

async function generateAsync(
  projectId: string,
  imageRecordArray: Array<{ imageId: string; prompt: string; seed: number }>,
  inputImage: { base64Data: string; mimeType: string } | undefined,
  deps: GenServiceDeps
) {
  const logger = deps.logger.child('generate-async')

  logger.info('Starting async generation', {
    projectId,
    imageCount: imageRecordArray.length
  })

  // Update Project status to generating
  deps.db.updateProject(projectId, { status: 'generating' })

  // Publish initial progress
  await publishProgress(projectId, deps)

  // Concurrent generation with retry logic
  await Promise.allSettled(
    imageRecordArray.map(async (record) => {
      await generateSingleImage(record, projectId, inputImage, deps, logger)
    })
  )

  // Calculate final status
  const imageArray = deps.db.getImagesByProject(projectId)
  const successCount = imageArray.filter(img => img.status === 'success').length
  const failedCount = imageArray.filter(img => img.status === 'failed').length

  let finalStatus: 'completed' | 'partial_failed'
  if (successCount === imageArray.length) {
    finalStatus = 'completed'
  } else {
    finalStatus = 'partial_failed'
  }

  deps.db.updateProject(projectId, { status: finalStatus })
  await publishProgress(projectId, deps)

  logger.info('Generation completed', {
    projectId,
    status: finalStatus,
    successCount,
    failedCount
  })
}

async function generateSingleImage(
  record: { imageId: string; prompt: string; seed: number },
  projectId: string,
  inputImage: { base64Data: string; mimeType: string } | undefined,
  deps: GenServiceDeps,
  logger: Logger
) {
  try {
    // Update status to generating
    deps.db.updateImage(record.imageId, { status: 'generating' })
    await publishProgress(projectId, deps)

    // Call image generation
    const result = await deps.imageGen.generate({
      prompt: record.prompt,
      seed: record.seed,
      inputImage: inputImage ? {
        mimeType: inputImage.mimeType,
        base64Data: inputImage.base64Data
      } : undefined
    })

    // Save image to filesystem
    await deps.storage.save(
      `images/${projectId}/${record.imageId}.png`,
      result.imageBuffer
    )

    // Update status to success
    deps.db.updateImage(record.imageId, {
      status: 'success',
      width: result.width,
      height: result.height,
      modelMetadata: JSON.stringify(result.metadata || {})
    })

    logger.info('Image generated successfully', { imageId: record.imageId })

    // Publish progress with latest image
    await publishProgress(projectId, deps, record.imageId)

  } catch (error) {
    logger.error('Image generation failed', { imageId: record.imageId, error })

    // Get current retry count
    const currentImage = deps.db.getImage(record.imageId)
    const retryCount = currentImage?.retryCount || 0

    // Retry once with different seed
    if (retryCount === 0) {
      logger.info('Retrying with new seed', { imageId: record.imageId })

      deps.db.updateImage(record.imageId, { retryCount: 1 })

      try {
        const retryResult = await deps.imageGen.generate({
          prompt: record.prompt,
          seed: record.seed + 1000, // Different seed
          inputImage: inputImage ? {
            mimeType: inputImage.mimeType,
            base64Data: inputImage.base64Data
          } : undefined
        })

        await deps.storage.save(
          `images/${projectId}/${record.imageId}.png`,
          retryResult.imageBuffer
        )

        deps.db.updateImage(record.imageId, {
          status: 'success',
          width: retryResult.width,
          height: retryResult.height,
          modelMetadata: JSON.stringify(retryResult.metadata || {})
        })

        logger.info('Retry succeeded', { imageId: record.imageId })
        await publishProgress(projectId, deps, record.imageId)

      } catch (retryError) {
        // Retry failed
        deps.db.updateImage(record.imageId, {
          status: 'failed',
          errorMessage: retryError instanceof Error ? retryError.message : 'Unknown error'
        })

        logger.error('Retry failed', { imageId: record.imageId, error: retryError })
        await publishProgress(projectId, deps)
      }
    } else {
      // Already retried, mark as failed
      deps.db.updateImage(record.imageId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })

      await publishProgress(projectId, deps)
    }
  }
}

async function publishProgress(
  projectId: string,
  deps: GenServiceDeps,
  latestImageId?: string
) {
  const imageArray = deps.db.getImagesByProject(projectId)
  const project = deps.db.getProject(projectId)

  if (!project) return

  const completedCount = imageArray.filter(
    img => img.status === 'success' || img.status === 'failed'
  ).length

  let latestImage = null
  if (latestImageId) {
    latestImage = imageArray.find(img => img.id === latestImageId)
  }

  await deps.pubsub.publish(`project:${projectId}`, {
    projectId,
    status: project.status,
    completedCount,
    totalCount: imageArray.length,
    latestImage,
    timestamp: new Date()
  })
}
