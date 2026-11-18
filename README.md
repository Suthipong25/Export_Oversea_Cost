# Export Oversea Cost

All-in sea freight rate search and comparison system built for **Perkin Logistics (Thailand)** — comparing ocean freight and Thailand local charges across **18 shipping lines** and **600+ destination ports**, with AI PDF parsing to extract carrier rate tables and remarks automatically.

ระบบสืบค้นและเปรียบเทียบอัตราค่าระวางเรือส่งออก (Ocean Freight + Local Charges แบบ All-In) พร้อมระบบ AI สกัดตารางราคาและข้อกำหนด (Remarks) จากไฟล์ PDF สายเรืออัตโนมัติ

**Live Demo:** https://exportoverseacost.vercel.app

<p align="center">
  <img src="https://raw.githubusercontent.com/Suthipong25/Suthipong25/main/assets/preview-export-cost.png" alt="Export Oversea Cost UI" width="100%" />
</p>

## Key Features

- **Route & Carrier Search:** Filter by origin port (POL), 600+ destination ports (POD), and shipping lines (COSCO, HMM, PIL, RCL, Heung-A, CK Line, Interasia, Namsung, CULines, ESL, and more).
- **Container & Equipment Selection:** Supports 20' Standard, 40' Standard, 40' High Cube, and 45' High Cube, plus Dry / Reefer / Special (OT/FR), SOC, and Hazardous (DG) flags.
- **AI PDF Rate Extraction (/api/parse-pdf):** Upload carrier PDF rate sheets via PdfUploaderModal to extract structured freight rates, validity cycles, and carrier remarks automatically.
- **Validity & Remarks Viewer:** Tracks active rate cycles and displays carrier-specific terms and surcharges (RemarksModal).

## Tech Stack

- **Framework:** Next.js 16 (App Router) · React 19 · TypeScript
- **Database:** Supabase
- **UI:** Tailwind CSS · Lucide Icons

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.