/**
 * Carrier Quotation Validity Mapping
 * Accurately calculates the exact validity date and day duration
 * matching official carrier quotation PDF notices in carrier_tariffs/.
 */

export function getRouteValidity(carrier: string, region = ''): string {
  const c = carrier ? carrier.toUpperCase().trim() : '';
  const reg = region ? region.toLowerCase() : '';

  // INTERASIA: RATE 1-14 NOV 2026.pdf (14 วัน)
  if (c === 'INTERASIA') {
    return '1 - 14 พ.ย. 2026 (14 วัน)';
  }

  // PIL:
  // - Africa, Intra Asia, Oceania, REDSEA & GULF, South Asia: 1H (1-14 Nov 2026, 14 วัน)
  // - South Pacific Islands: 1-30 Nov 2026 (30 วัน)
  if (c === 'PIL') {
    if (reg.includes('pacific') || reg.includes('islands') || reg.includes('tahiti') || reg.includes('fiji')) {
      return '1 - 30 พ.ย. 2026 (30 วัน)';
    }
    return '1 - 14 พ.ย. 2026 (14 วัน)';
  }

  // COSCO:
  // - China Japan Korea GC: 1-30 Nov 2026 (30 วัน)
  // - South Asia, North Africa: 1-15 Nov 2026 (15 วัน)
  // - EUR MED, East Africa, South Africa, West Africa, AUZ: 1-14 Nov 2026 (14 วัน)
  if (c === 'COSCO') {
    if (reg.includes('china') || reg.includes('japan') || reg.includes('korea') || reg.includes('intra-asia')) {
      return '1 - 30 พ.ย. 2026 (30 วัน)';
    }
    if (reg.includes('south asia') || reg.includes('india') || reg.includes('pakistan') || reg.includes('north africa')) {
      return '1 - 15 พ.ย. 2026 (15 วัน)';
    }
    return '1 - 14 พ.ย. 2026 (14 วัน)';
  }

  // CORDELIA: Guideline Rate - 1-15.November 2026.pdf (15 วัน)
  if (c === 'CORDELIA') {
    return '1 - 15 พ.ย. 2026 (15 วัน)';
  }

  // MARINUS: Marinus Thailand Rate Sheet Nov 1H.pdf (15 วัน)
  if (c === 'MARINUS') {
    return '1 - 15 พ.ย. 2026 (15 วัน)';
  }

  // TSL: Rate 1st Half Nov.26.pdf (15 วัน)
  if (c === 'TSL') {
    return '1 - 15 พ.ย. 2026 (15 วัน)';
  }

  // CULINES: IA is 1-30 Nov (30 วัน), LH is 1-15 Nov (15 วัน)
  if (c === 'CULINES') {
    if (reg.includes('intra') || reg.includes('asia') || reg.includes('china') || reg.includes('southeast')) {
      return '1 - 30 พ.ย. 2026 (30 วัน)';
    }
    return '1 - 15 พ.ย. 2026 (15 วัน)';
  }

  // Full Month Carriers: 1 - 30 Nov 2026 (30 วัน)
  // CK LINE, ESL, HEUNG A, HMM, INFINITY, NAMSUNG, RCL, SEA LOG, SEA STAR, SIAM LINER, SINOKOR
  return '1 - 30 พ.ย. 2026 (30 วัน)';
}
