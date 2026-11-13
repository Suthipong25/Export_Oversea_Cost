'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FreightRate, CarrierKnowledge } from '../types';
import { useRateCycle } from '../lib/rateCycle';

interface RateCardProps {
  rate: FreightRate;
  knowledge?: CarrierKnowledge;
  containerType: string;
  quantity: number;
  origin: string;
  isBestPrice: boolean;
  isFastest: boolean;
  exchangeRate?: number;
}

const CARRIER_LOGO_MAP: Record<string, string> = {
  "CK LINE": "ck_line.svg",
  "CORDELIA": "cordelia.svg",
  "COSCO": "cosco.svg",
  "CULINES": "culines.svg",
  "ESL": "esl.svg",
  "HEUNG A": "heung_a.svg",
  "HMM": "hmm.svg",
  "INFINITY": "infinity.svg",
  "INTERASIA": "interasia.svg",
  "MARINUS": "marinus.svg",
  "NAMSUNG": "namsung.svg",
  "PIL": "pil.svg",
  "RCL": "rcl.svg",
  "SEA LOG": "sea_log.svg",
  "SEA STAR": "sea_star.svg",
  "SIAM LINER": "siam_liner.svg",
  "SINOKOR": "sinokor.svg",
  "TSL": "tsl.svg"
};

