import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("http://localhost:3001/info")
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch dataset info" },
      { status: 500 }
    )
  }
}
