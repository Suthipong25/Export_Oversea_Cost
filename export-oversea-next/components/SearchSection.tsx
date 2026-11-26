'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { useRateCycle } from '../lib/rateCycle';
import { getRouteValidity } from '../lib/carrierValidity';

interface SearchSectionProps {
  origin: string;
  setOrigin: (val: string) => void;
  destination: string;
  setDestination: (val: string) => void;
  selectedCarrier: string;
  setSelectedCarrier: (val: string) => void;
  carriersList: string[];
  eqType: 'Dry' | 'Reefer' | 'Special';
  setEqType: (val: 'Dry' | 'Reefer' | 'Special') => void;
  isSoc: boolean;
  setIsSoc: (val: boolean) => void;
  isDg: boolean;
  setIsDg: (val: boolean) => void;
  onSearch: () => void;
  onReset: () => void;
  allPorts: string[];
}

const POPULAR_PORTS = [
  { name: 'Shanghai', flag: '🇨🇳' },
  { name: 'Tokyo', flag: '🇯🇵' },
  { name: 'Busan', flag: '🇰🇷' },
  { name: 'Keelung', flag: '🇹🇼' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'Port Klang', flag: '🇲🇾' },
  { name: 'Hochiminh', flag: '🇻🇳' },
  { name: 'Nhava Sheva', flag: '🇮🇳' },
  { name: 'Karachi', flag: '🇵🇰' },
  { name: 'Jebel Ali', flag: '🇦🇪' },
];

