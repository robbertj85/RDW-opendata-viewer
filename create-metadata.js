#!/usr/bin/env node

/**
 * Creates initial metadata file from existing CSV files
 * This enables delta downloads for files downloaded via old scripts
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, 'data')
const METADATA_FILE = path.join(DATA_DIR, '.download-metadata.json')

const DATASETS = [
  { id: 'm9d7-ebf2', name: 'gekentekende_voertuigen' },
  { id: '8ys7-d773', name: 'brandstof' },
  { id: 'vezc-m2t6', name: 'carrosserie' },
  { id: 'jhie-znh9', name: 'carrosserie_specifiek' },
  { id: 'kmfi-hrps', name: 'voertuigklasse' },
  { id: '3huj-srit', name: 'assen' },
  { id: 'w4rt-e856', name: 'gebreken' }
]

async function getRemoteHeaders(datasetId) {
  const url = `https://opendata.rdw.nl/api/views/${datasetId}/rows.csv?accessType=DOWNLOAD`

  return new Promise((resolve, reject) => {
    https.get(url, { method: 'HEAD' }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location
        if (!redirectUrl) {
          reject(new Error('Redirect without location'))
          return
        }
        https.get(redirectUrl, { method: 'HEAD' }, (redirectResponse) => {
          resolve({
            lastModified: redirectResponse.headers['last-modified'] || '',
            etag: redirectResponse.headers['etag'] || ''
          })
        }).on('error', reject)
      } else {
        resolve({
          lastModified: response.headers['last-modified'] || '',
          etag: response.headers['etag'] || ''
        })
      }
    }).on('error', reject)
  })
}

async function createMetadata() {
  const metadata = {}

  console.log('Creating metadata file from existing CSV files...\n')

  for (const dataset of DATASETS) {
    const filepath = path.join(DATA_DIR, `${dataset.name}.csv`)

    if (!fs.existsSync(filepath)) {
      console.log(`⏭️  Skipping ${dataset.name} - file not found`)
      continue
    }

    try {
      console.log(`📊 Processing ${dataset.name}...`)

      // Get file stats
      const stats = fs.statSync(filepath)

      // Get remote headers
      const headers = await getRemoteHeaders(dataset.id)

      metadata[dataset.name] = {
        lastModified: headers.lastModified,
        etag: headers.etag,
        size: stats.size,
        downloadedAt: stats.mtime.toISOString()
      }

      console.log(`   ✅ Saved metadata (${(stats.size / 1024 / 1024).toFixed(1)} MB)`)

    } catch (error) {
      console.error(`   ❌ Error processing ${dataset.name}:`, error.message)
    }
  }

  // Save metadata file
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2))

  console.log(`\n✅ Metadata file created: ${METADATA_FILE}`)
  console.log(`\nDelta downloads are now enabled! 🎉`)
  console.log(`When you click "Check for Updates", only changed files will be downloaded.`)
}

createMetadata().catch(console.error)
