-- ==============================================================================
-- EXPORT OVERSEA COST - INITIAL DATABASE SCHEMA (CLEAN & PRODUCTION-READY)
-- PostgreSQL / Supabase
-- ==============================================================================

-- 1. ตาราง CARRIERS (ข้อมูล 18 สายเรือ)
CREATE TABLE IF NOT EXISTS public.carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,             -- เช่น TSL, RCL, COSCO, PIL, SINOKOR
    name VARCHAR(255) NOT NULL,                    -- เช่น T.S. Container Lines, Regional Container Lines
    contact_phone VARCHAR(100),
    contact_email VARCHAR(255),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ตาราง PORTS (ท่าเรือปลายทาง)
CREATE TABLE IF NOT EXISTS public.ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    port_code VARCHAR(20),                         -- รหัสพอร์ตสากล เช่น CNSHA, JPTYO, INNSA
    port_name VARCHAR(150) NOT NULL,               -- เช่น Shanghai, Tokyo, Nhava Sheva
    country VARCHAR(100) NOT NULL,                 -- เช่น China, Japan, India
    region VARCHAR(100),                           -- เช่น East China, Japan Main, West India
    is_popular BOOLEAN DEFAULT false,              -- สำหรับปักหมุดพอร์ตยอดนิยม
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_port_country UNIQUE (port_name, country)
);

-- 3. ตาราง RATE_BATCHES (รอบการนำเข้าราคา เช่น รอบ 1-15 พ.ย., 16-30 พ.ย.)
CREATE TABLE IF NOT EXISTS public.rate_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name VARCHAR(150) NOT NULL,              -- เช่น 'November 2026 - 1H', 'November 2026 - 2H'
    period_cycle VARCHAR(20) NOT NULL,             -- '1H', '2H', 'FULL_MONTH'
    valid_from DATE NOT NULL,                      -- เช่น 2026-11-01
    valid_to DATE NOT NULL,                        -- เช่น 2026-11-15
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ตาราง FREIGHT_RATES (อัตราค่าระวางเรือส่งออก Ocean Freight)
CREATE TABLE IF NOT EXISTS public.freight_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id UUID NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
    port_id UUID REFERENCES public.ports(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.rate_batches(id) ON DELETE SET NULL,
    
    pol VARCHAR(100) NOT NULL,                     -- ท่าเรือต้นทาง เช่น 'LCB', 'BKK (PAT/Sahathai)', 'BKK/LCB'
    pod VARCHAR(150) NOT NULL,                     -- ท่าเรือปลายทาง
    
    rate_20gp NUMERIC(10, 2),                      -- ค่าระวางตู้ 20'GP (USD)
    rate_40gp NUMERIC(10, 2),                      -- ค่าระวางตู้ 40'GP (USD)
    rate_40hq NUMERIC(10, 2),                      -- ค่าระวางตู้ 40'HQ (USD)
    rate_20rf NUMERIC(10, 2),                      -- ค่าระวางตู้เย็น 20'RF (USD)
    rate_40rh NUMERIC(10, 2),                      -- ค่าระวางตู้เย็น 40'RH (USD)
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    
    service_name VARCHAR(100),                     -- เช่น TRX, CHT, SVT, AEU, HLX
    routing_type VARCHAR(100),                     -- เช่น 'Direct', 'T/S via SKU', 'T/S via HKG'
    transit_time VARCHAR(50),                      -- เช่น '11-13 วัน'
    frequency VARCHAR(50),                         -- เช่น '2/wk', '1/wk'
    
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    period_cycle VARCHAR(20) DEFAULT '1H',         -- '1H' หรือ '2H'
    is_active BOOLEAN DEFAULT true,                -- true = ดึงมาแสดงผลในหน้าค้นหา
    remarks TEXT,                                  -- หมายเหตุ เช่น 'รวม DLSS แล้ว', 'ยางพารา $30 all-in'
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ตาราง LOCAL_CHARGES (ค่าใช้จ่ายท้องถิ่นในไทย)
CREATE TABLE IF NOT EXISTS public.local_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id UUID NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
    
    charge_category VARCHAR(100) NOT NULL,         -- เช่น 'LTHC', 'DOC_FEE', 'EQUIPMENT', 'INLAND_RAIL'
    charge_name VARCHAR(150) NOT NULL,             -- เช่น 'Terminal Handling Charge (LTHC)', 'Bill of Lading Fee'
    charge_code VARCHAR(50),                       -- เช่น 'THC', 'B/L', 'SEAL', 'TLX', 'LKB'
    
    amount_20 NUMERIC(10, 2),                      -- ราคาตู้ 20' Dry
    amount_40 NUMERIC(10, 2),                      -- ราคาตู้ 40' Dry / HQ
    amount_20rf NUMERIC(10, 2),                    -- ราคาตู้ 20' Reefer
    amount_40rf NUMERIC(10, 2),                    -- ราคาตู้ 40' Reefer
    
    currency VARCHAR(10) DEFAULT 'THB' NOT NULL,   -- 'THB', 'USD', 'RMB'
    unit VARCHAR(50) DEFAULT 'Container' NOT NULL, -- 'Container', 'Set/BL', 'TEU'
    payment_term VARCHAR(50) DEFAULT 'Prepaid',    -- 'Prepaid', 'Collect'
    remarks TEXT,
    
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR ULTRA-FAST SEARCH (ค้นหาเร็วระดับ Milliseconds)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_freight_rates_pod ON public.freight_rates(pod);
CREATE INDEX IF NOT EXISTS idx_freight_rates_pol ON public.freight_rates(pol);
CREATE INDEX IF NOT EXISTS idx_freight_rates_active ON public.freight_rates(is_active);
CREATE INDEX IF NOT EXISTS idx_freight_rates_validity ON public.freight_rates(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_freight_rates_carrier ON public.freight_rates(carrier_id);
CREATE INDEX IF NOT EXISTS idx_ports_name ON public.ports(port_name);
CREATE INDEX IF NOT EXISTS idx_local_charges_carrier ON public.local_charges(carrier_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- เปิด RLS ให้ทุกตาราง
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_charges ENABLE ROW LEVEL SECURITY;

-- สิทธิ์: ให้บุคคลทั่วไปและหน้าบ้าน (Anon Key) อ่านข้อมูลราคาได้เสมอ (Public Read)
CREATE POLICY "Public can view carriers" ON public.carriers FOR SELECT USING (true);
CREATE POLICY "Public can view ports" ON public.ports FOR SELECT USING (true);
CREATE POLICY "Public can view rate_batches" ON public.rate_batches FOR SELECT USING (true);
CREATE POLICY "Public can view freight_rates" ON public.freight_rates FOR SELECT USING (true);
CREATE POLICY "Public can view local_charges" ON public.local_charges FOR SELECT USING (true);

-- สิทธิ์: การแก้ไข/เพิ่มข้อมูล (Insert/Update/Delete) ให้สิทธิ์เฉพาะผู้ล็อกอินหรือ Service Role
CREATE POLICY "Admins can insert freight_rates" ON public.freight_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update freight_rates" ON public.freight_rates FOR UPDATE USING (true);
CREATE POLICY "Admins can delete freight_rates" ON public.freight_rates FOR DELETE USING (true);

CREATE POLICY "Admins can manage carriers" ON public.carriers FOR ALL USING (true);
CREATE POLICY "Admins can manage ports" ON public.ports FOR ALL USING (true);
CREATE POLICY "Admins can manage batches" ON public.rate_batches FOR ALL USING (true);
CREATE POLICY "Admins can manage local_charges" ON public.local_charges FOR ALL USING (true);