export const SearchSection: React.FC<SearchSectionProps> = ({
  origin,
  setOrigin,
  destination,
  setDestination,
  selectedCarrier,
  setSelectedCarrier,
  carriersList,
  eqType,
  setEqType,
  isSoc,
  setIsSoc,
  isDg,
  setIsDg,
  onSearch,
  onReset,
  allPorts
}) => {
  const { monthYear } = useRateCycle();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [filteredPorts, setFilteredPorts] = React.useState<string[]>([]);

  // กรองรายชื่อท่าเรือปลายทาง (603 พอร์ต) แบบ Real-time ตามคำที่พิมพ์
  // หากช่องว่างเปล่าจะแสดงรายชื่อท่าเรือทั้งหมดเรียง A-Z ให้เลื่อนเลือกได้ทันที
  const handleDestChange = (val: string) => {
    setDestination(val);
    if (!val.trim()) {
      setFilteredPorts(allPorts);
      setShowDropdown(true);
    } else {
      const q = val.toLowerCase();
      const matched = allPorts.filter(p => p.toLowerCase().includes(q));
      setFilteredPorts(matched);
      setShowDropdown(matched.length > 0);
    }
  };

  // เมื่อคลิกเลือกท่าเรือจาก Dropdown หรือพอร์ตยอดนิยม ให้ใส่ค่าและปิดเมนู (ไม่สั่งค้นหาอัตโนมัติ ต้องกดปุ่มค้นหาราคา)
  const selectPort = (port: string) => {
    setDestination(port);
    setShowDropdown(false);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 relative overflow-hidden">
      
      {/* Title & Validity Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ค้นหาและเปรียบเทียบอัตราค่าระวางเรือส่งออก
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            สืบค้นค่าระวาง Ocean Freight และ Local Charges ในไทยแบบ All-In จาก 18 สายเรือชั้นนำ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {selectedCarrier && selectedCarrier !== 'ALL'
              ? `รอบราคา ${selectedCarrier}: ${getRouteValidity(selectedCarrier)}`
              : `รอบราคา: อ้างอิงตามไฟล์ประกาศสายเรือ (${monthYear} • 14 - 30 วัน)`
            }
          </span>
        </div>
      </div>

      {/* 4-Control Search Grid: POL -> POD -> Carrier -> Search Button */}
      <div className="pb-6 border-b border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          
          {/* Origin POL (3 cols) */}
          <div className="md:col-span-3 relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5 h-5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
              <span>ท่าเรือต้นทาง (POL) <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-3.5 pr-8 py-3 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none cursor-pointer h-[46px]"
              >
                <option value="LCH">แหลมฉบัง (Laem Chabang)</option>
                <option value="BKK">กรุงเทพฯ (Bangkok PAT)</option>
              </select>
            </div>
          </div>

          {/* Destination POD Autocomplete (5 cols) */}
          <div className="md:col-span-4 relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between h-5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                <span>ท่าเรือปลายทาง (POD) <span className="text-red-500">*</span></span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {allPorts.length} พอร์ต
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={destination}
                placeholder="พิมพ์ชื่อท่าเรือ เช่น Tokyo, Shanghai, Busan..."
                className="w-full pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all h-[46px]"
                onChange={(e) => handleDestChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
                onFocus={() => {
                  const currentQuery = destination.trim().toLowerCase();
                  setFilteredPorts(currentQuery ? allPorts.filter(p => p.toLowerCase().includes(currentQuery)) : allPorts);
                  setShowDropdown(true);
                }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>

              {/* Dynamic Dropdown */}
              {showDropdown && filteredPorts.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 overflow-hidden text-xs">
                  <div className="bg-slate-50 px-3.5 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 select-none">
                    <span>ท่าเรือทั้งหมด ({filteredPorts.length} พอร์ต)</span>
                    <span className="text-[10px] font-normal text-slate-400">เลื่อนดู (A-Z) หรือพิมพ์ค้นหา</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-1.5 divide-y divide-slate-100">
                    {filteredPorts.map((p, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => selectPort(p)}
                        className="px-3.5 py-2.5 hover:bg-slate-100 hover:text-slate-900 cursor-pointer rounded-lg font-semibold flex items-center justify-between transition-colors"
                      >
                        <span>📍 {p}</span>
                        <span className="text-[10px] text-slate-400">เลือกท่าเรือนี้</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Carrier Selector (2 cols) */}
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between h-5">
              <span>สายเรือ (Carrier)</span>
            </label>
            <div className="relative">
              <select
                value={selectedCarrier}
                onChange={(e) => setSelectedCarrier(e.target.value)}
                className="w-full pl-3 pr-7 py-3 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none cursor-pointer h-[46px]"
              >
                <option value="ALL">ทุกลายเรือ (ทั้งหมด)</option>
                {carriersList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: ค้นหาราคา + ล้างข้อมูล (3 cols) */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onSearch}
              className="flex-1 h-[46px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Search className="w-4 h-4" />
              <span>ค้นหาราคา</span>
            </button>
            <button
              type="button"
              onClick={onReset}
              className="h-[46px] px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200 flex items-center justify-center gap-1.5 shrink-0"
              title="ล้างข้อมูลและเงื่อนไขทั้งหมด"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>ล้างข้อมูล</span>
            </button>
          </div>

        </div>

        {/* Popular Ports Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1">พอร์ตยอดนิยม:</span>
          {POPULAR_PORTS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => selectPort(p.name)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-all border border-slate-200/60 shadow-2xs cursor-pointer"
            >
              {p.name} {p.flag}
            </button>
          ))}
        </div>

      </div>

      {/* Equipment Type & Toggles */}
      <div className="pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          
          {/* Equipment Type Pills */}
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-3 block sm:inline mb-1 sm:mb-0">ประเภทอุปกรณ์:</span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {(['Dry', 'Reefer', 'Special'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEqType(t)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    eqType === t ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'Dry' ? 'Dry Container (ตู้แห้ง)' : t === 'Reefer' ? 'Reefer (ตู้เย็น)' : 'Special (OT/FR)'}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-5 text-xs font-semibold text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSoc}
                onChange={(e) => setIsSoc(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>ตู้ของลูกค้าเอง (SOC)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDg}
                onChange={(e) => setIsDg(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-red-700">สินค้าอันตราย (Hazardous DG)</span>
            </label>
          </div>

        </div>
      </div>

    </section>
  );
};
