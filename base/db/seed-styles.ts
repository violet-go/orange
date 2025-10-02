/**
 * Seed script to insert preset styles into the database
 * Run with: bun run base/db/seed-styles.ts
 */

import { Database } from 'bun:sqlite'

const styles = [
  {
    id: 'cute-cartoon',
    displayName: '可爱卡通',
    description: '圆润可爱的卡通风格，适合萌系角色',
    promptTemplate: 'cute cartoon style, round shapes, kawaii, adorable, colorful, simple shading',
    sortOrder: 1
  },
  {
    id: 'anime',
    displayName: '日系动漫',
    description: '经典日本动漫风格，细腻表情',
    promptTemplate: 'anime style, manga art, expressive eyes, cel shading, vibrant colors',
    sortOrder: 2
  },
  {
    id: '3d-render',
    displayName: '3D立体',
    description: '现代3D渲染风格，质感丰富',
    promptTemplate: '3D render, blender, pixar style, smooth lighting, detailed textures, high quality',
    sortOrder: 3
  },
  {
    id: 'watercolor',
    displayName: '水彩画',
    description: '柔和水彩风格，艺术感十足',
    promptTemplate: 'watercolor painting, soft edges, pastel colors, artistic, gentle brush strokes',
    sortOrder: 4
  },
  {
    id: 'pixel-art',
    displayName: '像素艺术',
    description: '复古像素风格，怀旧感满满',
    promptTemplate: 'pixel art, 16-bit style, retro gaming, crisp pixels, limited color palette',
    sortOrder: 5
  },
  {
    id: 'line-art',
    displayName: '简笔画',
    description: '简洁线条风格，清新可爱',
    promptTemplate: 'simple line art, minimalist, clean lines, black and white, doodle style',
    sortOrder: 6
  }
]

function seedStyles() {
  const db = new Database('./data/peelpack.db')

  console.log('🌱 Seeding styles...')

  const now = Date.now()

  // Clear existing styles (optional - comment out if you want to keep existing data)
  // db.run('DELETE FROM styles')

  for (const style of styles) {
    try {
      db.run(`
        INSERT OR REPLACE INTO styles (
          id, display_name, description, prompt_template,
          thumbnail_url, sort_order, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        style.id,
        style.displayName,
        style.description,
        style.promptTemplate,
        null, // thumbnail_url - can be added later
        style.sortOrder,
        1, // is_active
        now,
        now
      ])
      console.log(`✅ Inserted style: ${style.displayName}`)
    } catch (error) {
      console.error(`❌ Failed to insert style ${style.id}:`, error)
    }
  }

  // Verify insertion
  const count = db.query('SELECT COUNT(*) as count FROM styles WHERE is_active = 1').get() as any
  console.log(`\n✨ Total active styles: ${count.count}`)

  // Show all styles
  const allStyles = db.query('SELECT id, display_name, sort_order FROM styles ORDER BY sort_order').all()
  console.log('\n📋 Current styles:')
  console.table(allStyles)

  db.close()
  console.log('\n🎉 Seeding completed!')
}

seedStyles()
