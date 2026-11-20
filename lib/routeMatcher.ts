/**
 * ยูทิลิตี้จับคู่ท่าเรือต้นทาง (POL) และท่าเรือปลายทาง (POD)
 * หน้าที่: ทำให้การค้นหาชื่อท่าเรือแม่นยำตามมาตรฐานงาน Logistics
 * เช่น รองรับชื่อเก่า-ชื่อใหม่ของพอร์ต (Port Aliases) และการเชื่อมตู้ ICD ลาดกระบัง -> แหลมฉบัง
 */

// พจนานุกรมชื่อเทียบเคียงของท่าเรือ (Port Synonyms / Old-New Names)
// ใช้เมื่อผู้ใช้พิมพ์ชื่อย่อหรือชื่อเก่า เช่น พิมพ์ "Cat Lai" ก็จะเจอ "Hochiminh" ด้วย
const PORT_ALIASES: Record<string, string[]> = {
  chattogram: ['chittagong'],
  chittagong: ['chattogram'],
  hochiminh: ['cat lai', 'saigon', 'hcmc', 'ho chi minh'],
  'ho chi minh': ['hochiminh', 'cat lai', 'hcmc'],
  hcmc: ['hochiminh', 'cat lai', 'ho chi minh'],
  'cat lai': ['hochiminh', 'hcmc', 'ho chi minh'],
  haiphong: ['hai phong'],
  'hai phong': ['haiphong'],
  yangon: ['rangoon', 'myanmar'],
  rangoon: ['yangon'],
  'nhava sheva': ['jnpt', 'mumbai'],
  jnpt: ['nhava sheva', 'mumbai'],
  chennai: ['madras'],
  madras: ['chennai'],
  kolkata: ['calcutta'],
  calcutta: ['kolkata'],
  vizag: ['visakhapatnam'],
  visakhapatnam: ['vizag'],
  keelung: ['jilong', 'taiwan'],
  kaohsiung: ['gaoxiong'],
  busan: ['pusan'],
  pusan: ['busan']
};

/**
 * ตรวจสอบว่าท่าเรือต้นทาง (POL) ของเที่ยวเรือ ตรงกับต้นทางที่ผู้ใช้เลือกในไทยหรือไม่
 * - LCH: ท่าเรือแหลมฉบัง (Laem Chabang)
 * - BKK: ท่าเรือกรุงเทพฯ คลองเตย (PAT), สหไทย (SHT/Sahathai), ไทยเจริญท่าเรือ (TCT)
 * - LKB: สถานีตรวจปล่อยสินค้า ICD ลาดกระบัง (ขนส่งทางรถไฟ/หัวลากไปลงเรือที่แหลมฉบัง)
 */
export function isPolMatch(routePol: string, selectedOrigin: string): boolean {
  if (!routePol) return false;
  const p = routePol.toUpperCase().trim();

  // กรณีเรทสายเรือประกาศครอบคลุมทุกท่าเรือในไทย (Nationwide Thailand tariff) ให้ผ่านทุกต้นทาง
  if (p === 'THAILAND') return true;

  if (selectedOrigin === 'LCH') {
    return p.includes('LCH') || p.includes('LAEM CHABANG') || p.includes('THLCH');
  }

  if (selectedOrigin === 'BKK') {
    return (
      p.includes('BKK') ||
      p.includes('BANGKOK') ||
      p.includes('THBKK') ||
      p.includes('PAT') ||
      p.includes('TCT') ||
      p.includes('SHT') ||
      p.includes('SAHATHAI')
    );
  }

  // [Business Logic สำคัญ] เมื่อเลือกต้นทาง ICD ลาดกระบัง (LKB):
  // ต้องยอมรับเที่ยวเรือที่ออกจาก LCH (แหลมฉบัง) ด้วย เพราะตู้จากลาดกระบังจะต่อรถไฟไปลงเรือแม่ที่แหลมฉบัง
  // แล้วระบบคำนวณราคาจะไปบวกเพิ่มค่า LKB Rail Add-on ทีหลัง (ดูใน carrierValidity.ts)
  if (selectedOrigin === 'LKB') {
    return (
      p.includes('LKB') ||
      p.includes('LKR') ||
      p.includes('LAT KRABANG') ||
      p.includes('LCH') ||
      p.includes('LAEM CHABANG')
    );
  }

  return true;
}

/**
 * ตรวจสอบว่าท่าเรือปลายทาง (POD) ตรงกับคำค้นหาของผู้ใช้หรือไม่
 * ทำงาน 4 ลำดับชั้นจากตรงตัว -> ตัดวงเล็บ -> เช็กชื่อพ้อง (Forward) -> เช็กชื่อพ้องย้อนกลับ (Reverse)
 */
export function isPodMatch(routePod: string, query: string): boolean {
  if (!routePod || !query) return false;

  const qClean = query.toLowerCase().trim();
  const rClean = routePod.toLowerCase().trim();

  // ชั้นที่ 1: เทียบคำตรงตัวหรือคำย่อย (Direct substring match)
  if (rClean.includes(qClean) || qClean.includes(rClean)) {
    return true;
  }

  // ชั้นที่ 2: ตัดวงเล็บหรือเครื่องหมายคอมมาออกเพื่อเอาชื่อเมืองหลัก
  // ตัวอย่าง: "Chattogram (Bangladesh)" -> "chattogram"
  const baseQ = qClean.split('(')[0].split(',')[0].trim();
  const baseR = rClean.split('(')[0].split(',')[0].trim();

  if (baseR.includes(baseQ) || baseQ.includes(baseR)) {
    return true;
  }

  // ชั้นที่ 3: เช็กชื่อเทียบเคียงจากคำที่ผู้ใช้พิมพ์ (เช่น พิมพ์ "jnpt" -> แมตช์กับ "Nhava Sheva")
  const aliases = PORT_ALIASES[baseQ] || [];
  for (const alias of aliases) {
    if (rClean.includes(alias)) {
      return true;
    }
  }

  // ชั้นที่ 4: เช็กชื่อเทียบเคียงย้อนกลับจากชื่อท่าเรือในฐานข้อมูล
  const rAliases = PORT_ALIASES[baseR] || [];
  for (const alias of rAliases) {
    if (qClean.includes(alias) || baseQ.includes(alias)) {
      return true;
    }
  }

  return false;
}
