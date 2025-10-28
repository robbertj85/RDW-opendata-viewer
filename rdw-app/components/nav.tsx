"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Database, Table, Home, Activity, Car } from "lucide-react"
import { cn } from "@/lib/utils"

export function Nav() {
  const pathname = usePathname()

  const routes = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/viewer",
      label: "Data Viewer",
      icon: Database,
      active: pathname === "/viewer",
    },
    {
      href: "/pivot",
      label: "Pivot Table",
      icon: Table,
      active: pathname === "/pivot",
    },
    {
      href: "/kenteken",
      label: "License Plate",
      icon: Car,
      active: pathname === "/kenteken",
    },
    {
      href: "/status",
      label: "Status",
      icon: Activity,
      active: pathname === "/status",
    },
  ]

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6" />
            <span className="text-xl font-bold">RDW Analytics</span>
          </div>
          <div className="flex items-center space-x-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  route.active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground"
                )}
              >
                <route.icon className="h-4 w-4" />
                <span>{route.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
