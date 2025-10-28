import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Store active download process
let downloadProcess: any = null
let downloadProgress: any = {}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'start') {
      if (downloadProcess) {
        return NextResponse.json(
          { error: 'Download already in progress' },
          { status: 409 }
        )
      }

      // Reset progress
      downloadProgress = {}

      // Path to the download script (use smart downloader with delta support)
      const scriptPath = path.join(process.cwd(), '..', 'download-rdw-data-smart.js')

      // Start the download process
      downloadProcess = spawn('node', [scriptPath], {
        cwd: path.join(process.cwd(), '..'),
      })

      let outputBuffer = ''

      downloadProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString()
        outputBuffer += output

        // Parse progress from output (basic parsing)
        const lines = output.split('\n')
        lines.forEach((line: string) => {
          if (line.includes('✅') || line.includes('⏳') || line.includes('❌')) {
            // Store progress info
            downloadProgress.lastOutput = line
            downloadProgress.timestamp = new Date().toISOString()
          }
        })
      })

      downloadProcess.stderr.on('data', (data: Buffer) => {
        console.error('Download error:', data.toString())
        downloadProgress.error = data.toString()
      })

      downloadProcess.on('close', (code: number) => {
        downloadProgress.completed = true
        downloadProgress.exitCode = code
        downloadProcess = null
      })

      return NextResponse.json({
        message: 'Download started',
        status: 'started'
      })
    }

    if (action === 'status') {
      return NextResponse.json({
        active: downloadProcess !== null,
        progress: downloadProgress
      })
    }

    if (action === 'cancel') {
      if (downloadProcess) {
        downloadProcess.kill()
        downloadProcess = null
        downloadProgress = { cancelled: true }
        return NextResponse.json({ message: 'Download cancelled' })
      }
      return NextResponse.json({ message: 'No active download' })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Download API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    active: downloadProcess !== null,
    progress: downloadProgress
  })
}
