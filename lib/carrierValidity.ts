/**
 * ตารางอ้างอิงวันหมดอายุของเรท (Quotation Validity) และค่ารถไฟ ICD ลาดกระบัง (LKB Rail Add-on)
 * อ้างอิงตามใบเสนอราคา PDF ทางการของแต่ละสายเรือในโฟลเดอร์ carrier_tariffs/
 */

export interface LkbAddon {
  add20: number;
  add40: number;
}

// ค่ามาตรฐานทั่วไปสำหรับสายเรือที่ไม่ได้กำหนดข้อยกเว้น
const DEFAULT_VALIDITY = '1 - 30 พ.ย. 2026 (30 วัน)';
const DEFAULT_LKB_ADDON: LkbAddon = { add20: 200, add40: 250 };

// สายเรือที่มีรอบราคาตายตัว (คงที่ทุกภูมิภาค)
const STATIC_VALIDITY_MAP: Record<string, string> = {
  INTERASIA: '1 - 14 พ.ย. 2026 (14 วัน)',
  'SEA LOG': '1 - 14 พ.ย. 2026 (14 วัน)',
  SEALOG: '1 - 14 พ.ย. 2026 (14 วัน)',
  CORDELIA: '1 - 15 พ.ย. 2026 (15 วัน)',
  MARINUS: '16 - 30 พ.ย. 2026 (15 วัน)',
  MULTIBOX: '15 - 30 พ.ย. 2026 (16 วัน)',
  TSL: '16 - 30 พ.ย. 2026 (15 วัน)',
};

// ค่า Add-on ICD ลาดกระบังสำหรับสายเรือที่มีอัตราคงที่
const STATIC_LKB_MAP: Record<string, LkbAddon> = {
  TSL: { add20: 100, add40: 100 },
  CORDELIA: { add20: 100, add40: 200 },
  CULINES: { add20: 100, add40: 180 },
  'SIAM LINER': { add20: 150, add40: 300 },
  MARINUS: { add20: 150, add40: 300 },
  PIL: { add20: 150, add40: 180 },
  SINOKOR: { add20: 100, add40: 150 },
  NAMSUNG: { add20: 160, add40: 160 },
  NUMSUNG: { add20: 160, add40: 160 },
  ESL: { add20: 115, add40: 150 },
};

/**
 * ฟังก์ชันช่วยตรวจสอบว่าข้อความมีคำค้นหาใดคำหนึ่งในรายการหรือไม่
 */
function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

/**
 * คำนวณวันหมดอายุตามสายเรือและภูมิภาคปลายทาง
 */
