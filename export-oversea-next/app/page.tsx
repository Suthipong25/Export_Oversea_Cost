'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import initialDb from '../data/all_rates_database.json';
import { supabase } from '../lib/supabase';
import { FreightRate, CarrierKnowledge, CalculatedRate } from '../types';
import { Header } from '../components/Header';
import { SearchSection } from '../components/SearchSection';
import { ContainerSelector } from '../components/ContainerSelector';
import { RateCard } from '../components/RateCard';
import { TariffTable } from '../components/TariffTable';
import { RemarksModal } from '../components/RemarksModal';
import { PdfUploaderModal } from '../components/PdfUploaderModal';
import { Zap, DollarSign, Search, AlertCircle, Table, LayoutGrid, Copy, Check } from 'lucide-react';
import { isPolMatch, isPodMatch } from '../lib/routeMatcher';
import { calculateFreightCost, parseTransitDays, DEFAULT_EXCHANGE_RATE, DEFAULT_LOCAL_CHARGES } from '../lib/costCalculator';
import { generateTariffTsv } from '../lib/exportTable';

interface SupabaseFreightRow {
  id: string;
  pol: string | null;
  pod: string;
  rate_20gp: string | number | null;
  rate_40gp: string | number | null;
  rate_40hq: string | number | null;
  transit_time: string | null;
  routing_type: string | null;
  service_name: string | null;
  frequency: string | null;
  remarks: string | null;
  valid_from: string | null;
  valid_to: string | null;
  carriers: { code: string; name: string } | null;
  ports: { country: string; region: string } | null;
}

