"use client"

import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Loader2, Car, Copy, FileJson, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface VehicleData {
  [key: string]: any
}

export default function KentekenPage() {
  const [kenteken, setKenteken] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VehicleData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    if (!kenteken.trim()) {
      setError("Please enter a license plate (kenteken)")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`http://localhost:3001/kenteken/${encodeURIComponent(kenteken.trim().toUpperCase())}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.result || data.result.length === 0) {
        throw new Error("Vehicle not found")
      }

      setResult(data.result[0])
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching data")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLookup()
    }
  }

  const copyToClipboard = (format: "json" | "text" | "csv") => {
    if (!result) return

    let text = ""

    if (format === "json") {
      text = JSON.stringify(result, null, 2)
    } else if (format === "text") {
      text = Object.entries(result)
        .map(([key, value]) => `${key}: ${value ?? "-"}`)
        .join("\n")
    } else if (format === "csv") {
      text = Object.entries(result)
        .map(([key, value]) => `"${key}","${value ?? ""}"`)
        .join("\n")
    }

    navigator.clipboard.writeText(text)
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "-"
    if (typeof value === "boolean") return value ? "Yes" : "No"
    return String(value)
  }

  return (
    <>
      <Nav />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">License Plate Lookup</h1>
            <p className="text-muted-foreground">
              Search for a vehicle by license plate to view all available registration data
            </p>
          </div>

          {/* Search Card */}
          <Card>
            <CardHeader>
              <CardTitle>Search Vehicle</CardTitle>
              <CardDescription>
                Enter a Dutch license plate number (kenteken)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="e.g., 12-ABC-3 or 12ABC3"
                    value={kenteken}
                    onChange={(e) => setKenteken(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="uppercase text-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Formats: XX-XX-XX, XX-XXX-X, or continuous (XXXXXX)
                  </p>
                </div>
                <Button
                  onClick={handleLookup}
                  disabled={loading}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Car className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-mono">{result.kenteken}</CardTitle>
                      <CardDescription>
                        {Object.keys(result).length} fields available
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard("text")}
                      title="Copy as text"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Text
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard("csv")}
                      title="Copy as CSV"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard("json")}
                      title="Copy as JSON"
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(result).map(([key, value], index) => (
                    <div
                      key={key}
                      className="grid grid-cols-12 gap-4 py-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                    >
                      <div className="col-span-1 flex items-start justify-end pr-2">
                        <span className="text-xs font-semibold text-muted-foreground/60">
                          {index + 1}
                        </span>
                      </div>
                      <div className="col-span-5">
                        <p className="font-mono text-sm font-medium text-muted-foreground break-words">
                          {key}
                        </p>
                      </div>
                      <div className="col-span-6">
                        <p className="font-mono text-sm break-all">
                          {formatValue(value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!result && !error && !loading && (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-muted rounded-full">
                    <Car className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">No vehicle data yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter a license plate number above to search
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  )
}
