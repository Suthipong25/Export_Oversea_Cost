# 🗄️ Database Directory

โฟลเดอร์สำหรับจัดเก็บ Schema, Master Database Data และสคริปต์สำหรับการติดตั้งฐานข้อมูล

---

## 📁 ไฟล์สำคัญในโฟลเดอร์นี้

| ไฟล์ | ขนาด | ประเภท | คำอธิบาย |
| :--- | :---: | :---: | :--- |
| **`all_rates_database.json`** | ~745 KB | JSON | **Master Database:** รวบรวมเรทค่าระวางเรือทั้งหมด 1,267 รายการ, 603 ท่าเรือ, 19 สายเรือ พร้อม Carrier Knowledge Base |
| **`init_local_postgres.sql`** | ~765 KB | SQL Dump | **Local PostgreSQL Installer:** สคริปต์ DDL + Data Inserts สำเร็จรูป สำหรับนำไปรันบน PostgreSQL เครื่องอื่นในวง LAN ได้ทันที |
| **`01_initial_schema.sql`** | ~8 KB | SQL Schema | สคริปต์ DDL โครงสร้างตารางต้นแบบบน Supabase Cloud PostgreSQL (`carriers`, `ports`, `freight_rates`, `local_charges`) |
| **`Export_Shipping_Rates.xlsx`** | ~82 KB | Excel | ตารางข้อมูลอัตราค่าระวางเรือตั้งต้นในรูปแบบสเปรดชีต Excel |
| **`raw_extracted/`** | Directory | Folder | โฟลเดอร์สำรองสำหรับจัดเก็บไฟล์ JSON ดิบที่สกัดมาจากเอกสารสายเรือ |
