import { FreightRate, CarrierKnowledge } from '../types';
import { getRouteValidity, getLkbAddonValues } from './carrierValidity';
import { formatLocalChargesSummary, DEFAULT_EXCHANGE_RATE } from './costCalculator';

export const TARIFF_TABLE_HEADERS = [
  'POL',
  'POD',
  'COUNTRY',
  'CARRIER',
  'CURRENCY',
  "RATE 20'GP",
  "RATE 40'HQ",
  "LKB ADD ON PER 20'/40'",
  'T/S',
  'T/T',
  'F/T',
  'Valid date',
  'LOCAL CHARGE (THB)',
  'REMARKS',
];

export interface GenerateTsvParams {
  rates: FreightRate[];
  origin: string;
  knowledgeBase: Record<string, CarrierKnowledge>;
  exchangeRate?: number;
}

/**
 * แปลงรายการเรทเป็นตาราง TSV (Tab-Separated Values) สำหรับคัดลอกลง Excel หรือ Google Sheets
 */
export function generateTariffTsv({
  rates,
  origin,
  knowledgeBase,
}: GenerateTsvParams): string {
  const originLabel =
    origin === 'LCH'
      ? 'Laem Chabang'
      : origin === 'BKK'
      ? 'Bangkok'
      : 'Lat Krabang';

  const rows = rates.map((r) => {
    const lkb = getLkbAddonValues(r.carrier, r.notes);
    const validity = r.validity || getRouteValidity(r.carrier, r.region);
    const kb = knowledgeBase[r.carrier] || {};
    const lcSummary = formatLocalChargesSummary(r.localCharges);

    return [
      r.pol || originLabel,
      r.pod,
      r.region || 'International',
      r.carrier,
      'USD',
      `$${r.rate20}`,
      `$${r.rate40}`,
      `+$${lkb.add20} / +$${lkb.add40}`,
      r.routing === 'DIRECT' ? 'DIRECT' : 'T/S',
      r.tt,
      kb.freeTime || '14 Days Combined',
      validity,
      lcSummary,
      r.notes || '-',
    ].join('\t');
  });

  return [TARIFF_TABLE_HEADERS.join('\t'), ...rows].join('\n');
}
