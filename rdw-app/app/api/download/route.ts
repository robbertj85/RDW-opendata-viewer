import { NextRequest, NextResponse } from 'next/server'
import { downloadDataset, DATASETS, DownloadProgress, formatBytes } from '@/lib/download-manager'
import fs from 'fs'
import path from 'path'

// Load metadata function for API route
function loadDownloadMetadata() {
  const METADATA_FILE = path.join(process.cwd(), '..', 'data', '.download-metadata.json')

  if (fs.existsSync(METADATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'))
    } catch (err) {
      return {}
    }
  }
  return {}
}

export async function POST(request: NextRequest) {
  try {
    const encoder = new TextEncoder()
    const metadata = loadDownloadMetadata()

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'start',
                message: 'Starting download process',
                totalDatasets: DATASETS.length
              })}\n\n`
            )
          )

          let completed = 0
          let skipped = 0
          let failed = 0

          // Download each dataset sequentially
          for (const dataset of DATASETS) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'dataset_start',
                  dataset: dataset.name,
                  description: dataset.description
                })}\n\n`
              )
            )

            const result = await downloadDataset(dataset, metadata, (progress: DownloadProgress) => {
              // Send progress updates
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'progress',
                    dataset: progress.dataset,
                    status: progress.status,
                    progress: progress.progress.toFixed(1),
                    downloaded: formatBytes(progress.downloaded),
                    total: formatBytes(progress.total),
                    error: progress.error
                  })}\n\n`
                )
              )
            })

            if (result.skipped) {
              skipped++
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'dataset_complete',
                    dataset: dataset.name,
                    status: 'skipped'
                  })}\n\n`
                )
              )
            } else if (result.success) {
              completed++
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'dataset_complete',
                    dataset: dataset.name,
                    status: 'completed'
                  })}\n\n`
                )
              )
            } else {
              failed++
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'dataset_complete',
                    dataset: dataset.name,
                    status: 'failed',
                    error: result.error
                  })}\n\n`
                )
              )
            }
          }

          // Send completion message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'complete',
                completed,
                skipped,
                failed,
                message: 'Download process completed'
              })}\n\n`
            )
          )

          controller.close()
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error.message || 'Unknown error occurred'
              })}\n\n`
            )
          )
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error: any) {
    console.error('Download API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