export default function Home() {
  // ============================================================================
  // 1. Database & Connectivity States
  // โหลด Initial Cache ทันที (0ms) เพื่อให้เว็บเปิดติดทันทีแม้ Offline
  // ============================================================================
  const [rates, setRates] = useState<FreightRate[]>(initialDb.rates as FreightRate[]);
  const [knowledgeBase, setKnowledgeBase] = useState<Record<string, CarrierKnowledge>>(
    initialDb.carrierKnowledgeBase as Record<string, CarrierKnowledge>
  );
  const [isCloudLive, setIsCloudLive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ============================================================================
  // 2. Search, Filter & Equipment States
  // ============================================================================
  const [origin, setOrigin] = useState('LCH');
  const [destination, setDestination] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('ALL');

  // Committed / Applied Search Criteria (ต้องกด "ค้นหาราคา" จึงจะนำเงื่อนไขไปคำนวณและแสดงผล)
  const [appliedOrigin, setAppliedOrigin] = useState('LCH');
  const [appliedDestination, setAppliedDestination] = useState('');
  const [appliedCarrier, setAppliedCarrier] = useState<string>('ALL');
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [eqType, setEqType] = useState<'Dry' | 'Reefer' | 'Special'>('Dry');
  const [isSoc, setIsSoc] = useState(false);
  const [isDg, setIsDg] = useState(false);

  // ประเภทตู้และจำนวน (20 = 20'GP, 40 = 40'GP, 40hc = 40'HC)
  const [containerType, setContainerType] = useState('40hc');
  const [quantity, setQuantity] = useState(1);

  // การจัดเรียงและมุมมอง (การ์ด vs ตาราง 13 หัวข้อ)
  const [sortOption, setSortOption] = useState<'price' | 'transit'>('price');
  const [directOnly, setDirectOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [copiedTable, setCopiedTable] = useState(false);

  // ป๊อปอัป (Remarks & PDF Uploader)
  const [isRemarksOpen, setIsRemarksOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // ============================================================================
  // 3. Helper Functions & Toast Notification
  // ============================================================================
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  // รายชื่อท่าเรือปลายทาง (POD) ไม่ซ้ำ เรียง A-Z
  const allPorts = useMemo(() => {
    const portSet = new Set<string>();
    rates.forEach((r) => {
      if (r.pod?.trim()) portSet.add(r.pod.trim());
    });
    return Array.from(portSet).sort((a, b) => a.localeCompare(b));
  }, [rates]);

  // รายชื่อสายเรือทั้งหมดที่มีในระบบ
  const carriersList = useMemo(() => {
    return Array.from(new Set(rates.map((r) => r.carrier))).sort();
  }, [rates]);

  // ============================================================================
  // 4. External FX Rate & Supabase Real-time Sync
  // ============================================================================
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => res.json())
      .then((data) => {
        if (data?.rates?.THB) {
          const liveRate = parseFloat(Number(data.rates.THB).toFixed(2));
          setExchangeRate(liveRate);
        }
      })
      .catch((err) => console.error('Error fetching live FX rate:', err));
  }, []);

  const fetchLiveRates = useCallback(async () => {
    try {
      let allRows: SupabaseFreightRow[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('freight_rates')
          .select(`
            id, pol, pod, rate_20gp, rate_40gp, rate_40hq, transit_time, routing_type, service_name, frequency, remarks, valid_from, valid_to,
            carriers ( code, name ),
            ports ( country, region )
          `)
          .eq('is_active', true)
          .range(from, from + step - 1);

        if (error) {
          console.warn('Supabase fetch error:', error);
          break;
        }
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data as unknown as SupabaseFreightRow[]);
        if (data.length < step) break;
        from += step;
      }

      if (allRows.length > 0) {
        const initialRatesList = initialDb.rates as FreightRate[];
        const mapped: FreightRate[] = allRows.map((item) => {
          const carrierCode = item.carriers?.code || 'UNKNOWN';
          const existing = initialRatesList.find((r) => r.carrier === carrierCode && r.pod === item.pod);
          const fallbackCarrierRate = initialRatesList.find((r) => r.carrier === carrierCode);

          return {
            carrier: carrierCode,
            region: item.ports?.region || existing?.region || 'International',
            pol: item.pol || 'LCH / BKK',
            pod: item.pod,
            rate20: parseFloat(String(item.rate_20gp || 0)) || 0,
            rate40: parseFloat(String(item.rate_40gp || 0)) || 0,
            rate40hq: parseFloat(String(item.rate_40hq || item.rate_40gp || 0)) || 0,
            validFrom: item.valid_from || undefined,
            validTo: item.valid_to || undefined,
            validity: item.valid_to
              ? `${item.valid_from ? item.valid_from.substring(5) : ''} - ${item.valid_to}`
              : '30-Nov-2026',
            tt: item.transit_time || '',
            routing: (item.routing_type as 'DIRECT' | 'TRANSSHIPMENT') || 'DIRECT',
            routingDetail: item.service_name || '',
            schedule: item.frequency || '',
            notes: item.remarks || '',
            localCharges: existing?.localCharges || fallbackCarrierRate?.localCharges || DEFAULT_LOCAL_CHARGES,
          };
        });

        setRates(mapped);
        setIsCloudLive(true);
        console.log(`✅ Loaded ${mapped.length} live rates from Supabase Cloud!`);
      }
    } catch (e) {
      console.warn('Network error fetching live rates:', e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchLiveRates();
    };
    void init();

    const channel = supabase
      .channel('freight-rates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'freight_rates' },
        (payload: unknown) => {
          console.log('⚡ Supabase Real-time payload:', payload);
          showToast('🔔 มีการอัปเดตราคาใหม่จาก Supabase Cloud แบบ Real-time!');
          void fetchLiveRates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveRates, showToast]);

  // ============================================================================
  // 5. Cost & Filter Engine (Memoized)
  // ============================================================================
  const filteredRates: CalculatedRate[] = useMemo(() => {
    if (!hasSearched) {
      return [];
    }
    // หากยังไม่ได้ระบุพอร์ตปลายทาง และไม่ได้เลือกสายเรือเฉพาะ (เลือก ALL) ให้รอการค้นหา
    if (!appliedDestination.trim() && appliedCarrier === 'ALL') {
      return [];
    }

    const is20 = containerType === '20';
    const isLKB = appliedOrigin === 'LKB';

    // กรองเที่ยวเรือตามเงื่อนไขค้นหาที่ยืนยันแล้ว (Applied Criteria)
    const rawMatched = rates.filter((r) => {
      const podMatch = appliedDestination.trim() ? isPodMatch(r.pod, appliedDestination) : true;
      const polMatch = isPolMatch(r.pol, appliedOrigin);
      const directMatch = directOnly ? r.routing.toUpperCase() === 'DIRECT' : true;
      const carrierMatch = appliedCarrier === 'ALL' || r.carrier === appliedCarrier;
      const isReeferRoute =
        r.pod.toLowerCase().includes('reefer') ||
        r.routingDetail.toLowerCase().includes('reefer') ||
        r.region.toLowerCase().includes('reefer');
      const eqMatch = eqType === 'Reefer' ? isReeferRoute : true;
      const hasRate = is20 ? r.rate20 > 0 : (r.rate40hq && r.rate40hq > 0) || r.rate40 > 0;
      return podMatch && polMatch && directMatch && carrierMatch && eqMatch && hasRate;
    });

    // ตัดการ์ดซ้ำกรณีเลือก LKB เมื่อมีแถวระบุ Lat Krabang โดยตรงอยู่แล้ว
    const matched = isLKB
      ? rawMatched.filter((r) => {
          const isExplicitLkb = r.pol.toUpperCase().includes('LAT KRABANG') || r.pol.toUpperCase() === 'LKB';
          if (isExplicitLkb) return true;
          const hasSibling = rawMatched.some(
            (other) =>
              other !== r &&
              other.carrier === r.carrier &&
              other.pod === r.pod &&
              other.routingDetail === r.routingDetail &&
              (other.pol.toUpperCase().includes('LAT KRABANG') || other.pol.toUpperCase() === 'LKB')
          );
          return !hasSibling;
        })
      : rawMatched;

    // คำนวณต้นทุน All-In สำหรับแต่ละเที่ยวเรือ
    const calculated: CalculatedRate[] = matched.map((item) => {
      const costBreakdown = calculateFreightCost({
        rate: item,
        containerType,
        quantity,
        origin: appliedOrigin,
        exchangeRate,
      });

      return {
        ...item,
        ofUsd: costBreakdown.finalOfUsd,
        grandTotalUsd: costBreakdown.grandTotalUsd,
        days: parseTransitDays(item.tt),
        costBreakdown,
      };
    });

    // จัดเรียงผลลัพธ์
    calculated.sort((a, b) => {
      if (sortOption === 'price') return a.ofUsd - b.ofUsd;
      return a.days - b.days;
    });

    return calculated;
  }, [
    rates,
    appliedDestination,
    appliedOrigin,
    appliedCarrier,
    containerType,
    quantity,
    directOnly,
    sortOption,
    hasSearched,
    exchangeRate,
    eqType,
  ]);

  // ค่าต่ำสุดสำหรับติด Badge
  const minPrice = useMemo(() => {
    if (filteredRates.length === 0) return 0;
    return Math.min(...filteredRates.map((r) => r.ofUsd));
  }, [filteredRates]);

  const minDays = useMemo(() => {
    const valid = filteredRates.filter((r) => r.days < 99);
    return valid.length > 0 ? Math.min(...valid.map((r) => r.days)) : 0;
  }, [filteredRates]);

  // ============================================================================
  // 6. Action Handlers
  // ============================================================================
  const handleReset = () => {
    setOrigin('LCH');
    setDestination('');
    setSelectedCarrier('ALL');
    setAppliedOrigin('LCH');
    setAppliedDestination('');
    setAppliedCarrier('ALL');
    setContainerType('40hc');
    setQuantity(1);
    setDirectOnly(false);
    setHasSearched(false);
  };

  const handleCopyTable = () => {
    const tsv = generateTariffTsv({
      rates: filteredRates,
      origin: appliedOrigin,
      knowledgeBase,
      exchangeRate,
    });
    navigator.clipboard.writeText(tsv);
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 3000);
    showToast('📋 คัดลอกข้อมูลตาราง 13 หัวข้อลง Clipboard แล้ว (วางลง Excel ได้ทันที!)');
  };

  const handleApplyPdfData = async (
    carrier: string,
    newRoutes: FreightRate[],
    knowledge: CarrierKnowledge,
    remarksSummary: string,
    validityDates?: { validFrom: string; validTo: string }
  ) => {
    // 1. Optimistic Update บนหน้าจอทันที
    const targetPodSet = new Set(newRoutes.map((r) => (r.pod || '').trim().toLowerCase()));
    setRates((prev) => {
      const remaining = prev.filter(
        (r) => !(r.carrier === carrier && targetPodSet.has((r.pod || '').trim().toLowerCase()))
      );
      return [...newRoutes, ...remaining];
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
          ...(prev[carrier]?.specialRules || []),
        ],
      },
    }));

    showToast(`⏳ กำลังบันทึกข้อมูล ${carrier} (${newRoutes.length} เส้นทาง) ลง Supabase Cloud...`);

    // 2. Persistent Sync ไปยัง Cloud API
    try {
      const adminToken = process.env.NEXT_PUBLIC_ADMIN_SYNC_TOKEN || 'export_oversea_secure_admin_2026';
      const res = await fetch('/api/sync-carrier-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          carrier,
          routes: newRoutes,
          knowledge,
          remarksSummary,
          validFrom: validityDates?.validFrom,
          validTo: validityDates?.validTo,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🎉 บันทึกลง Supabase Cloud สำเร็จ: ${carrier} (${data.count} เส้นทาง)`);
        fetchLiveRates();
      } else {
        showToast(`⚠️ บันทึกไม่สำเร็จ: ${data.error || 'โปรดตรวจสอบสิทธิ์'}`);
      }
    } catch (err) {
      console.error('Failed to sync rates:', err);
      showToast('⚠️ การเชื่อมต่อ Cloud ขัดข้อง แต่ใช้งานในหน้านี้ได้ปกติ');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-emerald-500 shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-bounce">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            🔔
          </div>
          <p className="text-xs font-bold text-slate-900">{toastMessage}</p>
        </div>
      )}

      {/* Header */}
      <Header
        onOpenRemarks={() => setIsRemarksOpen(true)}
        onOpenPdfUploader={() => setIsPdfModalOpen(true)}
        isCloudLive={isCloudLive}
        ratesCount={rates.length}
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
            if (destination.trim() || selectedCarrier !== 'ALL') {
              setAppliedOrigin(origin);
              setAppliedDestination(destination);
              setAppliedCarrier(selectedCarrier);
              setHasSearched(true);
            }
          }}
          onReset={handleReset}
          allPorts={allPorts}
        />

        {/* Container Size Selector */}
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
            onSelect={(t, q) => {
              setContainerType(t);
              setQuantity(q);
            }}
            onAdjustQty={(delta) => setQuantity((prev) => Math.max(1, prev + delta))}
          />
        </div>

        {/* Dynamic Display: Empty Prompt vs Results */}
        {!hasSearched || (!appliedDestination.trim() && appliedCarrier === 'ALL') ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-700">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">
              เลือกท่าเรือปลายทาง หรือเลือกสายเรือเพื่อดูข้อมูลและราคา
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
              ระบุท่าเรือปลายทาง (POD) หรือเลือกสายเรือที่ต้องการ จากนั้นกดปุ่ม <strong>&ldquo;ค้นหาราคา&rdquo;</strong> เพื่อแสดงข้อมูลค่าระวาง
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">หรือคลิกเลือกพอร์ตทดสอบ:</span>
              {['Shanghai', 'Tokyo', 'Busan', 'Singapore', 'Jebel Ali'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setDestination(p);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-2xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">
                ไม่พบข้อมูลเที่ยวเรือที่ให้บริการในเส้นทางนี้
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                ไม่มีสายเรือให้บริการจาก <strong>{appliedOrigin === 'LCH' ? 'แหลมฉบัง (LCH)' : 'กรุงเทพฯ (BKK)'}</strong> ไปยัง <strong>&ldquo;{appliedDestination || 'พอร์ตปลายทาง'}&rdquo;</strong> ข้อมูลค่าระวางจึงไม่แสดงขึ้นมา
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 max-w-md mx-auto text-left space-y-1.5">
              <div className="font-bold text-slate-800">💡 ข้อแนะนำ:</div>
              <div>• ตรวจสอบการสะกดชื่อท่าเรือปลายทาง (POD) หรือคลิกเลือกจากรายชื่อท่าเรือในกล่องค้นหา</div>
              <div>• หากเลือกท่าเรือกรุงเทพฯ (BKK) ลองสลับเป็น <strong>แหลมฉบัง (Laem Chabang)</strong> เพื่อดูเที่ยวเรือหลักของทุกสายเรือ</div>
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
                    {appliedOrigin === 'LCH' ? 'Laem Chabang (THLCH)' : appliedOrigin === 'BKK' ? 'Bangkok (THBKK)' : 'Lat Krabang ICD (THLKB)'} ➔ {appliedDestination || 'ทุกท่าเรือปลายทาง'}
                    {appliedCarrier !== 'ALL' && (
                      <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        เฉพาะสายเรือ {appliedCarrier}
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

                {/* Copy Table to Clipboard */}
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
                    origin={appliedOrigin}
                    exchangeRate={exchangeRate}
                    onSelectContainer={setContainerType}
                    isBestPrice={r.ofUsd === minPrice}
                    isFastest={r.days === minDays && r.days < 99}
                  />
                ))}
              </div>
            ) : (
              <TariffTable
                rates={filteredRates}
                origin={appliedOrigin}
                knowledgeBase={knowledgeBase}
                exchangeRate={exchangeRate}
              />
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
