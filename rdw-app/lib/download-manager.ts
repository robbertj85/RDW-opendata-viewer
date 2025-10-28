import https from 'https'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '..', 'data')
const METADATA_FILE = path.join(DATA_DIR, '.download-metadata.json')

export interface Dataset {
  id: string
  name: string
  description: string
  estimatedSize: string
  priority: number
}

export const DATASETS: Dataset[] = [
  {
    id: 'm9d7-ebf2',
    name: 'gekentekende_voertuigen',
    description: 'Main vehicle registration (15+ million records)',
    estimatedSize: '~3-5 GB',
    priority: 1
  },
  {
    id: '8ys7-d773',
    name: 'brandstof',
    description: 'Fuel and emissions data',
    estimatedSize: '~500 MB',
    priority: 2
  },
  {
    id: 'vezc-m2t6',
    name: 'carrosserie',
    description: 'Body type information',
    estimatedSize: '~100 MB',
    priority: 2
  },
  {
    id: 'jhie-znh9',
    name: 'carrosserie_specifiek',
    description: 'Detailed body specifications',
    estimatedSize: '~100 MB',
    priority: 3
  },
  {
    id: 'kmfi-hrps',
    name: 'voertuigklasse',
    description: 'Vehicle class data',
    estimatedSize: '~50 MB',
    priority: 3
  },
  {
    id: '3huj-srit',
    name: 'assen',
    description: 'Axle information',
    estimatedSize: '~200 MB',
    priority: 3
  },
  {
    id: 'w4rt-e856',
    name: 'gebreken',
    description: 'Inspection defects',
    estimatedSize: '~500 MB',
    priority: 4
  }
]

export interface DownloadMetadata {
  [key: string]: {
    lastModified: string
    etag: string
    size: number
    downloadedAt: string
  }
}

export interface DownloadProgress {
  dataset: string
  status: 'checking' | 'downloading' | 'completed' | 'skipped' | 'failed'
  progress: number
  downloaded: number
  total: number
  error?: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function loadMetadata(): DownloadMetadata {
  if (fs.existsSync(METADATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'))
    } catch (err) {
      return {}
    }
  }
  return {}
}

function saveMetadata(metadata: DownloadMetadata): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2))
}

async function checkRemoteHeaders(datasetId: string): Promise<{
  lastModified: string
  etag: string
  contentLength: string
}> {
  const url = `https://opendata.rdw.nl/api/views/${datasetId}/rows.csv?accessType=DOWNLOAD`

  return new Promise((resolve, reject) => {
    https.get(url, { method: 'HEAD' }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location
        if (!redirectUrl) {
          reject(new Error('Redirect without location'))
          return
        }
        https
          .get(redirectUrl, { method: 'HEAD' }, (redirectResponse) => {
            resolve({
              lastModified: redirectResponse.headers['last-modified'] || '',
              etag: redirectResponse.headers['etag'] || '',
              contentLength: redirectResponse.headers['content-length'] || '0'
            })
          })
          .on('error', reject)
      } else {
        resolve({
          lastModified: response.headers['last-modified'] || '',
          etag: response.headers['etag'] || '',
          contentLength: response.headers['content-length'] || '0'
        })
      }
    }).on('error', reject)
  })
}

export async function downloadDataset(
  dataset: Dataset,
  metadata: DownloadMetadata,
  onProgress: (progress: DownloadProgress) => void
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const url = `https://opendata.rdw.nl/api/views/${dataset.id}/rows.csv?accessType=DOWNLOAD`
  const outputPath = path.join(DATA_DIR, `${dataset.name}.csv`)

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  onProgress({
    dataset: dataset.name,
    status: 'checking',
    progress: 0,
    downloaded: 0,
    total: 0
  })

  // Check if file exists
  const fileExists = fs.existsSync(outputPath)

  if (fileExists) {
    // Check remote headers
    try {
      const remoteHeaders = await checkRemoteHeaders(dataset.id)
      const localMetadata = metadata[dataset.name]

      if (localMetadata) {
        const remoteModified = new Date(remoteHeaders.lastModified)
        const localModified = new Date(localMetadata.lastModified)

        if (remoteModified <= localModified && remoteHeaders.etag === localMetadata.etag) {
          onProgress({
            dataset: dataset.name,
            status: 'skipped',
            progress: 100,
            downloaded: localMetadata.size,
            total: localMetadata.size
          })
          return { success: true, skipped: true }
        }
      }
    } catch (err) {
      // If we can't check headers, we'll re-download to be safe
      console.warn(`Could not check headers for ${dataset.name}, will re-download`)
    }
  }

  // Download the file
  return new Promise((resolve) => {
    const file = fs.createWriteStream(outputPath)
    let downloadedBytes = 0
    let totalBytes = 0

    const handleResponse = (response: any) => {
      totalBytes = parseInt(response.headers['content-length'], 10) || 0
      const lastModified = response.headers['last-modified']
      const etag = response.headers['etag']

      onProgress({
        dataset: dataset.name,
        status: 'downloading',
        progress: 0,
        downloaded: 0,
        total: totalBytes
      })

      response.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length
        const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0

        onProgress({
          dataset: dataset.name,
          status: 'downloading',
          progress,
          downloaded: downloadedBytes,
          total: totalBytes
        })
      })

      response.pipe(file)

      file.on('finish', () => {
        file.close()

        // Save metadata
        metadata[dataset.name] = {
          lastModified,
          etag,
          size: downloadedBytes,
          downloadedAt: new Date().toISOString()
        }
        saveMetadata(metadata)

        onProgress({
          dataset: dataset.name,
          status: 'completed',
          progress: 100,
          downloaded: downloadedBytes,
          total: totalBytes
        })

        resolve({ success: true })
      })

      file.on('error', (err) => {
        fs.unlink(outputPath, () => {})
        onProgress({
          dataset: dataset.name,
          status: 'failed',
          progress: 0,
          downloaded: 0,
          total: 0,
          error: err.message
        })
        resolve({ success: false, error: err.message })
      })
    }

    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location
          if (!redirectUrl) {
            resolve({ success: false, error: 'Redirect without location' })
            return
          }
          https
            .get(redirectUrl, handleResponse)
            .on('error', (err) => {
              resolve({ success: false, error: err.message })
            })
        } else if (response.statusCode === 200) {
          handleResponse(response)
        } else {
          resolve({
            success: false,
            error: `HTTP ${response.statusCode}: ${response.statusMessage}`
          })
        }
      })
      .on('error', (err) => {
        resolve({ success: false, error: err.message })
      })
  })
}

export async function* downloadAllDatasets(): AsyncGenerator<DownloadProgress> {
  const metadata = loadMetadata()

  for (const dataset of DATASETS) {
    let lastProgress: DownloadProgress | null = null

    await downloadDataset(dataset, metadata, (progress) => {
      lastProgress = progress
    })

    if (lastProgress) {
      yield lastProgress
    }
  }
}

export { formatBytes }
