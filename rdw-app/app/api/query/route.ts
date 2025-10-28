import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { column, pivot, limit, queryType, kenteken } = body

    // Handle license plate lookup
    if (queryType === "kenteken") {
      if (!kenteken) {
        return NextResponse.json(
          { error: "License plate (kenteken) is required" },
          { status: 400 }
        )
      }

      const backendUrl = `http://localhost:3001/kenteken/${encodeURIComponent(kenteken)}`
      const response = await fetch(backendUrl)

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          { error: `Backend error: ${response.statusText} - ${errorText}` },
          { status: response.status }
        )
      }

      const data = await response.json()
      const records = data.result || data.data || data || []
      const columns = records.length > 0 ? Object.keys(records[0]) : []

      return NextResponse.json({
        columns,
        data: records,
      })
    }

    // Validate column for non-kenteken queries
    if (!column) {
      return NextResponse.json(
        { error: "Column is required" },
        { status: 400 }
      )
    }

    // Use unified view endpoint
    const limitNum = parseInt(limit) || 1000
    const operation = queryType === "unique" ? "unique" : "count"

    let backendUrl = `http://localhost:3001/unified/${encodeURIComponent(column)}?operation=${operation}&limit=${limitNum}`

    // Add pivot parameter if provided
    if (pivot) {
      backendUrl += `&pivot=${encodeURIComponent(pivot)}`
    }

    const response = await fetch(backendUrl)

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Backend error: ${response.statusText} - ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Transform the response to a consistent format
    const records = data.result || data.data || data || []
    const columns = records.length > 0 ? Object.keys(records[0]) : []

    return NextResponse.json({
      columns,
      data: records,
    })
  } catch (error: any) {
    console.error("Query error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to execute query" },
      { status: 500 }
    )
  }
}
