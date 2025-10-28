"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Loader2, Table as TableIcon, Copy, X } from "lucide-react"

interface QueryResult {
  columns: string[]
  data: Record<string, any>[]
}

interface Field {
  name: string
  type: string
}

export default function ViewerPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [column, setColumn] = useState("")
  const [columnInput, setColumnInput] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [pivot, setPivot] = useState("")
  const [pivotInput, setPivotInput] = useState("")
  const [showPivotSuggestions, setShowPivotSuggestions] = useState(false)
  const [limit, setLimit] = useState("1000")
  const [queryType, setQueryType] = useState<"unique" | "count">("unique")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFields()
  }, [])

  const loadFields = async () => {
    try {
      const response = await fetch("/api/schema")
      const data = await response.json()
      setFields(data)
    } catch (err) {
      console.error("Error loading fields:", err)
    }
  }

  const filteredFields = fields.filter((field) =>
    field.name.toLowerCase().includes(columnInput.toLowerCase())
  )

  const filteredPivotFields = fields.filter((field) =>
    field.name.toLowerCase().includes(pivotInput.toLowerCase())
  )

  const handleColumnSelect = (fieldName: string) => {
    setColumn(fieldName)
    setColumnInput(fieldName)
    setShowSuggestions(false)
  }

  const handlePivotSelect = (fieldName: string) => {
    setPivot(fieldName)
    setPivotInput(fieldName)
    setShowPivotSuggestions(false)
  }

  const handleQuery = async () => {
    if (!column) {
      setError("Please select a column")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          column,
          pivot: pivot || undefined,
          limit: parseInt(limit),
          queryType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching data")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <>
      <Nav />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">Data Viewer</h1>
            <p className="text-muted-foreground">
              Query unified RDW vehicle registration data across all datasets
            </p>
          </div>

          {/* Query Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Query Builder</CardTitle>
              <CardDescription>
                Select a column to explore data from the unified vehicle database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium">
                      Column ({fields.length} available)
                    </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search columns..."
                      value={columnInput}
                      onChange={(e) => {
                        setColumnInput(e.target.value)
                        setShowSuggestions(true)
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="pl-10"
                    />
                  </div>
                  {showSuggestions && columnInput && filteredFields.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredFields.slice(0, 20).map((field) => (
                        <div
                          key={field.name}
                          onClick={() => handleColumnSelect(field.name)}
                          className="px-4 py-2 hover:bg-secondary cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-mono text-sm">{field.name}</span>
                          <span className="text-xs text-muted-foreground">{field.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {column && (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="font-mono">{column}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2 relative">
                  <label className="text-sm font-medium">
                    Pivot By (Optional)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search pivot field..."
                      value={pivotInput}
                      onChange={(e) => {
                        setPivotInput(e.target.value)
                        setShowPivotSuggestions(true)
                      }}
                      onFocus={() => setShowPivotSuggestions(true)}
                      className="pl-10 pr-10"
                    />
                    {pivot && (
                      <button
                        onClick={() => {
                          setPivot("")
                          setPivotInput("")
                        }}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        aria-label="Clear pivot field"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {showPivotSuggestions && pivotInput && filteredPivotFields.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredPivotFields.slice(0, 20).map((field) => (
                        <div
                          key={field.name}
                          onClick={() => handlePivotSelect(field.name)}
                          className="px-4 py-2 hover:bg-secondary cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-mono text-sm">{field.name}</span>
                          <span className="text-xs text-muted-foreground">{field.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {pivot && (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="font-mono">{pivot}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Query Type</label>
                  <Select
                    value={queryType}
                    onChange={(e) => {
                      setQueryType(e.target.value as any)
                      setError(null)
                    }}
                  >
                    <option value="unique">Unique Values</option>
                    <option value="count">Count by Value</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Limit</label>
                  <Select
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                  >
                    <option value="100">100</option>
                    <option value="500">500</option>
                    <option value="1000">1,000</option>
                    <option value="5000">5,000</option>
                    <option value="10000">10,000</option>
                    <option value="50000">50,000</option>
                    <option value="100000">100,000</option>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleQuery}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Execute Query
                  </>
                )}
              </Button>
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
                  <div>
                    <CardTitle>Results</CardTitle>
                    <CardDescription>
                      {result.data.length.toLocaleString()} records found
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        {result.columns.map((col) => (
                          <TableHead key={col} className="font-semibold bg-primary text-primary-foreground">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.data.map((row, idx) => (
                        <TableRow key={idx}>
                          {result.columns.map((col) => (
                            <TableCell key={col} className="font-mono text-xs">
                              {row[col]?.toString() || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                    <TableIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">No data yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Start typing to search for a column, then execute a query
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
