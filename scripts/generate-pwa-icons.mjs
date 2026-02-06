#!/usr/bin/env node
/**
 * Generate PWA icons from the SVG favicon.
 * Outputs:
 *   public/pwa-192x192.png
 *   public/pwa-512x512.png
 *   public/apple-touch-icon-180x180.png
 *   public/pwa-maskable-512x512.png  (with padding for maskable safe zone)
 */

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const svgBuffer = readFileSync(resolve(root, 'public/favicon.svg'))

async function generate(size, outputName, options = {}) {
  const { maskable } = options
  let pipeline

  if (maskable) {
    // For maskable icons, add padding (safe zone is 80% of the icon)
    // So we render the SVG at 80% of target size and composite onto a background
    const innerSize = Math.round(size * 0.7)
    const innerBuf = await sharp(svgBuffer)
      .resize(innerSize, innerSize, { fit: 'contain' })
      .png()
      .toBuffer()

    pipeline = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 10, g: 10, b: 10, alpha: 1 }, // #0a0a0a
      },
    })
      .composite([
        {
          input: innerBuf,
          gravity: 'centre',
        },
      ])
      .png()
  } else {
    pipeline = sharp(svgBuffer).resize(size, size, { fit: 'contain' }).png()
  }

  const outputPath = resolve(root, 'public', outputName)
  await pipeline.toFile(outputPath)
  console.log(`✅ Generated ${outputName} (${size}x${size})`)
}

await generate(192, 'pwa-192x192.png')
await generate(512, 'pwa-512x512.png')
await generate(180, 'apple-touch-icon-180x180.png')
await generate(512, 'pwa-maskable-512x512.png', { maskable: true })

console.log('\n🎉 All PWA icons generated!')
