'use client';

import React from 'react';
import { FreightRate, CarrierKnowledge } from '../types';
import { getRouteValidity, getLkbAddonValues } from '../lib/carrierValidity';
import { formatLocalChargesSummary, DEFAULT_EXCHANGE_RATE } from '../lib/costCalculator';

interface TariffTableProps {
  rates: FreightRate[];
  origin: string;
  knowledgeBase: Record<string, CarrierKnowledge>;
  exchangeRate?: number;
}

export const TariffTable: React.FC<TariffTableProps> = ({
  rates,
  origin,
  knowledgeBase,
  exchangeRate = DEFAULT_EXCHANGE_RATE,
}) => {
  const originLabel =
    origin === 'LCH'
      ? 'Laem Chabang'
      : origin === 'BKK'
      ? 'Bangkok'
      : 'Lat Krabang';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="text-xs">
          <span className="font-bold text-slate-900 text-sm">
            ตารางเปรียบเทียบอัตราค่าระวาง 13 หัวข้อมาตรฐาน
          </span>
          <p className="text-slate-500 mt-0.5">
            เรียงข้อมูลตามมาตรฐาน Tariff Sheet (กดปุ่ม &ldquo;คัดลอกลง Excel&rdquo; ด้านบนเพื่อคัดลอกข้อมูลได้ทันที)
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded self-start sm:self-auto">
          {rates.length} รายการ
        </span>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px] whitespace-nowrap">
              <th className="py-3 px-3">POL</th>
              <th className="py-3 px-3">POD</th>
              <th className="py-3 px-3">COUNTRY</th>
              <th className="py-3 px-3">CARRIER</th>
              <th className="py-3 px-3 text-center">CURRENCY</th>
              <th className="py-3 px-3 text-right">RATE 20&apos;GP</th>
              <th className="py-3 px-3 text-right">RATE 40&apos;HQ</th>
              <th className="py-3 px-3 text-center">LKB ADD ON PER 20&apos;/40&apos;</th>
              <th className="py-3 px-3 text-center">T/S</th>
              <th className="py-3 px-3 text-center">T/T</th>
              <th className="py-3 px-3">F/T</th>
              <th className="py-3 px-3">Valid date</th>
              <th className="py-3 px-3 text-emerald-300">LOCAL CHARGE (THB)</th>
              <th className="py-3 px-4 min-w-[200px]">REMARKS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {rates.map((r, i) => {
              const lkb = getLkbAddonValues(r.carrier, r.notes);
              const validity = r.validity || getRouteValidity(r.carrier, r.region);
              const kb = knowledgeBase[r.carrier] || {};
              const lcSummary = formatLocalChargesSummary(r.localCharges);

              return (
                <tr key={`${r.carrier}-${r.pod}-${i}`} className="hover:bg-blue-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    {r.pol || originLabel}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                    {r.pod}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {r.region || 'International'}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-blue-900 whitespace-nowrap">
                    {r.carrier}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      USD
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-900 whitespace-nowrap">
                    ${r.rate20.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums text-slate-900 whitespace-nowrap">
                    ${r.rate40.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center text-amber-900 font-semibold whitespace-nowrap text-[11px]">
                    +${lkb.add20} / +${lkb.add40}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        r.routing === 'DIRECT'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {r.routing === 'DIRECT' ? 'DIRECT' : 'T/S'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                    {r.tt}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                    {kb.freeTime || '14 Days Combined'}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-semibold">
                    {validity}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-700">
                    {lcSummary}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                    {r.notes || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
