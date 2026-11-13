/**
 * Route Matching & Port Aliasing Utility
 * Ensures POL (Origin) and POD (Destination) strictly match valid carrier routes.
 */

const PORT_ALIASES: Record<string, string[]> = {
  chattogram: ['chittagong'],
  chittagong: ['chattogram'],
  hochiminh: ['cat lai', 'saigon', 'hcmc'],
  hcmc: ['hochiminh', 'cat lai'],
  'cat lai': ['hochiminh', 'hcmc'],
  yangon: ['rangoon', 'myanmar'],
  rangoon: ['yangon'],
  'nhava sheva': ['jnpt', 'mumbai'],
  jnpt: ['nhava sheva', 'mumbai'],
  chennai: ['madras'],
  madras: ['chennai'],
  kolkata: ['calcutta'],
  calcutta: ['kolkata'],
  keelung: ['jilong', 'taiwan'],
  kaohsiung: ['gaoxiong'],
  busan: ['pusan'],
  pusan: ['busan']
};

/**
 * Checks if a route's POL strictly matches the selected origin in Thailand.
 * LCH: Laem Chabang
 * BKK: Bangkok PAT / Sahathai / TCT / THBKK
 * LKB: Lat Krabang ICD
 */
export function isPolMatch(routePol: string, selectedOrigin: string): boolean {
  if (!routePol) return false;
  const p = routePol.toUpperCase().trim();

  // Carriers with nationwide Thailand tariff
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
 * Checks if a route's POD matches the user's destination query,
 * supporting port aliases, parenthetical qualifiers, and region synonyms.
 */
export function isPodMatch(routePod: string, query: string): boolean {
  if (!routePod || !query) return false;

  const qClean = query.toLowerCase().trim();
  const rClean = routePod.toLowerCase().trim();

  // Direct substring match
  if (rClean.includes(qClean) || qClean.includes(rClean)) {
    return true;
  }

  // Extract base names (e.g. "Chattogram (Bangladesh)" -> "chattogram")
  const baseQ = qClean.split('(')[0].split(',')[0].trim();
  const baseR = rClean.split('(')[0].split(',')[0].trim();

  if (baseR.includes(baseQ) || baseQ.includes(baseR)) {
    return true;
  }

  // Check synonym & port aliases dictionary
  const aliases = PORT_ALIASES[baseQ] || [];
  for (const alias of aliases) {
    if (rClean.includes(alias)) {
      return true;
    }
  }

  // Reverse check if route base has aliases that match query
  const rAliases = PORT_ALIASES[baseR] || [];
  for (const alias of rAliases) {
    if (qClean.includes(alias) || baseQ.includes(alias)) {
      return true;
    }
  }

  return false;
}
