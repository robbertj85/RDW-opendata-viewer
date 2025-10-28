# RDW Data Analytics - Next.js Application

A modern, professional analytics dashboard for exploring Dutch RDW (Netherlands Vehicle Authority) open data, built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Data Viewer**: Query and explore vehicle registration data with powerful filtering
- **Pivot Table**: Create dynamic pivot tables with intuitive drag-and-drop interface
- **Modern UI**: Clean, professional design with minimal colors and clear sections
- **Type-Safe**: Built with TypeScript for better developer experience
- **Responsive**: Works seamlessly across desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Icons**: Lucide React

## Getting Started

### Prerequisites

Make sure the backend server is running:
```bash
# In the parent directory
node local-query-server-duckdb.js
```

The backend should be running on `http://localhost:3001`.

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Build the application
npm run build

# Start the production server
npm run start
```

## Project Structure

```
rdw-app/
├── app/
│   ├── api/                 # API routes (proxy to backend)
│   │   ├── info/
│   │   ├── pivot-advanced/
│   │   └── query/
│   ├── viewer/              # Data viewer page
│   ├── pivot/               # Pivot table page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   └── badge.tsx
│   └── nav.tsx              # Navigation component
├── lib/
│   └── utils.ts             # Utility functions
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── package.json

```

## Available Pages

### Home (`/`)
Landing page with feature overview and quick navigation to main tools.

### Data Viewer (`/viewer`)
- Query vehicle registration data
- Filter by dataset and column
- Multiple query types (unique values, counts, pivot)
- Export results as JSON

### Pivot Table (`/pivot`)
- Drag-and-drop interface for building pivot tables
- Configure rows, columns, and aggregations
- Multiple aggregation types (count, sum, average, min, max)
- Real-time results with execution time

## API Routes

The Next.js API routes act as a proxy to the backend server:

- `GET /api/info` - Fetch dataset metadata
- `POST /api/pivot-advanced` - Generate pivot tables
- `POST /api/query` - Execute data queries

## Design Philosophy

This application follows a clean, modern design approach:

- **Minimal Colors**: Professional grayscale palette with subtle accents
- **Clear Sections**: Well-defined card-based layout
- **Consistent Spacing**: Uniform padding and margins throughout
- **Readable Typography**: Clear hierarchy and legible text sizes
- **Accessible**: High contrast and keyboard navigation support

## Development

### Adding New Components

Use shadcn/ui CLI to add more components:

```bash
npx shadcn@latest add [component-name]
```

### Customizing Theme

Edit `app/globals.css` to customize the color scheme using CSS variables.

## License

ISC
