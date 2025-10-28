import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { createReadStream } from "fs"
import { createInterface } from "readline"

const BACKEND_URL = "http://localhost:3001"
const DATA_DIR = path.join(process.cwd(), "..", "data")

// Count lines in a file efficiently using streams
async function countLines(filepath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let lineCount = 0
    const rl = createInterface({
      input: createReadStream(filepath),
      crlfDelay: Infinity,
    })

    rl.on("line", () => {
      lineCount++
    })

    rl.on("close", () => {
      resolve(lineCount)
    })

    rl.on("error", (error) => {
      reject(error)
    })
  })
}

export async function GET(request: NextRequest) {
  try {
    // Check backend connection and health
    let backendStatus = {
      connected: false,
      status: "unknown",
      error: null as string | null,
    }

    try {
      const healthResponse = await fetch(`${BACKEND_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      const healthData = await healthResponse.json()
      backendStatus = {
        connected: true,
        status: healthData.status,
        error: null,
      }
    } catch (error: any) {
      backendStatus = {
        connected: false,
        status: "error",
        error: error.message || "Failed to connect to backend server",
      }
    }

    // Get dataset info from backend
    let datasetsInfo: any[] = []
    try {
      const infoResponse = await fetch(`${BACKEND_URL}/info`, {
        signal: AbortSignal.timeout(5000),
      })
      const infoData = await infoResponse.json()
      datasetsInfo = infoData.datasets || []
    } catch (error) {
      console.error("Failed to fetch dataset info:", error)
    }

    // Enhance dataset info with file stats
    const enhancedDatasets = await Promise.all(
      datasetsInfo.map(async (dataset) => {
        const filepath = path.join(DATA_DIR, dataset.filename)
        let lastModified = null
        let recordCount = null

        try {
          if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath)
            lastModified = stats.mtime.toISOString()

            // Count actual lines in the file
            try {
              const lineCount = await countLines(filepath)
              // Subtract 1 for header row
              recordCount = lineCount > 0 ? lineCount - 1 : 0
            } catch (countError) {
              console.error(`Failed to count lines in ${dataset.filename}:`, countError)
              // Fallback to estimation if line counting fails
              const fileSizeBytes = stats.size
              recordCount = Math.floor(fileSizeBytes / 450)
            }
          }
        } catch (error) {
          console.error(`Failed to get stats for ${dataset.filename}:`, error)
        }

        return {
          ...dataset,
          lastModified,
          recordCount,
        }
      })
    )

    // Database connection info
    const databaseInfo = {
      type: "DuckDB",
      path: path.join(process.cwd(), "..", "rdw.duckdb"),
      backend: {
        url: BACKEND_URL,
        connected: backendStatus.connected,
        status: backendStatus.status,
      },
    }

    return NextResponse.json({
      database: databaseInfo,
      datasets: enhancedDatasets,
      totalDatasets: enhancedDatasets.length,
      availableDatasets: enhancedDatasets.filter((d) => d.exists).length,
      lastChecked: new Date().toISOString(),
      error: backendStatus.error,
    })
  } catch (error: any) {
    console.error("Status endpoint error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch status",
        database: {
          type: "DuckDB",
          backend: {
            url: BACKEND_URL,
            connected: false,
            status: "error",
          },
        },
        datasets: [],
      },
      { status: 500 }
    )
  }
}
