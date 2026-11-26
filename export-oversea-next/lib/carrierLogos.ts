/**
 * Carrier logo resolver & mapping
 * Centralized registry of shipping line SVG logos.
 */

const CARRIER_LOGO_MAP: Record<string, string> = {
  'CK LINE': 'ck_line.svg',
  'CORDELIA': 'cordelia.svg',
  'COSCO': 'cosco.svg',
  'CULINES': 'culines.svg',
  'ESL': 'esl.svg',
  'HEUNG A': 'heung_a.svg',
  'HMM': 'hmm.svg',
  'INFINITY': 'infinity.svg',
  'INTERASIA': 'interasia.svg',
  'MARINUS': 'marinus.svg',
  'NAMSUNG': 'namsung.svg',
  'PIL': 'pil.svg',
  'RCL': 'rcl.svg',
  'SEA LOG': 'sea_log.svg',
  'SEA STAR': 'sea_star.svg',
  'SIAM LINER': 'siam_liner.svg',
  'SINOKOR': 'sinokor.svg',
  'TSL': 'tsl.svg',
};

/**
 * Returns the relative path to carrier logo svg if available, or null if no logo file exists.
 */
export function getCarrierLogoPath(carrier: string): string | null {
  const normalized = carrier?.trim().toUpperCase();
  const file = CARRIER_LOGO_MAP[normalized];
  return file ? `/logos/${file}` : null;
}
