# Export Oversea Cost

All-in sea freight rate search and comparison system built for **Perkin Logistics (Thailand)** â€” comparing ocean freight and Thailand local charges across **18 shipping lines** and **600+ destination ports**, with AI PDF parsing to extract carrier rate tables and remarks automatically.



## Key Features

- **Route & Carrier Search:** Filter by origin port (POL), 600+ destination ports (POD), and shipping lines (COSCO, HMM, PIL, RCL, Heung-A, CK Line, Interasia, Namsung, CULines, ESL, and more).
- **Container & Equipment Selection:** Supports 20' Standard, 40' Standard, 40' High Cube, and 45' High Cube, plus Dry / Reefer / Special (OT/FR), SOC, and Hazardous (DG) flags.
- **AI PDF Rate Extraction (/api/parse-pdf):** Upload carrier PDF rate sheets via PdfUploaderModal to extract structured freight rates, validity cycles, and carrier remarks automatically.
- **Validity & Remarks Viewer:** Tracks active rate cycles and displays carrier-specific terms and surcharges (RemarksModal).

## Tech Stack

- **Framework:** Next.js 16 (App Router) Â· React 19 Â· TypeScript
- **Database:** Supabase
- **UI:** Tailwind CSS Â· Lucide Icons

## Getting Started

```bash
npm install
npm run dev
```

