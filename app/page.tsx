'use client';

import React, { useState, useEffect, useMemo } from 'react';
import initialDb from '../data/all_rates_database.json';
import { supabase } from '../lib/supabase';
import { FreightRate, CarrierKnowledge } from '../types';
import { Header } from '../components/Header';
import { SearchSection } from '../components/SearchSection';
import { ContainerSelector } from '../components/ContainerSelector';
import { RateCard } from '../components/RateCard';
import { RemarksModal } from '../components/RemarksModal';
import { PdfUploaderModal } from '../components/PdfUploaderModal';
import { Zap, DollarSign, Search, AlertCircle, Table, LayoutGrid, Copy, Check } from 'lucide-react';
import { isPolMatch, isPodMatch } from '../lib/routeMatcher';
import { getRouteValidity, getLkbAddonValues } from '../lib/carrierValidity';

export default function Home() {
  // Database States
  const [rates, setRates] = useState<FreightRate[]>(initialDb.rates as FreightRate[]);
  const [knowledgeBase, setKnowledgeBase] = useState<Record<string, CarrierKnowledge>>(
    initialDb.carrierKnowledgeBase as Record<string, CarrierKnowledge>
  );
  const allPorts = useMemo(() => {
    const set = new Set<string>();
    rates.forEach(r => {
      if (r.pod && r.pod.trim()) set.add(r.pod.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rates]);

  // Search & Filter States
  const [origin, setOrigin] = useState('LCH');
  const [destination, setDestination] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('ALL');
  const [exchangeRate, setExchangeRate] = useState<number>(33.86);
  const [eqType, setEqType] = useState<'Dry' | 'Reefer' | 'Special'>('Dry');
  const [isSoc, setIsSoc] = useState(false);
  const [isDg, setIsDg] = useState(false);

  // Container Selection
  const [containerType, setContainerType] = useState('40hc');
  const [quantity, setQuantity] = useState(1);

  // Sort & Filters
  const [sortOption, setSortOption] = useState<'price' | 'transit'>('price');
  const [directOnly, setDirectOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [copiedTable, setCopiedTable] = useState(false);

  // Modals
  const [isRemarksOpen, setIsRemarksOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Realtime notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch Live USD to THB Exchange Rate
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates && data.rates.THB) {
          const liveRate = parseFloat(Number(data.rates.THB).toFixed(2));
          setExchangeRate(liveRate);
        }
      })
      .catch((err) => console.error('Error fetching live FX rate:', err));
  }, []);

  // 1. Supabase Real-time Listener on Mount
  useEffect(() => {
    // Listen for live updates
    const channel = supabase
      .channel('freight-rates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'freight_rates' },
        (payload) => {
          console.log('⚡ Supabase Real-time payload:', payload);
          showToast('🔔 มีการอัปเดตราคาใหม่จาก Supabase Cloud แบบ Real-time!');
          fetchLiveRates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleCopyTable = () => {
    const headers = [
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
      'LOCAL CHARGE',
      'REMARKS'
    ];

    const rows = filteredRates.map((r) => {
      const lkb = getLkbAddonValues(r.carrier, r.notes);
      const validity = r.validity || getRouteValidity(r.carrier, r.region);
      const kb = knowledgeBase[r.carrier] || {};
      const lc = r.localCharges || { thc20: 2800, thc40: 4300, bl: 1500, seal: 300, telex: 1500 };
      const thcUsd = Math.round(lc.thc40 / (exchangeRate || 33.86));
      const blUsd = Math.round(lc.bl / (exchangeRate || 33.86));
      const sealUsd = Math.round(lc.seal / (exchangeRate || 33.86));
      const lcSummary = `THC: $${thcUsd} | B/L: $${blUsd} | Seal: $${sealUsd}`;

      return [
        r.pol || (origin === 'LCH' ? 'Laem Chabang' : origin === 'BKK' ? 'Bangkok' : 'Lat Krabang'),
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
        r.notes || '-'
      ].join('\t');
    });

    const fullTsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(fullTsv);
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 3000);
    showToast('📋 คัดลอกข้อมูลตาราง 13 หัวข้อลง Clipboard แล้ว (วางลง Excel ได้ทันที!)');
  };

  const fetchLiveRates = async () => {
    try {
      const { data, error } = await supabase
        .from('freight_rates')
        .select(`
          id, pol, pod, rate_20gp, rate_40gp, transit_time, routing_type, service_name, frequency, remarks,
          carriers ( code, name )
        `)
        .eq('is_active', true)
        .limit(1000);

      if (error) {
        console.warn('Supabase fetch error:', error);
        return;
      }

      if (data && data.length > 0) {
        const mapped: FreightRate[] = data.map((item: any) => {
          const carrierCode = item.carriers?.code || 'UNKNOWN';
          const existing = rates.find(r => r.carrier === carrierCode);
          return {
            carrier: carrierCode,
            region: 'Asia',
            pol: item.pol || 'LCH / BKK',
            pod: item.pod,
            rate20: parseFloat(item.rate_20gp) || 0,
            rate40: parseFloat(item.rate_40gp) || 0,
            tt: item.transit_time || '',
            routing: item.routing_type || 'DIRECT',
            routingDetail: item.service_name || '',
            schedule: item.frequency || '',
            notes: item.remarks || '',
            localCharges: existing?.localCharges || { thc20: 2800, thc40: 4300, bl: 1500, seal: 300, telex: 1500 }
          };
        });
        setRates(mapped);
      }
    } catch (e) {
      console.warn('Network error fetching live rates:', e);
    }
  };

  // 2. Filter & Calculate Rates
  const filteredRates = useMemo(() => {
    if (!hasSearched || !destination.trim()) {
      return [];
    }

    const q = destination.toLowerCase().trim();
    const is20 = containerType === '20';
    const isLKB = origin === 'LKB';

    const matched = rates.filter((r) => {
      const podMatch = isPodMatch(r.pod, destination);
      const polMatch = isPolMatch(r.pol, origin);
      const directMatch = directOnly ? r.routing.toUpperCase() === 'DIRECT' : true;
      const carrierMatch = selectedCarrier === 'ALL' || r.carrier === selectedCarrier;
      return podMatch && polMatch && directMatch && carrierMatch;
    });

    // Calculate total cost for sorting & comparison
    const calculated = matched.map((item) => {
      const baseOf = is20 ? item.rate20 : item.rate40;
      const lkbFee = isLKB ? (is20 ? 200 : 250) : 0;
      const ofUsd = (baseOf + lkbFee) * quantity;

      const lc = item.localCharges || { thc20: 2800, thc40: 4300, bl: 1500, seal: 300, telex: 1500 };
      const baseThc = is20 ? lc.thc20 : lc.thc40;
      const localThb = (baseThc + lc.seal) * quantity + (lc.bl + (lc.telex || 0));
      const fx = exchangeRate > 0 ? exchangeRate : 36.00;
      const localUsd = localThb / fx;

      const grandTotalUsd = ofUsd + localUsd;

      // Extract days
      const daysMatch = item.tt.match(/\d+/);
      const days = daysMatch ? parseInt(daysMatch[0], 10) : 99;

      return {
        ...item,
        ofUsd,
        grandTotalUsd,
        days
      };
    });

    // Sort
    calculated.sort((a, b) => {
      if (sortOption === 'price') return a.ofUsd - b.ofUsd;
      return a.days - b.days;
    });

    return calculated;
  }, [rates, destination, origin, containerType, quantity, directOnly, sortOption, selectedCarrier, hasSearched, exchangeRate]);

  const minPrice = useMemo(() => {
    if (filteredRates.length === 0) return 0;
    return Math.min(...filteredRates.map(r => (r as any).ofUsd ?? r.grandTotalUsd));
  }, [filteredRates]);

  const minDays = useMemo(() => {
    if (filteredRates.length === 0) return 0;
    const valid = filteredRates.filter(r => r.days < 99);
    if (valid.length === 0) return 0;
    return Math.min(...valid.map(r => r.days));
  }, [filteredRates]);

  // 3. Handle Applied PDF Data
  const handleReset = () => {
    setOrigin('LCH');
    setDestination('');
    setContainerType('40hc');
    setQuantity(1);
    setDirectOnly(false);
    setSelectedCarrier('ALL');
    setHasSearched(false);
  };

  const handleApplyPdfData = (
    carrier: string,
    newRoutes: FreightRate[],
    knowledge: CarrierKnowledge,
    remarksSummary: string
  ) => {
    setRates((prev) => {
      const filtered = prev.filter(r => r.carrier !== carrier);
      return [...newRoutes, ...filtered];
    });

    setKnowledgeBase((prev) => ({
      ...prev,
      [carrier]: {
        ...prev[carrier],
        fullName: knowledge.fullName || carrier,
        freeTime: knowledge.freeTime || prev[carrier]?.freeTime || '14 Days Combined',
        weightLimit: knowledge.weightLimit || prev[carrier]?.weightLimit || 'ตามพิกัดตู้มาตรฐาน ISO',
        manifest: knowledge.manifest || prev[carrier]?.manifest || 'ตามระเบียบศุลกากรปลายทาง',
        specialRules: [
          ...(knowledge.specialRules || []),
          ...(remarksSummary ? [`สรุปเงื่อนไข: ${remarksSummary}`] : []),
          ...(prev[carrier]?.specialRules || [])
        ]
      }
    }));

    showToast(`🎉 อัปเดตข้อมูล ${carrier} สำเร็จ: ${newRoutes.length} เส้นทาง พร้อมข้อกำหนด Remarks เรียบร้อย!`);
  };

  const carriersList = useMemo(() => {
    return Array.from(new Set(rates.map(r => r.carrier))).sort();
  }, [rates]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-emerald-500 shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">🔔</div>
          <p className="text-xs font-bold text-slate-900">{toastMessage}</p>
        </div>
      )}

      {/* Header */}
      <Header
        onOpenRemarks={() => setIsRemarksOpen(true)}
        onOpenPdfUploader={() => setIsPdfModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        
        {/* Search Section */}
        <SearchSection
          origin={origin}
          setOrigin={setOrigin}
          destination={destination}
          setDestination={setDestination}
          selectedCarrier={selectedCarrier}
          setSelectedCarrier={setSelectedCarrier}
          carriersList={carriersList}
          eqType={eqType}
          setEqType={setEqType}
          isSoc={isSoc}
          setIsSoc={setIsSoc}
          isDg={isDg}
          setIsDg={setIsDg}
          onSearch={() => {
            if (destination.trim()) setHasSearched(true);
          }}
          onReset={handleReset}
          allPorts={allPorts}
        />

        {/* Container Size Selector (4 Cards in 1 Row) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              เลือกขนาดตู้คอนเทนเนอร์ (Container Size & Volume):
            </label>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              ↺ ล้างค่าค้นหา
            </button>
          </div>
          <ContainerSelector
            activeType={containerType}
            quantity={quantity}
            onSelect={(t, q) => { setContainerType(t); setQuantity(q); }}
            onAdjustQty={(delta) => setQuantity((prev) => Math.max(1, prev + delta))}
          />
        </div>

        {/* Dynamic Display: Empty Prompt vs Results */}
        {!hasSearched || !destination.trim() ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-700">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">
              เลือกท่าเรือปลายทางเพื่อดูข้อมูลและราคาของสายเรือ
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
              ระบุท่าเรือปลายทาง (POD) หรือคลิกเลือกจากพอร์ตยอดนิยมด้านบน จากนั้นกดปุ่ม <strong>&ldquo;ค้นหาราคา&rdquo;</strong> เพื่อแสดงข้อมูลค่าระวางจากสายเรือ
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">หรือคลิกทดสอบดูทันที:</span>
              {['Shanghai', 'Tokyo', 'Busan', 'Singapore', 'Jebel Ali'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setDestination(p);
                    setHasSearched(true);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : filteredRates.length === 0 ? (
          /* Route Not Found / Mismatch Alert: No Cards & No Results Bar */
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-2xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                ไม่พบข้อมูลเที่ยวเรือที่ให้บริการในเส้นทางนี้
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                ไม่มีสายเรือให้บริการจาก <strong>{origin === 'LCH' ? 'แหลมฉบัง (LCH)' : origin === 'BKK' ? 'กรุงเทพฯ (BKK)' : 'ICD ลาดกระบัง (LKB)'}</strong> ไปยัง <strong>&ldquo;{destination}&rdquo;</strong> ข้อมูลค่าระวางจึงไม่แสดงขึ้นมา
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 max-w-md mx-auto text-left space-y-1.5">
              <div className="font-bold text-slate-800">💡 ข้อแนะนำ:</div>
              <div>• ตรวจสอบการสะกดชื่อท่าเรือปลายทาง (POD) หรือคลิกเลือกจาก 368 ท่าเรือในกล่องค้นหา</div>
              <div>• หากเลือกท่าเรือกรุงเทพฯ (BKK) หรือ ICD ลาดกระบัง ลองสลับเป็น <strong>แหลมฉบัง (Laem Chabang)</strong> เพื่อดูเที่ยวเรือหลักของทุกสายเรือ</div>
            </div>
          </div>
        ) : (
          <>
            {/* Results Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {origin === 'LCH' ? 'Laem Chabang (THLCH)' : origin === 'BKK' ? 'Bangkok (THBKK)' : 'Lat Krabang ICD (THLKB)'} ➔ {destination}
                    {selectedCarrier !== 'ALL' && (
                      <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        เฉพาะสายเรือ {selectedCarrier}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    พบทั้งหมด <strong>{filteredRates.length}</strong> เที่ยวเรือ/สายเรือที่ให้บริการในรอบนี้
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {/* View Mode Toggle */}
                <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200/80">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="มุมมองการ์ด"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>การ์ด</span>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="มุมมองตารางเปรียบเทียบ 13 หัวข้อ"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>ตาราง 13 หัวข้อ</span>
                  </button>
                </div>

                {/* Copy Table to Clipboard Button */}
                <button
                  onClick={handleCopyTable}
                  className="px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  title="คัดลอกตาราง 13 หัวข้อไปวางใน Excel หรือ Google Sheets"
                >
                  {copiedTable ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTable ? 'คัดลอกแล้ว!' : 'คัดลอกลง Excel'}</span>
                </button>

                {/* Sort Option */}
                <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200/80">
                  <button
                    onClick={() => setSortOption('price')}
                    className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      sortOption === 'price' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>ราคาต่ำสุด</span>
                  </button>
                  <button
                    onClick={() => setSortOption('transit')}
                    className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      sortOption === 'transit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>เร็วที่สุด</span>
                  </button>
                </div>

                <button
                  onClick={() => setDirectOnly(!directOnly)}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    directOnly ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{directOnly ? '✓ เฉพาะเรือตรง (Direct)' : 'รวมเรือต่อ (T/S)'}</span>
                </button>
              </div>
            </div>

            {/* Content Display: Cards vs 13-Column Table View */}
            {viewMode === 'cards' ? (
              <div className="space-y-4">
                {filteredRates.map((r, idx) => (
                  <RateCard
                    key={`${r.carrier}-${r.pod}-${idx}`}
                    rate={r}
                    knowledge={knowledgeBase[r.carrier]}
                    containerType={containerType}
                    quantity={quantity}
                    origin={origin}
                    exchangeRate={exchangeRate}
                    onSelectContainer={setContainerType}
                    isBestPrice={((r as any).ofUsd ?? r.grandTotalUsd) === minPrice}
                    isFastest={r.days === minDays && r.days < 99}
                  />
                ))}
              </div>
            ) : (
              /* 13-Column Standard Tariff Table */
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 text-sm">ตารางเปรียบเทียบอัตราค่าระวาง 13 หัวข้อมาตรฐาน</span>
                    <p className="text-slate-500 mt-0.5">เรียงข้อมูลตามมาตรฐาน Tariff Sheet (กดปุ่ม &ldquo;คัดลอกลง Excel&rdquo; ด้านบนเพื่อคัดลอกข้อมูลได้ทันที)</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded self-start sm:self-auto">
                    {filteredRates.length} รายการ
                  </span>
                </div>

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
                        <th className="py-3 px-3">LOCAL CHARGE</th>
                        <th className="py-3 px-4 min-w-[200px]">REMARKS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {filteredRates.map((r, i) => {
                        const lkb = getLkbAddonValues(r.carrier, r.notes);
                        const validity = r.validity || getRouteValidity(r.carrier, r.region);
                        const kb = knowledgeBase[r.carrier] || {};
                        const lc = r.localCharges || { thc20: 2800, thc40: 4300, bl: 1500, seal: 300, telex: 1500 };

                        return (
                          <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                              {r.pol || (origin === 'LCH' ? 'Laem Chabang' : origin === 'BKK' ? 'Bangkok' : 'Lat Krabang')}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">{r.pod}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">{r.region || 'International'}</td>
                            <td className="py-2.5 px-3 font-bold text-blue-900 whitespace-nowrap">{r.carrier}</td>
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
                              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                r.routing === 'DIRECT' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {r.routing === 'DIRECT' ? 'DIRECT' : 'T/S'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-800 whitespace-nowrap">{r.tt}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">{kb.freeTime || '14 Days Combined'}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-semibold">{validity}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-slate-700">
                              THC: ${Math.round(lc.thc40 / (exchangeRate || 33.86))} | B/L: ${Math.round(lc.bl / (exchangeRate || 33.86))} | Seal: ${Math.round(lc.seal / (exchangeRate || 33.86))}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 text-[11px]">{r.notes || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Remarks Modal */}
      <RemarksModal
        isOpen={isRemarksOpen}
        onClose={() => setIsRemarksOpen(false)}
        knowledgeBase={knowledgeBase}
      />

      {/* PDF Uploader Modal */}
      <PdfUploaderModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onApplyData={handleApplyPdfData}
        carriers={carriersList}
      />

    </div>
  );
}
