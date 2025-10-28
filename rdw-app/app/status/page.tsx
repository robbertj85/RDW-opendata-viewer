"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react"

interface Dataset {
  id: string
  filename: string
  exists: boolean
  size: string
  lastModified: string | null
  recordCount: number | null
}

interface StatusData {
  database: {
    type: string
    path: string
    backend: {
      url: string
      connected: boolean
      status: string
    }
  }
  datasets: Dataset[]
  totalDatasets: number
  availableDatasets: number
  lastChecked: string
  error: string | null
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<any>(null)

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/status")

      if (!response.ok) {
        throw new Error("Failed to fetch status")
      }

      const data = await response.json()
      setStatus(data)
    } catch (err: any) {
      setError(err.message || "Failed to load status")
      console.error("Error loading status:", err)
    } finally {
      setLoading(false)
    }
  }

  const startDownload = async () => {
    try {
      setDownloading(true)
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to start download")
      }

      // Poll for progress
      const progressInterval = setInterval(async () => {
        const progressRes = await fetch("/api/download")
        const progressData = await progressRes.json()
        setDownloadProgress(progressData.progress)

        if (progressData.progress?.completed) {
          clearInterval(progressInterval)
          setDownloading(false)
          loadStatus() // Refresh status after download completes
        }
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to start download")
      setDownloading(false)
    }
  }

  const checkDownloadStatus = async () => {
    try {
      const response = await fetch("/api/download")
      const data = await response.json()
      if (data.active) {
        setDownloading(true)
        setDownloadProgress(data.progress)
      }
    } catch (err) {
      console.error("Error checking download status:", err)
    }
  }

  useEffect(() => {
    loadStatus()
    checkDownloadStatus()

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return "N/A"

    const date = new Date(isoDate)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const formatNumber = (num: number | null) => {
    if (num === null) return "N/A"
    return new Intl.NumberFormat("en-US").format(num)
  }

  return (
    <>
      <Nav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">System Status</h1>
          <p className="text-muted-foreground">
            Database connection status and dataset information
          </p>
        </div>

        {loading && !status && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading status...</div>
            </CardContent>
          </Card>
        )}

        {error && !status && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-destructive">Error: {error}</div>
            </CardContent>
          </Card>
        )}

        {status && (
          <div className="space-y-6">
            {/* Download Manager - Show if datasets are missing */}
            {status.availableDatasets < status.totalDatasets && (
              <Card className="border-orange-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-6 w-6 text-orange-500" />
                      <div>
                        <CardTitle>Data Download Required</CardTitle>
                        <CardDescription>
                          {status.totalDatasets - status.availableDatasets} dataset(s) missing - download required
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={startDownload}
                      disabled={downloading}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          Download Datasets
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">
                      This will download RDW datasets from the official Open Data API.
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Total download size: ~5-10 GB (varies by dataset)</li>
                      <li>Download time: 15-60 minutes (depending on connection speed)</li>
                      <li>Downloads happen in parallel for faster completion</li>
                      <li>Existing files are automatically skipped</li>
                      <li><strong>Delta downloads:</strong> Files are only re-downloaded if updated on the server</li>
                    </ul>
                  </div>

                  {downloading && downloadProgress && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="font-medium">Download in progress...</span>
                      </div>
                      {downloadProgress.lastOutput && (
                        <div className="text-xs font-mono bg-background p-2 rounded mt-2">
                          {downloadProgress.lastOutput}
                        </div>
                      )}
                      {downloadProgress.error && (
                        <div className="text-xs text-destructive mt-2">
                          Error: {downloadProgress.error}
                        </div>
                      )}
                    </div>
                  )}

                  {downloadProgress?.completed && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">
                        Download completed! Refresh the page to see updated status.
                      </span>
                      <Button
                        onClick={loadStatus}
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Database Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle>Database Connection</CardTitle>
                <CardDescription>DuckDB backend server status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Database Type</div>
                    <div className="font-medium">{status.database.type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Backend URL</div>
                    <div className="font-medium font-mono text-sm">
                      {status.database.backend.url}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Connection Status</div>
                    <div>
                      {status.database.backend.connected ? (
                        <Badge className="bg-green-500 hover:bg-green-600">Connected</Badge>
                      ) : (
                        <Badge variant="destructive">Disconnected</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Last Checked</div>
                    <div className="font-medium text-sm">{formatDate(status.lastChecked)}</div>
                  </div>
                </div>

                {status.error && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="text-sm text-destructive font-medium">Error</div>
                    <div className="text-sm text-destructive/80">{status.error}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dataset Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Datasets Overview</CardTitle>
                <CardDescription>
                  {status.availableDatasets} of {status.totalDatasets} datasets available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold">{status.totalDatasets}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Datasets</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {status.availableDatasets}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Available</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">
                      {status.totalDatasets - status.availableDatasets}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Missing</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold">
                      {status.datasets
                        .filter((d) => d.exists && d.recordCount)
                        .reduce((sum, d) => sum + (d.recordCount || 0), 0)
                        .toLocaleString("en-US", { notation: "compact" })}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Total Records (est.)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Datasets Table */}
            <Card>
              <CardHeader>
                <CardTitle>Dataset Details</CardTitle>
                <CardDescription>Individual dataset information and last update times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dataset ID</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead className="text-right">Records (est.)</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {status.datasets.map((dataset) => (
                        <TableRow key={dataset.id}>
                          <TableCell className="font-mono text-sm">{dataset.id}</TableCell>
                          <TableCell className="font-medium">{dataset.filename}</TableCell>
                          <TableCell>
                            {dataset.exists ? (
                              <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>
                            ) : (
                              <Badge variant="destructive">Missing</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{dataset.size}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(dataset.recordCount)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(dataset.lastModified)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Refresh Info */}
            <div className="text-center text-sm text-muted-foreground">
              Auto-refreshes every 30 seconds • Last update: {formatDate(status.lastChecked)}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
