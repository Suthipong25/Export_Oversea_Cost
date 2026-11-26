# 🚢 Export Oversea Cost

All-in sea freight rate search and comparison system built for **Perkin Logistics (Thailand)** — comparing ocean freight and Thailand local charges across **18 shipping lines** and **800+ destination ports (1,847 active routes)**, with AI PDF parsing to extract carrier rate tables and remarks.

## Key Features

- **Route & Carrier Search:** Filter by origin port (POL), destination port (POD), and shipping line.
- **Carrier-Only Search:** View a carrier's full rate sheet without entering a destination.
- **Container Selection:** Supports 20' Standard, 40' Standard, 40' High Cube, Dry / Reefer / Special, SOC, and Hazardous (DG).
- **Tariff Table & Excel Export:** Switch between card and table views, with one-click 13-column clipboard export.
- **AI PDF Rate Extraction:** Upload carrier rate sheets to extract freight rates, validity cycles, and remarks.
- **Validity & Remarks Viewer:** Review active rate cycles and carrier-specific surcharges and terms.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** Supabase Cloud with PostgreSQL dual-write
- **UI:** Tailwind CSS, Lucide Icons

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To create a production build, run `npm run build`.
