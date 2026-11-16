export interface FreightRate {
  carrier: string;
  region: string;
  pol: string;
  pod: string;
  rate20: number;
  rate40: number;
  tt: string;
  routing: string;
  routingDetail: string;
  schedule: string;
  notes: string;
  validity?: string;
  localCharges: {
    thc20: number;
    thc40: number;
    bl: number;
    seal: number;
    telex: number;
  };
}

export interface CarrierKnowledge {
  fullName?: string;
  freeTime?: string;
  weightLimit?: string;
  manifest?: string;
  localChargesNote?: string;
  specialRules?: string[];
}

export interface DatabasePayload {
  totalRecords: number;
  totalPorts: number;
  ports: string[];
  rates: FreightRate[];
  carrierKnowledgeBase: Record<string, CarrierKnowledge>;
}
