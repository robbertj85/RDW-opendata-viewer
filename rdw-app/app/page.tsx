import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Nav } from "@/components/nav"
import { Database, Table, BarChart3, Search, Filter, Sparkles } from "lucide-react"

export default function Home() {
  return (
    <>
      <Nav />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              RDW Open Data Analytics
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Modern analytics dashboard for exploring Dutch vehicle registration data
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="h-6 w-6" />
                  </div>
                  <CardTitle>Data Viewer</CardTitle>
                </div>
                <CardDescription>
                  Query and explore vehicle registration data with powerful filtering and search capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-center space-x-2">
                    <Search className="h-4 w-4" />
                    <span>Search by license plate or VIN</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span>Filter by make, model, fuel type</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Count and aggregate data</span>
                  </li>
                </ul>
                <Link href="/viewer">
                  <Button className="w-full">Open Data Viewer</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Table className="h-6 w-6" />
                  </div>
                  <CardTitle>Pivot Table</CardTitle>
                </div>
                <CardDescription>
                  Create dynamic pivot tables with drag-and-drop interface for advanced analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Drag-and-drop interface</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Multiple aggregation types</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span>Dynamic filtering</span>
                  </li>
                </ul>
                <Link href="/pivot">
                  <Button className="w-full" variant="secondary">Open Pivot Table</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Records</CardDescription>
                <CardTitle className="text-3xl">15M+</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Datasets</CardDescription>
                <CardTitle className="text-3xl">5+</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Data Size</CardDescription>
                <CardTitle className="text-3xl">~10 GB</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Info Section */}
          <Card>
            <CardHeader>
              <CardTitle>About the Data</CardTitle>
              <CardDescription>
                This application provides access to the RDW (Netherlands Vehicle Authority) open data,
                including information about registered vehicles, fuel consumption, emissions, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                All datasets are linked via the <code className="bg-muted px-1.5 py-0.5 rounded">kenteken</code> (license plate)
                field, allowing for cross-dataset analysis and comprehensive vehicle insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
