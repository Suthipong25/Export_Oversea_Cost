export interface LocalCharges {
  thc20: number;
  thc40: number;
  bl: number;
  seal: number;
  telex: number;
}

export interface FreightRate {
  carrier: string;
  region: string;
  pol: string;
  pod: string;
  rate20: number;
  rate40: number;
  rate40hq?: number;
  tt: string;
  routing: string;
  routingDetail: string;
  schedule: string;
  notes: string;
  validity?: string;
  validFrom?: string;
  validTo?: string;
  localCharges: LocalCharges;
}

export interface CarrierKnowledge {
  fullName?: string;
  freeTime?: string;
  weightLimit?: string;
  manifest?: string;
  localChargesNote?: string;
  specialRules?: string[];
}

export interface CostBreakdown {
  baseOf: number;
  lkbFee: number;
  finalOfUsd: number;
  thcUsd: number;
  blUsd: number;
  sealUsd: number;
  telexUsd: number;
  itemizedLocalUsd: number;
  grandTotalUsd: number;
}

export interface CalculatedRate extends FreightRate {
  ofUsd: number;
  grandTotalUsd: number;
  days: number;
  costBreakdown: CostBreakdown;
}

export interface DatabasePayload {
  totalRecords: number;
  totalPorts: number;
  ports: string[];
  rates: FreightRate[];
  carrierKnowledgeBase: Record<string, CarrierKnowledge>;
}