export function getRouteValidity(carrier: string, region = ''): string {
  const c = carrier?.trim().toUpperCase() || '';
  const reg = region?.toLowerCase() || '';

  // 1. ตรวจสอบจากสายเรือที่มีรอบราคาคงที่
  if (STATIC_VALIDITY_MAP[c]) {
    return STATIC_VALIDITY_MAP[c];
  }

  // 2. สายเรือที่มีรอบราคาแยกตามภูมิภาค
  switch (c) {
    case 'SIAM LINER':
      if (containsAny(reg, ['philippines', 'manila'])) return '15 พ.ย. 2026 - 31 ม.ค. 2027';
      if (containsAny(reg, ['india', 'pakistan', 'south asia'])) return '17 - 30 พ.ย. 2026 (14 วัน)';
      return DEFAULT_VALIDITY;

    case 'RCL':
      if (containsAny(reg, ['india', 'pakistan', 'south asia', 'nepal', 'sri lanka', 'reefer'])) {
        return '1 - 15 พ.ย. 2026 (15 วัน)';
      }
      return DEFAULT_VALIDITY;

    case 'PIL':
      if (containsAny(reg, ['mscorp', 'inbound', 'pacific', 'islands', 'tahiti', 'fiji'])) {
        return DEFAULT_VALIDITY;
      }
      return '15 - 30 พ.ย. 2026 (16 วัน)';

    case 'SINOKOR':
      if (containsAny(reg, ['mexico', 'latin america', 'manzanillo'])) return '1 - 14 พ.ย. 2026 (14 วัน)';
      return DEFAULT_VALIDITY;

    case 'NAMSUNG':
    case 'NUMSUNG':
      if (containsAny(reg, ['india', 'pakistan', 'south asia'])) return '8 - 30 พ.ย. 2026 (23 วัน)';
      return DEFAULT_VALIDITY;

    case 'ESL':
      if (containsAny(reg, ['mexico', 'latin america', 'manzanillo'])) return '1 - 15 พ.ย. 2026 (15 วัน)';
      return '16 - 30 พ.ย. 2026 (15 วัน)';

    case 'CULINES':
      if (containsAny(reg, ['intra', 'china', 'southeast'])) return DEFAULT_VALIDITY;
      if (containsAny(reg, ['india', 'pakistan', 'south asia'])) return '15 - 23 พ.ย. 2026 (9 วัน)';
      if (reg.includes('red sea')) return '16 - 30 พ.ย. 2026 (15 วัน)';
      return '15 - 30 พ.ย. 2026 (16 วัน)';

    case 'COSCO':
      if (
        containsAny(reg, ['china', 'japan', 'korea', 'intra-asia', 'southeast asia']) ||
        (reg.includes('south asia') && reg.includes('reefer'))
      ) {
        return DEFAULT_VALIDITY;
      }
      if (containsAny(reg, ['ecsa', 'east coast south america', 'brazil', 'argentina', 'uruguay', 'paraguay'])) {
        return '15 - 21 พ.ย. 2026 (7 วัน)';
      }
      if (
        containsAny(reg, [
          'west africa', 'new zealand', 'australia', 'reefer', 'south africa', 'middle east',
          'persian gulf', 'iag', 'east africa', 'europe', 'mediterranean', 'aeu', 'aem',
          'latin', 'caribbean', 'mexico', 'colombia', 'costa rica', 'honduras', 'guatemala',
        ])
      ) {
        return '15 - 30 พ.ย. 2026 (15 วัน)';
      }
      if (
        containsAny(reg, [
          'south asia', 'india', 'pakistan', 'sri lanka', 'maldives',
          'north africa', 'morocco', 'algeria', 'libya', 'tunisia',
        ])
      ) {
        return '16 - 30 พ.ย. 2026 (15 วัน)';
      }
      return '1 - 14 พ.ย. 2026 (14 วัน)';

    default:
      // สายเรือรอบเต็มเดือน 30 วัน: CK LINE, HEUNG A, HMM, INFINITY, SEA STAR ฯลฯ
      return DEFAULT_VALIDITY;
  }
}

/**
 * คำนวณค่าบริการบวกเพิ่ม (Add-on) กรณีส่งตู้ขึ้นที่ ICD ลาดกระบัง (LKB) แทนแหลมฉบัง (LCH)
 */
export function getLkbAddonValues(carrier: string, notes = ''): LkbAddon {
  const c = carrier?.trim().toUpperCase() || '';
  const n = notes?.toLowerCase() || '';

  // 1. ตรวจสอบจากสายเรือที่มีอัตรา LKB คงที่
  if (STATIC_LKB_MAP[c]) {
    return STATIC_LKB_MAP[c];
  }

  // 2. สายเรือที่มีเงื่อนไขเฉพาะตาม Remark ในตั๋ว
  if (c === 'INTERASIA' || c === 'IAL' || n.includes('lka add up 120/200')) {
    return { add20: 120, add40: 200 };
  }

  if (c === 'COSCO') {
    if (n.includes('+$55/+$110')) return { add20: 55, add40: 110 };
    if (n.includes('ian 612')) return { add20: 50, add40: 100 };
    return { add20: 100, add40: 200 };
  }

  if (c === 'HEUNG A' || n.includes('ex lkb +$100/$150')) {
    if (n.includes('20rf/40rh lkb +$250')) return { add20: 250, add40: 250 };
    return { add20: 100, add40: 150 };
  }

  if (c === 'MULTIBOX') {
    if (n.includes('120/150')) return { add20: 120, add40: 150 };
    return { add20: 200, add40: 200 };
  }

  return DEFAULT_LKB_ADDON;
}
