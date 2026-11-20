import { FreightRate, LocalCharges, CostBreakdown } from '../types';
import { getLkbAddonValues } from './carrierValidity';

export const DEFAULT_EXCHANGE_RATE = 33.86;

export const DEFAULT_LOCAL_CHARGES: LocalCharges = {
  thc20: 2800,
  thc40: 4300,
  bl: 1500,
  seal: 300,
  telex: 1500,
};

/**
 * ดึงค่า Local Charges มาตรฐานเริ่มต้นตามสายเรือและประเภทตู้
 */
export function getDefaultLocalCharges(carrier: string, isReefer = false): LocalCharges {
  const isCosco = carrier?.trim().toUpperCase() === 'COSCO';
  return {
    thc20: isReefer ? 3500 : 2800,
    thc40: isReefer ? 5250 : 4300,
    bl: isCosco ? 1300 : 1500,
    seal: isCosco ? 250 : 300,
    telex: 1500,
  };
}

/**
 * ดึงฐานค่าระวางเรือ (Ocean Freight) ตามประเภทตู้คอนเทนเนอร์
 * 20 -> rate20 | 40 -> rate40 | 40hc/45 -> rate40hq (หรือ rate40 หากไม่มี)
 */
export function getBaseOceanFreight(rate: FreightRate, containerType: string): number {
  if (containerType === '20') {
    return rate.rate20;
  }
  if (containerType === '40') {
    return rate.rate40;
  }
  return rate.rate40hq && rate.rate40hq > 0 ? rate.rate40hq : rate.rate40;
}

/**
 * ตรวจสอบว่าเรทนี้ระบุต้นทางเป็น Lat Krabang โดยตรงอยู่แล้วหรือไม่
 * (ถ้าใช่ แสดงว่าราคาในตารางได้รวมค่ารถไฟ LKB ไว้แล้ว ไม่ต้องบวกซ้ำ)
 */
export function isExplicitLkbRoute(pol: string): boolean {
  const upper = (pol || '').toUpperCase();
  return upper.includes('LAT KRABANG') || upper === 'LKB' || upper === 'THLKB' || upper === 'LKR';
}

/**
 * คำนวณค่ารถไฟ Add-on กรณีส่งตู้จาก ICD ลาดกระบัง
 */
export function calculateLkbFee(rate: FreightRate, origin: string, containerType: string): number {
  if (origin !== 'LKB' || isExplicitLkbRoute(rate.pol)) {
    return 0;
  }
  const lkbAddon = getLkbAddonValues(rate.carrier, rate.notes);
  return containerType === '20' ? lkbAddon.add20 : lkbAddon.add40;
}

export interface CalculateCostParams {
  rate: FreightRate;
  containerType: string;
  quantity: number;
  origin: string;
  exchangeRate?: number;
}

/**
 * คำนวณแจกแจงโครงสร้างต้นทุน All-In ทั้งหมด (Ocean Freight + LKB + Local Charges ในไทย)
 * จุดคำนวณเดียวของทั้งระบบ ป้องกันความคลาดเคลื่อนระหว่างการ์ดและตาราง
 */
export function calculateFreightCost({
  rate,
  containerType,
  quantity,
  origin,
  exchangeRate = DEFAULT_EXCHANGE_RATE,
}: CalculateCostParams): CostBreakdown {
  const fxRate = exchangeRate > 0 ? exchangeRate : DEFAULT_EXCHANGE_RATE;
  const is20 = containerType === '20';

  // 1. Ocean Freight & LKB Rail Add-on
  const baseOf = getBaseOceanFreight(rate, containerType);
  const lkbFee = calculateLkbFee(rate, origin, containerType);
  const finalOfUsd = (baseOf + lkbFee) * quantity;

  // 2. Local Charges ในไทย (THB -> USD)
  const lc = rate.localCharges || DEFAULT_LOCAL_CHARGES;
  const baseThc = is20 ? lc.thc20 : lc.thc40;

  // THC และ Seal คิดต่อตู้ (คูณ quantity)
  const thcUsd = Math.round((baseThc * quantity) / fxRate);
  const sealUsd = Math.round((lc.seal * quantity) / fxRate);

  // B/L และ Telex คิดต่อชิปเมนต์/ต่อชุด (ไม่คูณ quantity)
  const blUsd = Math.round(lc.bl / fxRate);
  const telexUsd = lc.telex ? Math.round(lc.telex / fxRate) : 0;

  const itemizedLocalUsd = thcUsd + blUsd + sealUsd + telexUsd;
  const grandTotalUsd = finalOfUsd + itemizedLocalUsd;

  return {
    baseOf,
    lkbFee,
    finalOfUsd,
    thcUsd,
    blUsd,
    sealUsd,
    telexUsd,
    itemizedLocalUsd,
    grandTotalUsd,
  };
}

/**
 * สรุป Local Charges แสดงผลแบบสั้นในตาราง (THC, B/L, Seal แปลงเป็น USD)
 */
export function formatLocalChargesSummary(
  localCharges?: LocalCharges,
  exchangeRate = DEFAULT_EXCHANGE_RATE
): string {
  const lc = localCharges || DEFAULT_LOCAL_CHARGES;
  const fx = exchangeRate > 0 ? exchangeRate : DEFAULT_EXCHANGE_RATE;

  const thcUsd = Math.round(lc.thc40 / fx);
  const blUsd = Math.round(lc.bl / fx);
  const sealUsd = Math.round(lc.seal / fx);

  return `THC: $${thcUsd} | B/L: $${blUsd} | Seal: $${sealUsd}`;
}

/**
 * สกัดตัวเลขวันขั้นต่ำจากข้อความ Transit Time (เช่น "7-10 Days" -> 7) เพื่อใช้จัดเรียงความเร็ว
 */
export function parseTransitDays(tt: string): number {
  if (!tt) return 99;
  const match = tt.match(/\d+/);
  return match ? parseInt(match[0], 10) : 99;
}
