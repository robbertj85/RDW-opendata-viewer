import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Fetch schema from the unified DuckDB view
    const response = await fetch("http://localhost:3001/schema/unified")

    if (!response.ok) {
      throw new Error("Failed to fetch schema from backend")
    }

    const columns = await response.json()
    return NextResponse.json(columns)
  } catch (error: any) {
    console.error("Schema fetch error:", error)

    // Fallback to basic columns if backend is unavailable
    const fallbackColumns = [
      { name: "kenteken", type: "VARCHAR" },
      { name: "merk", type: "VARCHAR" },
      { name: "handelsbenaming", type: "VARCHAR" },
      { name: "voertuigsoort", type: "VARCHAR" },
      { name: "eerste_kleur", type: "VARCHAR" },
      { name: "catalogusprijs", type: "INTEGER" },
    ]

    return NextResponse.json(fallbackColumns)
  }
}
