"use client"

import { useState, useEffect } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { GripVertical, X, Loader2, Table as TableIcon, Play, Trash2, Search, Plus, Filter, Copy } from "lucide-react"

interface Field {
  name: string
  type?: string
}

interface FilterRule {
  id: string
  field: string
  operator: string
  value: string
  value2?: string // For BETWEEN operator
  fieldSearch?: string
  showFieldSuggestions?: boolean
}

interface PivotConfig {
  rows: string[]
  columns: string[]
  aggregation: string
  aggColumn: string
  filters: FilterRule[]
}

interface PivotResult {
  data: Record<string, any>[]
  metadata: {
    executionTime: string
    sql?: string
    totalRecords?: number
  }
}

interface PivotedData {
  rowHeaders: string[]
  columnHeaders: string[]
  rows: Array<{
    rowValues: any[]
    cells: any[]
  }>
}

export default function PivotPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [filteredFields, setFilteredFields] = useState<Field[]>([])
  const [fieldSearch, setFieldSearch] = useState("")
  const [loadingFields, setLoadingFields] = useState(false)
  const [config, setConfig] = useState<PivotConfig>({
    rows: [],
    columns: [],
    aggregation: "COUNT_DISTINCT",
    aggColumn: "kenteken",
    filters: [],
  })
  const [draggedField, setDraggedField] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PivotResult | null>(null)
  const [pivotedData, setPivotedData] = useState<PivotedData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFields()
  }, [])

  useEffect(() => {
    // Filter fields based on search
    if (fieldSearch.trim() === "") {
      setFilteredFields(fields)
    } else {
      const searchLower = fieldSearch.toLowerCase()
      setFilteredFields(
        fields.filter((field) =>
          field.name.toLowerCase().includes(searchLower)
        )
      )
    }
  }, [fieldSearch, fields])

  const loadFields = async () => {
    setLoadingFields(true)
    try {
      const response = await fetch("/api/schema")
      if (!response.ok) {
        throw new Error("Failed to fetch schema")
      }
      const columns = await response.json()
      setFields(columns)
      setFilteredFields(columns)
    } catch (err: any) {
      console.error("Error loading fields:", err)
      // Fallback to a basic set if API fails
      const fallbackFields = [{ name: "kenteken" }, { name: "merk" }]
      setFields(fallbackFields)
      setFilteredFields(fallbackFields)
    } finally {
      setLoadingFields(false)
    }
  }

  const handleDragStart = (field: string) => {
    setDraggedField(field)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (zone: "rows" | "columns") => {
    if (!draggedField) return

    if (!config[zone].includes(draggedField)) {
      setConfig((prev) => ({
        ...prev,
        [zone]: [...prev[zone], draggedField],
      }))
    }
    setDraggedField(null)
  }

  const removeField = (zone: "rows" | "columns", field: string) => {
    setConfig((prev) => ({
      ...prev,
      [zone]: prev[zone].filter((f) => f !== field),
    }))
  }

  const addFilter = () => {
    const newFilter: FilterRule = {
      id: Date.now().toString(),
      field: "",
      operator: "equals",
      value: "",
      fieldSearch: "",
      showFieldSuggestions: false,
    }
    setConfig((prev) => ({
      ...prev,
      filters: [...prev.filters, newFilter],
    }))
  }

  const removeFilter = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.filter((f) => f.id !== id),
    }))
  }

  const updateFilter = (id: string, updates: Partial<FilterRule>) => {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }))
  }

  const transformToPivotTable = (data: Record<string, any>[]): PivotedData => {
    // If no columns, just display as a simple table
    if (config.columns.length === 0) {
      return {
        rowHeaders: config.rows,
        columnHeaders: ["Value"],
        rows: data.map(row => ({
          rowValues: config.rows.map(field => row[field]),
          cells: [row.value_0]
        }))
      }
    }

    // Extract unique column values (create column headers)
    const columnValuesSet = new Set<string>()
    data.forEach(row => {
      const colKey = config.columns.map(col => row[col]).join(" | ")
      columnValuesSet.add(colKey)
    })
    const columnHeaders = Array.from(columnValuesSet).sort()

    // Group data by row values
    const rowMap = new Map<string, Map<string, any>>()

    data.forEach(row => {
      const rowKey = config.rows.map(field => row[field]).join(" | ")
      const colKey = config.columns.map(col => row[col]).join(" | ")

      if (!rowMap.has(rowKey)) {
        rowMap.set(rowKey, new Map())
      }
      rowMap.get(rowKey)!.set(colKey, row.value_0)
    })

    // Build the pivoted rows
    const rows = Array.from(rowMap.entries()).map(([rowKey, colMap]) => {
      const rowValues = rowKey.split(" | ")
      const cells = columnHeaders.map(colHeader => colMap.get(colHeader) || 0)
      return { rowValues, cells }
    })

    return {
      rowHeaders: config.rows,
      columnHeaders,
      rows
    }
  }

  const handleRunPivot = async () => {
    if (config.rows.length === 0 && config.columns.length === 0) {
      setError("Please add at least one field to Rows or Columns")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/pivot-advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: config.rows,
          columns: config.columns,
          values: [{ column: config.aggColumn, aggregation: config.aggregation }],
          filters: config.filters,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)

      // Transform data to pivot table format
      if (data.data && data.data.length > 0) {
        const pivoted = transformToPivotTable(data.data)
        setPivotedData(pivoted)
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setConfig({
      rows: [],
      columns: [],
      aggregation: "COUNT_DISTINCT",
      aggColumn: "kenteken",
      filters: [],
    })
    setResult(null)
    setPivotedData(null)
    setError(null)
  }

  const getAnalysisDescription = () => {
    const parts = []

    if (config.rows.length > 0) {
      parts.push(config.rows.join(" × "))
    }

    if (config.columns.length > 0) {
      parts.push(config.columns.join(" × "))
    }

    const aggLabel = config.aggregation === "COUNT_DISTINCT" ? "COUNT DISTINCT" : config.aggregation
    parts.push(`${aggLabel}(${config.aggColumn})`)

    return parts.join(" by ")
  }

  const getTotalRecords = () => {
    if (!result || !result.data) return 0
    return result.data.length
  }

  const copyToClipboard = (data: any, format: 'json' | 'csv' | 'tsv' = 'json') => {
    if (!result) return

    let text = ''
    if (format === 'json') {
      text = JSON.stringify(data, null, 2)
    } else if (format === 'csv' || format === 'tsv') {
      const separator = format === 'csv' ? ',' : '\t'

      if (pivotedData) {
        // Create CSV/TSV from pivoted data
        const headers = [...pivotedData.rowHeaders, ...pivotedData.columnHeaders]
        text = headers.join(separator) + '\n'

        pivotedData.rows.forEach(row => {
          const rowData = [...row.rowValues, ...row.cells]
          text += rowData.join(separator) + '\n'
        })
      } else {
        // Fallback to raw data
        const headers = Object.keys(data[0] || {})
        text = headers.join(separator) + '\n'
        data.forEach((row: any) => {
          text += headers.map(h => row[h]).join(separator) + '\n'
        })
      }
    }

    navigator.clipboard.writeText(text)
  }

  return (
    <>
      <Nav />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">Pivot Table Analysis</h1>
            <p className="text-muted-foreground">
              Create dynamic pivot tables from unified RDW vehicle data
            </p>
          </div>

          {/* Configuration Section - Top */}
          <Card>
            <CardHeader>
              <CardTitle>Configure Pivot Table</CardTitle>
              <CardDescription>
                {loadingFields ? "Loading fields..." : `${fields.length} fields available`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-4 gap-6">
                {/* Available Fields */}
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-sm font-semibold">Available Fields</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search fields..."
                      value={fieldSearch}
                      onChange={(e) => setFieldSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2 bg-muted/30">
                    {loadingFields ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredFields.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No fields found
                      </p>
                    ) : (
                      filteredFields.map((field) => (
                        <div
                          key={field.name}
                          draggable
                          onDragStart={() => handleDragStart(field.name)}
                          className="flex items-center gap-2 p-2 bg-background rounded-md cursor-move hover:bg-accent transition-colors border"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{field.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Rows */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Rows</label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop("rows")}
                    className="min-h-[300px] border-2 border-dashed rounded-md p-3 space-y-2 bg-muted/20"
                  >
                    {config.rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">
                        Drop fields here
                      </p>
                    ) : (
                      config.rows.map((field) => (
                        <Badge
                          key={field}
                          variant="default"
                          className="flex items-center justify-between w-full"
                        >
                          <span>{field}</span>
                          <button
                            onClick={() => removeField("rows", field)}
                            className="ml-2 hover:bg-primary/20 rounded-sm p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Columns */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Columns</label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop("columns")}
                    className="min-h-[300px] border-2 border-dashed rounded-md p-3 space-y-2 bg-muted/20"
                  >
                    {config.columns.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">
                        Drop fields here
                      </p>
                    ) : (
                      config.columns.map((field) => (
                        <Badge
                          key={field}
                          variant="default"
                          className="flex items-center justify-between w-full"
                        >
                          <span>{field}</span>
                          <button
                            onClick={() => removeField("columns", field)}
                            className="ml-2 hover:bg-primary/20 rounded-sm p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Filters Section */}
              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters {config.filters.length > 0 && `(${config.filters.length})`}
                  </label>
                  <Button onClick={addFilter} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Filter
                  </Button>
                </div>

                {config.filters.length > 0 && (
                  <div className="space-y-2">
                    {config.filters.map((filter) => (
                      <div key={filter.id} className="flex gap-2 items-start p-3 bg-muted/30 rounded-md">
                        <div className="flex-1 grid grid-cols-12 gap-2">
                          {/* Field Selection with Autocomplete */}
                          <div className="col-span-4 relative">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="Search field..."
                                value={filter.fieldSearch || filter.field}
                                onChange={(e) => updateFilter(filter.id, {
                                  fieldSearch: e.target.value,
                                  showFieldSuggestions: true
                                })}
                                onFocus={() => updateFilter(filter.id, { showFieldSuggestions: true })}
                                onBlur={() => setTimeout(() => updateFilter(filter.id, { showFieldSuggestions: false }), 200)}
                                className="pl-8"
                              />
                            </div>
                            {filter.showFieldSuggestions && filter.fieldSearch && (
                              <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {fields
                                  .filter((f) => f.name.toLowerCase().includes((filter.fieldSearch || '').toLowerCase()))
                                  .slice(0, 20)
                                  .map((field) => (
                                    <div
                                      key={field.name}
                                      onMouseDown={() => updateFilter(filter.id, {
                                        field: field.name,
                                        fieldSearch: field.name,
                                        showFieldSuggestions: false
                                      })}
                                      className="px-4 py-2 hover:bg-secondary cursor-pointer flex justify-between items-center"
                                    >
                                      <span className="font-mono text-sm">{field.name}</span>
                                      <span className="text-xs text-muted-foreground">{field.type}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Operator Selection */}
                          <div className="col-span-3">
                            <Select
                              value={filter.operator}
                              onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                            >
                              <option value="equals">Equals (=)</option>
                              <option value="not_equals">Not Equals (≠)</option>
                              <option value="greater_than">Greater Than (&gt;)</option>
                              <option value="less_than">Less Than (&lt;)</option>
                              <option value="greater_or_equal">Greater or Equal (≥)</option>
                              <option value="less_or_equal">Less or Equal (≤)</option>
                              <option value="between">Between</option>
                              <option value="contains">Contains</option>
                              <option value="starts_with">Starts With</option>
                              <option value="ends_with">Ends With</option>
                            </Select>
                          </div>

                          {/* Value Input(s) */}
                          {filter.operator === "between" ? (
                            <>
                              <div className="col-span-2">
                                <Input
                                  type="text"
                                  placeholder="Min"
                                  value={filter.value}
                                  onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="text"
                                  placeholder="Max"
                                  value={filter.value2 || ""}
                                  onChange={(e) => updateFilter(filter.id, { value2: e.target.value })}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="col-span-4">
                              <Input
                                type="text"
                                placeholder="Value"
                                value={filter.value}
                                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                              />
                            </div>
                          )}
                        </div>

                        {/* Remove Filter Button */}
                        <Button
                          onClick={() => removeFilter(filter.id)}
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Aggregation and Actions */}
              <div className="grid lg:grid-cols-4 gap-6 mt-6 pt-6 border-t">
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-sm font-semibold">Aggregation Type</label>
                  <Select
                    value={config.aggregation}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, aggregation: e.target.value }))
                    }
                  >
                    <option value="COUNT_DISTINCT">Count Unique</option>
                    <option value="COUNT">Count All</option>
                    <option value="SUM">Sum</option>
                    <option value="AVG">Average</option>
                    <option value="MIN">Minimum</option>
                    <option value="MAX">Maximum</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Aggregation Column</label>
                  <Select
                    value={config.aggColumn}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, aggColumn: e.target.value }))
                    }
                  >
                    {fields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold opacity-0">Actions</label>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRunPivot}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleClear}
                      variant="outline"
                      size="icon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section - Bottom */}
          <div>
              {error && (
                <Card className="border-destructive mb-6">
                  <CardContent className="pt-6">
                    <p className="text-destructive">{error}</p>
                  </CardContent>
                </Card>
              )}

              {result && pivotedData && (
                <>
                  {/* Analysis Summary */}
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold text-muted-foreground">Total Records</label>
                          <p className="text-2xl font-bold">{getTotalRecords().toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-muted-foreground">Execution Time</label>
                          <p className="text-2xl font-bold">{result.metadata.executionTime}s</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-muted-foreground">Analysis</label>
                        <p className="text-base font-mono mt-1 p-2 bg-muted/30 rounded">{getAnalysisDescription()}</p>
                      </div>

                      {result.metadata.sql && (
                        <div>
                          <label className="text-sm font-semibold text-muted-foreground">SQL Query</label>
                          <pre className="text-xs font-mono mt-1 p-3 bg-muted/30 rounded overflow-x-auto">
                            {result.metadata.sql}
                          </pre>
                        </div>
                      )}

                      {config.filters.length > 0 && (
                        <div>
                          <label className="text-sm font-semibold text-muted-foreground">Active Filters</label>
                          <div className="mt-1 space-y-1">
                            {config.filters.map((filter, idx) => (
                              <p key={idx} className="text-sm font-mono p-2 bg-muted/30 rounded">
                                {filter.field} {filter.operator} {filter.value}{filter.value2 ? ` and ${filter.value2}` : ''}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pivot Table Results */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Pivot Table Results</CardTitle>
                          <CardDescription>
                            {pivotedData.rows.length.toLocaleString()} rows × {pivotedData.columnHeaders.length.toLocaleString()} columns
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(result.data, 'csv')}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(result.data, 'tsv')}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy TSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(result.data, 'json')}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy JSON
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                    <div className="border rounded-md max-h-[600px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {pivotedData.rowHeaders.map((header) => (
                              <TableHead key={header} className="font-semibold bg-muted sticky left-0">
                                {header}
                              </TableHead>
                            ))}
                            {pivotedData.columnHeaders.map((header) => (
                              <TableHead key={header} className="font-semibold text-right">
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pivotedData.rows.map((row, idx) => (
                            <TableRow key={idx}>
                              {row.rowValues.map((value, colIdx) => (
                                <TableCell key={colIdx} className="font-medium bg-muted sticky left-0">
                                  {value || "-"}
                                </TableCell>
                              ))}
                              {row.cells.map((cell, cellIdx) => (
                                <TableCell key={cellIdx} className="text-right font-mono">
                                  {Number(cell).toLocaleString()}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
                </>
              )}

              {!result && !error && !loading && (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-muted rounded-full">
                        <TableIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold">No pivot table yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Drag fields to Rows and Columns, configure aggregation, and generate your pivot table
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </main>
    </>
  )
}
