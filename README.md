# Export Oversea Cost

All-in sea freight rate search and comparison system built for **Perkin Logistics (Thailand)** â€” comparing ocean freight and Thailand local charges across **18 shipping lines** and **600+ destination ports**, with AI PDF parsing to extract carrier rate tables and remarks automatically.

à¸£à¸°à¸šà¸šà¸ªà¸·à¸šà¸„à¹‰à¸™à¹à¸¥à¸°à¹€à¸›à¸£à¸µà¸¢à¸šà¹€à¸—à¸µà¸¢à¸šà¸­à¸±à¸•à¸£à¸²à¸„à¹ˆà¸²à¸£à¸°à¸§à¸²à¸‡à¹€à¸£à¸·à¸­à¸ªà¹ˆà¸‡à¸­à¸­à¸ (Ocean Freight + Local Charges à¹à¸šà¸š All-In) à¸žà¸£à¹‰à¸­à¸¡à¸£à¸°à¸šà¸š AI à¸ªà¸à¸±à¸”à¸•à¸²à¸£à¸²à¸‡à¸£à¸²à¸„à¸²à¹à¸¥à¸°à¸‚à¹‰à¸­à¸à¸³à¸«à¸™à¸” (Remarks) à¸ˆà¸²à¸à¹„à¸Ÿà¸¥à¹Œ PDF à¸ªà¸²à¸¢à¹€à¸£à¸·à¸­à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´

**Live Demo:** https://exportoverseacost.vercel.app


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

Open [http://localhost:3000](http://localhost:3000) in your browser.