'use client';

import React, { useState } from 'react';
import { X, Clock, Scale, FileText, Package } from 'lucide-react';
import { CarrierKnowledge } from '../types';
import { useRateCycle } from '../lib/rateCycle';

interface RemarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBase: Record<string, CarrierKnowledge>;
}

export const RemarksModal: React.FC<RemarksModalProps> = ({
  isOpen,
  onClose,
  knowledgeBase
}) => {
  const carriers = Object.keys(knowledgeBase);
  const { monthYear } = useRateCycle();
  const [activeCarrier, setActiveCarrier] = useState<string>(carriers[0] || 'TSL');

  if (!isOpen) return null;

  const currentKb = knowledgeBase[activeCarrier] || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-[#0A192F] text-white p-5 flex items-center justify-between border-b border-blue-900/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📖</span>
            <h3 className="text-lg font-extrabold tracking-tight">คู่มือข้อกำหนด & Remarks ของ 18 สายเรือ ({monthYear})</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Sidebar: Carriers List */}
          <div className="w-full md:w-60 border-r border-slate-200 bg-slate-50 overflow-y-auto p-2 space-y-1">
            {carriers.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCarrier(c)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  activeCarrier === c
                    ? 'font-extrabold bg-blue-100 text-blue-900 shadow-2xs'
                    : 'font-semibold text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                <span>{c}</span>
              </button>
            ))}
          </div>

          {/* Right Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            
            <div className="pb-3 border-b border-slate-200">
              <h4 className="text-xl font-extrabold text-[#0A192F]">{activeCarrier}</h4>
              <p className="text-xs text-slate-500 mt-0.5">ข้อกำหนดอย่างเป็นทางการ (Official Remarks & Guidelines) รอบ {monthYear}</p>
            </div>

            {/* Quick Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                <span className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-700" /> วันฟรีตู้ปลายทาง (Free Time at POD):
                </span>
                <span className="text-slate-900 font-bold">{currentKb.freeTime || '14 Days Combined'}</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Scale className="w-3.5 h-3.5 text-slate-600" /> ข้อจำกัดน้ำหนัก & OWC (Weight Limits):
                </span>
                <span className="text-slate-800 font-semibold">{currentKb.weightLimit || 'ตามพิกัดตู้มาตรฐาน ISO'}</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-600" /> กฎการสำแดง Manifest (AFR / AMS / ENS):
                </span>
                <span className="text-slate-800 font-semibold">{currentKb.manifest || 'ตามระเบียบศุลกากรปลายทาง'}</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Package className="w-3.5 h-3.5 text-slate-600" /> Local Charges มาตรฐานในไทย:
                </span>
                <span className="text-slate-800 font-semibold">{currentKb.localChargesNote || 'THC 2,800/4,300, B/L 1,500, Seal 300'}</span>
              </div>
            </div>

            {/* Operational Advisories */}
            <div className="space-y-2 mt-4 text-xs">
              <h5 className="font-black text-slate-900 text-sm">💡 เงื่อนไขปฏิบัติการ & ประกาศสายเรือที่ Sale ต้องระวัง:</h5>
              <ul className="space-y-1.5">
                {(currentKb.specialRules || []).map((r, i) => (
                  <li key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 font-semibold text-slate-800">
                    • {r}
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>ข้อมูลถูกต้องตามรอบตั๋วเรือ 1 - 30 พฤศจิกายน 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0A192F] hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
