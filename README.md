# 🚢 Export Oversea Cost

All-in sea freight rate search and comparison system built for **Perkin Logistics (Thailand)** — comparing ocean freight and Thailand local charges across **18 shipping lines** and **800+ destination ports (1,847 active routes)**, with AI PDF parsing to extract carrier rate tables and remarks automatically.

> 📖 **คู่มือฉบับเต็ม:** โปรดอ่านรายละเอียดทั้งหมดได้ที่ [README.md หลักของโปรเจกต์](../README.md) ซึ่งมีทั้ง:
> 1. **คู่มือสำหรับผู้ใช้งานทั่วไป (User Guide):** วิธีการค้นหา, การคำนวณ 20'/40'/40'HC, การคัดลอกตารางลง Excel, และการอัปเดตราคาจาก PDF ด้วย AI
> 2. **คู่มือสำหรับนักพัฒนา (Developer Setup & Architecture):** การตั้งค่า `.env.local`, การจัดการ Supabase Cloud, การต่อ Local PostgreSQL (Dual-Write), และคำอธิบาย API

## Key Features

- **Route & Carrier Search:** Filter by origin port (POL), 800+ destination ports (POD), and shipping lines (COSCO, HMM, PIL, RCL, Heung-A, CK Line, Interasia, Namsung, CULines, ESL, and more).
- **Carrier-Only Search:** Filter directly by shipping line to view full rate sheets without requiring a destination query.
- **Container & Equipment Selection:** Supports 20' Standard, 40' Standard, 40' High Cube, plus Dry / Reefer / Special, SOC, and Hazardous (DG) flags.
- **Tariff Table & Excel Export:** Switch between Card View and Logistics Table View with one-click 13-column Excel clipboard export.
- **AI PDF Rate Extraction (/api/parse-pdf):** Upload carrier PDF rate sheets via PdfUploaderModal to extract structured freight rates, validity cycles, and carrier remarks automatically.
- **Validity & Remarks Viewer:** Tracks active rate cycles and displays carrier-specific terms and surcharges (RemarksModal).

## Tech Stack

- **Framework:** Next.js 16 (App Router) · React 19 · TypeScript
- **Database:** Supabase Cloud (Dual-write with PostgreSQL)
- **UI:** Tailwind CSS · Lucide Icons

## Getting Started

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. รันโหมด Development
npm run dev

# 3. รันโหมด Production Build
npm run build
npm run start
```

เปิดใช้งานได้ที่: [http://localhost:3000](http://localhost:3000)
