'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FreightRate, CarrierKnowledge } from '../types';
import { getRouteValidity, getLkbAddonValues } from '../lib/carrierValidity';
import { calculateFreightCost, DEFAULT_EXCHANGE_RATE } from '../lib/costCalculator';
import { getCarrierLogoPath } from '../lib/carrierLogos';

interface RateCardProps {
  rate: FreightRate;
  knowledge?: CarrierKnowledge;
  containerType: string;
  quantity: number;
  origin: string;
  isBestPrice: boolean;
  isFastest: boolean;
  exchangeRate?: number;
  onSelectContainer?: (type: string) => void;
}

export const RateCard: React.FC<RateCardProps> = ({
  rate,
  knowledge = {},
  containerType,
  quantity,
  origin,
  isBestPrice,
  isFastest,
  exchangeRate = DEFAULT_EXCHANGE_RATE,
  onSelectContainer,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const actualValidity = rate.validity || getRouteValidity(rate.carrier, rate.region);
  const lkbAddon = getLkbAddonValues(rate.carrier, rate.notes);
  const is20 = containerType === '20';
  const isLKB = origin === 'LKB';

  // คำนวณแจกแจงต้นทุนผ่าน Single Source of Truth
  const cost = calculateFreightCost({
    rate,
    containerType,
    quantity,
    origin,
    exchangeRate,
  });

  const logoPath = getCarrierLogoPath(rate.carrier);

  const containerLabel = containerType === '20' ? "20' Standard" : "40' High Cube";

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 hover:shadow-md hover:border-slate-300 transition-all duration-150">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        
        {/* Carrier Identity & Route Details */}
        <div className="flex-1 min-w-0">
          
          {/* 1. Status & Route Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
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
            
            {/* Route: POL -> POD (Country) */}
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
              {rate.pol || 'LCH/BKK'} ➔ <strong className="text-slate-900 font-bold">{rate.pod}</strong>
              {rate.region ? ` (${rate.region})` : ''}
            </span>

            {/* T/S & T/T */}
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                rate.routing === 'DIRECT'
                  ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                  : 'text-amber-800 bg-amber-50 border border-amber-200'
              }`}
            >
              {rate.routing === 'DIRECT' ? 'เรือตรง (Direct)' : 'เรือต่อ (T/S)'} • T/T: {rate.tt}
            </span>

            {/* Valid Date */}
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
              รอบราคา: {actualValidity}
            </span>
          </div>

          {/* 2. Logo & Carrier Info */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-2xs shrink-0">
              {logoPath ? (
                <Image
                  src={logoPath}
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

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{rate.carrier}</h3>
                <span className="text-xs text-slate-500 font-medium">
                  กำหนดออกเรือ: {rate.schedule || 'Weekly Regular'}
                </span>
              </div>

              {/* Subline specs: F/T, LKB Add-on */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1 font-medium">
                <span>
                  <strong className="text-slate-700">วันฟรีตู้ (F/T):</strong> {knowledge.freeTime || '14 Days Combined at POD'}
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  <strong className="text-slate-700">ICD ลาดกระบัง (LKB):</strong> 20&apos;: +${lkbAddon.add20} | 40&apos;: +${lkbAddon.add40}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Rates & Remarks Bar (Sleek horizontal strip) */}
          <div className="mt-3.5 bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Rate 20'GP & Rate 40'HQ Interactive Pill */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                ค่าระวาง (USD):
              </span>
              <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-bold shadow-2xs">
                <button
                  type="button"
                  onClick={() => onSelectContainer?.('20')}
                  className={`px-2.5 py-1 rounded-md transition-all tabular-nums cursor-pointer ${
                    is20
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title="คลิกเพื่อสลับเป็นตู้ 20'GP"
                >
                  20&apos;GP: ${rate.rate20.toLocaleString()}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectContainer?.('40hc')}
                  className={`px-2.5 py-1 rounded-md transition-all tabular-nums cursor-pointer ${
                    !is20
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title="คลิกเพื่อสลับเป็นตู้ 40'HQ"
                >
                  40&apos;HQ: ${(rate.rate40hq || rate.rate40).toLocaleString()}
                </button>
              </div>
              {isLKB && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  + ค่ารถไฟ LKB แล้ว
                </span>
              )}
            </div>

            {/* Remarks & Toggle */}
            <div className="flex items-center justify-between md:justify-end gap-3 text-xs">
              {rate.notes && (
                <span className="text-slate-600 truncate max-w-xs" title={rate.notes}>
                  <strong className="text-slate-700">เงื่อนไข:</strong> {rate.notes}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-blue-700 hover:text-blue-800 font-bold underline underline-offset-2 cursor-pointer text-right shrink-0 flex items-center gap-1 transition-colors text-xs"
              >
                <span>{isOpen ? 'ซ่อนแจกแจงต้นทุน' : 'ดูแจกแจงต้นทุน & ข้อกำหนด'}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Breakdown */}
          {isOpen && (
            <div className="mt-3.5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-3.5 transition-all">
              
              {/* Financial Breakdown (Itemized Table) */}
              <div className="space-y-2.5 pb-3.5 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    แจกแจงโครงสร้างต้นทุน (Cost Breakdown)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    สำหรับ {quantity} ตู้ ({containerLabel})
                  </span>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs shadow-2xs">
                  {/* 1. Ocean Freight */}
                  <div className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                      <span className="font-semibold text-slate-800">ค่าระวางเรือ Ocean Freight</span>
                      <span className="text-slate-400 text-[11px]">
                        (${cost.baseOf} x {quantity} ตู้)
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums">
                      ${Math.round(cost.baseOf * quantity).toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* 1.1 LKB Rail Fee if applicable */}
                  {isLKB && cost.lkbFee > 0 && (
                    <div className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors pl-6 bg-amber-50/30">
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber-600 shrink-0"></span>
                        <span className="font-medium text-slate-700">ค่าขนส่งทางรถไฟ ICD ลาดกระบัง (Rail Add-on)</span>
                        <span className="text-slate-400 text-[11px]">
                          (${cost.lkbFee} x {quantity} ตู้)
                        </span>
                      </div>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        ${Math.round(cost.lkbFee * quantity).toLocaleString('en-US')}
                      </span>
                    </div>
                  )}

                  {/* Local Charges Section Header */}
                  <div className="px-3 py-1.5 bg-slate-100/70 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>ค่าใช้จ่ายท้องถิ่นในไทย (Local Charges in Thailand):</span>
                    <span className="text-slate-900 font-bold tabular-nums">
                      รวม ${cost.itemizedLocalUsd.toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* 2. THC */}
                  <div className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors pl-6">
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0"></span>
                      <span className="text-slate-700">ค่าภาระยกขนตู้สินค้าที่ท่าเรือ (Terminal Handling Charge - THC)</span>
                      <span className="text-slate-400 text-[11px]">
                        (${Math.round(cost.thcUsd / quantity)} x {quantity} ตู้)
                      </span>
                    </div>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      ${cost.thcUsd.toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* 3. B/L Fee */}
                  <div className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors pl-6">
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0"></span>
                      <span className="text-slate-700">ค่าธรรมเนียมเอกสารใบตราส่งสินค้า (B/L Documentation Fee)</span>
                      <span className="text-slate-400 text-[11px]">(ต่อฉบับ)</span>
                    </div>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      ${cost.blUsd.toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* 4. Seal */}
                  <div className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors pl-6">
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0"></span>
                      <span className="text-slate-700">ค่าซีลล็อคตู้คอนเทนเนอร์ (Container Seal Security Fee)</span>
                      <span className="text-slate-400 text-[11px]">
                        (${Math.round(cost.sealUsd / quantity)} x {quantity} ตู้)
                      </span>
                    </div>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      ${cost.sealUsd.toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* 5. Telex / Surrender if exists */}
                  {cost.telexUsd > 0 && (
                    <div className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors pl-6">
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0"></span>
                        <span className="text-slate-700">ค่าธรรมเนียมปล่อยสินค้าทางโทรเลข (Telex Release / Surrender Fee)</span>
                        <span className="text-slate-400 text-[11px]">(ต่อฉบับ)</span>
                      </div>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        ${cost.telexUsd.toLocaleString('en-US')}
                      </span>
                    </div>
                  )}

                  {/* Total Row */}
                  <div className="p-2.5 bg-slate-100/90 flex items-center justify-between font-bold text-slate-900 border-t border-slate-200">
                    <span>รวมประมาณการต้นทุน All-In ทั้งหมด (Grand Total):</span>
                    <span className="tabular-nums text-base font-extrabold text-slate-900">
                      ${Math.round(cost.grandTotalUsd).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Carrier Specific Operational Rules */}
              <div className="space-y-1.5 text-slate-800 text-xs font-normal leading-relaxed">
                <div className="font-bold text-slate-900 text-xs pb-0.5">
                  ข้อกำหนดและเงื่อนไขการขนส่ง {rate.carrier}:
                </div>
                <div>
                  • <strong className="text-slate-900 font-bold">วันฟรีตู้ปลายทาง (Free Time):</strong>{' '}
                  <span>{knowledge.freeTime || '14 Days Combined'}</span>
                </div>
                <div>
                  • <strong className="text-slate-900 font-bold">ข้อจำกัดน้ำหนัก (Weight Limit):</strong>{' '}
                  <span>{knowledge.weightLimit || 'ตามพิกัดตู้มาตรฐาน ISO'}</span>
                </div>
                <div>
                  • <strong className="text-slate-900 font-bold">เอกสารความปลอดภัย (Manifest):</strong>{' '}
                  <span>{knowledge.manifest || 'ตามระเบียบศุลกากรปลายทาง'}</span>
                </div>
                
                {knowledge.specialRules && knowledge.specialRules.length > 0 && (
                  <ul className="space-y-1 text-slate-800 pt-1">
                    {knowledge.specialRules.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end text-slate-600 text-[11px] pt-2.5 border-t border-slate-200 gap-1 font-medium">
                <span className="text-slate-700 font-semibold">
                  รอบราคาตามประกาศสายเรือ: {actualValidity}
                </span>
              </div>

            </div>
          )}

        </div>

        {/* Ocean Freight Rate Box */}
        <div className="lg:border-l lg:border-slate-200 lg:pl-6 text-left lg:text-right flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center lg:justify-end gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                ค่าระวางเรือ Ocean Freight
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                USD
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-0.5">
              ${Math.round(cost.finalOfUsd).toLocaleString('en-US')}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              สำหรับ {quantity} ตู้ ({is20 ? "20'GP" : "40'HQ"})
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-2 pt-2 border-t border-slate-100 tabular-nums flex items-center lg:justify-end gap-2">
              <button
                type="button"
                onClick={() => onSelectContainer?.('20')}
                className={`cursor-pointer transition-colors ${
                  is20 ? 'text-blue-700 font-bold underline' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                20&apos;GP: ${rate.rate20}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSelectContainer?.('40hc')}
                className={`cursor-pointer transition-colors ${
                  !is20 ? 'text-blue-700 font-bold underline' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                40&apos;HQ: ${rate.rate40}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