export const RateCard: React.FC<RateCardProps> = ({
  rate,
  knowledge = {},
  containerType,
  quantity,
  origin,
  isBestPrice,
  isFastest,
  exchangeRate = 33.86
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { period: rateCyclePeriod } = useRateCycle();

  const fxRate = exchangeRate && exchangeRate > 0 ? exchangeRate : 33.86;
  const is20 = containerType === '20';
  const isLKB = origin === 'LKB';

  const baseOf = is20 ? rate.rate20 : rate.rate40;
  const lkbFee = isLKB ? (is20 ? 200 : 250) : 0;
  const finalOfUsd = (baseOf + lkbFee) * quantity;

  const lc = rate.localCharges || { thc20: 2800, thc40: 4300, bl: 1500, seal: 300, telex: 1500 };
  const baseThc = is20 ? lc.thc20 : lc.thc40;
  const finalLocalThb = (baseThc + lc.seal) * quantity + (lc.bl + (lc.telex || 0));
  const finalLocalUsd = finalLocalThb / fxRate;

  const grandTotalUsd = finalOfUsd + finalLocalUsd;
  const grandTotalThb = grandTotalUsd * fxRate;

  const logoFile = CARRIER_LOGO_MAP[rate.carrier];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 hover:shadow-md hover:border-slate-300 transition-all duration-150">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Carrier Identity & Route */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            {isBestPrice && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300/80 text-[11px] font-bold px-2.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                ราคาต่ำสุด
              </span>
            )}
            {isFastest && (
              <span className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-800 border border-sky-300/80 text-[11px] font-bold px-2.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                ระยะเวลาสั้นสุด
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500">{rate.region || 'International Route'}</span>
            <span className={`text-xs font-semibold ${rate.routing === 'DIRECT' ? 'text-emerald-800 bg-emerald-50/80 border border-emerald-200' : 'text-amber-800 bg-amber-50/80 border border-amber-200'} px-2 py-0.5 rounded`}>
              {rate.routing === 'DIRECT' ? 'เรือตรง' : 'เรือต่อ (T/S)'} • {rate.tt}
            </span>
            <span className="text-xs text-slate-400">| ปลายทาง: <strong className="text-slate-800 font-bold">{rate.pod}</strong></span>
          </div>

          {/* Logo & Carrier Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-2xs shrink-0">
              {logoFile ? (
                <Image
                  src={`/logos/${logoFile}`}
                  alt={rate.carrier}
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain rounded-lg select-none"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  {rate.carrier.substring(0, 3)}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">{rate.carrier}</h3>
              <div className="flex flex-wrap items-center gap-x-4 text-xs text-slate-600 mt-0.5 font-medium">
                <span><strong className="text-slate-700">กำหนดออกเรือ:</strong> {rate.schedule || 'Weekly Regular'}</span>
                <span><strong className="text-slate-700">สายการเดินเรือ:</strong> {rate.routingDetail || rate.routing}</span>
                <span><strong className="text-slate-700">ท่าเรือต้นทาง (POL):</strong> {rate.pol || 'LCH / BKK'}</span>
                <span className="text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                  วันฟรีตู้: {knowledge.freeTime || '14 Days Combined'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Toggle */}
          <div className="mt-3.5 bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-slate-700 font-medium">
                <span className="font-bold text-slate-900">เงื่อนไขเส้นทาง:</span> {rate.notes || 'ค่าระวางมาตรฐานตามรอบความถูกต้อง'}
                {isLKB && (
                  <span className="ml-2 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    + รวมค่ารถไฟ ICD ลาดกระบังแล้ว
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-slate-700 hover:text-blue-700 font-semibold underline underline-offset-2 cursor-pointer text-right shrink-0 flex items-center gap-1 transition-colors"
              >
                <span>{isOpen ? 'ซ่อนแจกแจงต้นทุน' : 'ดูแจกแจงต้นทุน & ข้อกำหนด'}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Breakdown (High Contrast & Clear Typography) */}
          {isOpen && (
            <div className="mt-3.5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-3.5 transition-all">
              
              {/* Financial Breakdown */}
              <div className="space-y-2 pb-3 border-b border-slate-200">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">แจกแจงโครงสร้างต้นทุน (Cost Breakdown):</div>
                <div className="flex justify-between text-slate-800 font-medium text-xs">
                  <span>ค่าระวางเรือ Ocean Freight ({quantity} ตู้ x ${baseOf + lkbFee}):</span>
                  <span className="font-bold text-slate-900 tabular-nums">${Math.round(finalOfUsd).toLocaleString('en-US')} (~฿{Math.round(finalOfUsd * fxRate).toLocaleString('th-TH')} บาท)</span>
                </div>
                <div className="flex justify-between text-slate-800 font-medium text-xs">
                  <span>Local Charges ในไทย (THC ฿{baseThc.toLocaleString()} + B/L ฿{lc.bl.toLocaleString()} + Seal ฿{lc.seal} + Telex ฿{lc.telex || 0}):</span>
                  <span className="font-bold text-slate-900 tabular-nums">฿{Math.round(finalLocalThb).toLocaleString('th-TH')} บาท (~${Math.round(finalLocalUsd).toLocaleString('en-US')})</span>
                </div>
              </div>

              {/* Carrier Specific Operational Rules */}
              <div className="space-y-1.5 text-slate-800 text-xs font-normal leading-relaxed">
                <div className="font-bold text-slate-900 text-xs pb-0.5">ข้อกำหนดและเงื่อนไขการขนส่ง {rate.carrier}:</div>
                <div>• <strong className="text-slate-900 font-bold">วันฟรีตู้ปลายทาง (Free Time):</strong> <span>{knowledge.freeTime || '14 Days Combined'}</span></div>
                <div>• <strong className="text-slate-900 font-bold">ข้อจำกัดน้ำหนัก (Weight Limit):</strong> <span>{knowledge.weightLimit || 'ตามพิกัดตู้มาตรฐาน ISO'}</span></div>
                <div>• <strong className="text-slate-900 font-bold">เอกสารความปลอดภัย (Manifest):</strong> <span>{knowledge.manifest || 'ตามระเบียบศุลกากรปลายทาง'}</span></div>
                
                {knowledge.specialRules && knowledge.specialRules.length > 0 && (
                  <ul className="space-y-1 text-slate-800 pt-1">
                    {knowledge.specialRules.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between text-slate-600 text-[11px] pt-2.5 border-t border-slate-200 gap-1 font-medium">
                <span>อัตราแลกเปลี่ยนอ้างอิง: 1 USD = {fxRate.toFixed(2)} THB | ไม่รวมภาษีมูลค่าเพิ่ม VAT 7% สำหรับ Local Charges</span>
                <span className="text-slate-700 font-semibold">รอบราคา: {rateCyclePeriod}</span>
              </div>

            </div>
          )}

        </div>

        {/* Estimated All-In Total */}
        <div className="lg:border-l lg:border-slate-200 lg:pl-6 text-left lg:text-right flex flex-col justify-between shrink-0">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              ประมาณการต้นทุนรวม All-In
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-0.5">
              ${Math.round(grandTotalUsd).toLocaleString('en-US')}
            </div>
            <div className="text-xs font-semibold text-slate-600 tabular-nums mt-1">
              ~฿{Math.round(grandTotalThb).toLocaleString('th-TH')} บาท
              <span className="text-slate-400 font-normal ml-1">({quantity} ตู้)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
