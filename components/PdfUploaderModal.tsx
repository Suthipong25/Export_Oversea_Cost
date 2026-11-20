'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, FileText, Clock, Scale, ShieldCheck, ListPlus } from 'lucide-react';
import { FreightRate, CarrierKnowledge } from '../types';
import { getDefaultLocalCharges } from '../lib/costCalculator';

interface ApiRouteItem {
  pod?: string;
  pol?: string;
  region?: string;
  rate20?: number;
  rate40?: number;
  rate40hq?: number;
  tt?: string;
  routing?: string;
  routingDetail?: string;
  schedule?: string;
  notes?: string;
}

interface PdfUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (
    carrier: string,
    newRoutes: FreightRate[],
    knowledge: CarrierKnowledge,
    remarksSummary: string,
    validityDates?: { validFrom: string; validTo: string }
  ) => Promise<boolean | void> | void;
  carriers: string[];
}

export const PdfUploaderModal: React.FC<PdfUploaderModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  carriers
}) => {
  const [selectedCarrier, setSelectedCarrier] = useState('AUTO');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'routes' | 'remarks'>('routes');

  // Extracted Data States
  const [detectedCarrier, setDetectedCarrier] = useState('');
  const [extractedRoutes, setExtractedRoutes] = useState<FreightRate[]>([]);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Remarks / Guidelines States
  const [freeTime, setFreeTime] = useState('');
  const [weightLimit, setWeightLimit] = useState('');
  const [manifest, setManifest] = useState('');
  const [specialRulesText, setSpecialRulesText] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [sourceStatus, setSourceStatus] = useState<string>('');

  if (!isOpen) return null;

  /**
   * อัปเดตค่าในแต่ละแถวของตารางพรีวิวเส้นทาง (Inline Route Editor)
   * ช่วยให้ผู้ใช้แก้ไขชื่อพอร์ต ต้นทาง หรือตัวเลขราคาได้ทันทีก่อนกดยืนยันบันทึกขึ้น Cloud
   */
  const handleUpdateRouteField = (index: number, field: keyof FreightRate, value: string | number) => {
    setExtractedRoutes((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteRouteRow = (index: number) => {
    setExtractedRoutes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddRouteRow = () => {
    const carrier = detectedCarrier || (selectedCarrier !== 'AUTO' ? selectedCarrier : 'COSCO');
    setExtractedRoutes((prev) => [
      ...prev,
      {
        carrier,
        region: 'International',
        pol: 'Laem Chabang',
        pod: 'New Port',
        rate20: 0,
        rate40: 0,
        rate40hq: 0,
        validFrom,
        validTo,
        validity: `${validFrom} ถึง ${validTo}`,
        tt: '7-14 Days',
        routing: 'DIRECT',
        routingDetail: 'Direct Service',
        schedule: 'Weekly',
        notes: generalNotes || `Valid ${validFrom} to ${validTo}`,
        localCharges: getDefaultLocalCharges(carrier),
      }
    ]);
  };

  /**
   * ขั้นตอนที่ 1: อัปโหลดไฟล์ PDF ไปยัง /api/parse-pdf เพื่อให้ Gemini AI สกัดข้อมูล
   * นำผลลัพธ์ที่ได้ (ชื่อสายเรือ, วันที่มีผล, เส้นทาง, Remarks) มาแสดงในหน้าพรีวิวให้ผู้ใช้ตรวจสอบและแก้ไขก่อนบันทึกจริง
   */
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setExtractedRoutes([]);
    setSourceStatus('');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('carrier', selectedCarrier);

      const res = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server returned status ${res.status}`);
      }

      const carrier = data.carrier || (selectedCarrier !== 'AUTO' ? selectedCarrier : 'COSCO');
      setDetectedCarrier(carrier);

      // ตั้งค่าวันที่มีผลเริ่มต้นจากที่ AI อ่านได้ (ถ้าไม่มีให้ใช้วันที่ 1 ถึงวันสุดท้ายของเดือนปัจจุบัน)
      const vf = data.validFrom || new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().split('T')[0];
      const vt = data.validTo || new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() + 1, 0)).toISOString().split('T')[0];
      setValidFrom(vf);
      setValidTo(vt);

      // แปลงข้อมูลเส้นทางที่ AI สกัดได้ให้เข้ากับโครงสร้าง FreightRate (แยก 40'GP และ 40'HC และตั้งค่า Local Charges ตามสายเรือ)
      const rawRouteList = (data.routes as ApiRouteItem[]) || [];
      const mappedRoutes: FreightRate[] = rawRouteList.map((r) => {
        const podName = String(r.pod || 'Unknown Port').trim();
        const isReefer = podName.toLowerCase().includes('reefer') || String(r.routingDetail || '').toLowerCase().includes('reefer');

        return {
          carrier,
          region: r.region || 'International',
          pol: r.pol || 'Laem Chabang',
          pod: podName,
          rate20: Number(r.rate20) || 0,
          rate40: Number(r.rate40) || 0,
          rate40hq: Number(r.rate40hq || r.rate40) || 0,
          validFrom: vf,
          validTo: vt,
          validity: `${vf} ถึง ${vt}`,
          tt: r.tt || '7-14 Days',
          routing: r.routing || 'DIRECT',
          routingDetail: r.routingDetail || 'Regular Service',
          schedule: r.schedule || 'Weekly',
          notes: r.notes || data.remarks?.generalNotes || `อัปเดตจาก ${file.name}`,
          localCharges: getDefaultLocalCharges(carrier, isReefer)
        };
      });

      setExtractedRoutes(mappedRoutes);

      // Populate Remarks
      const rem = data.remarks || {};
      setFreeTime(rem.freeTime || '14 Days Combined');
      setWeightLimit(rem.weightLimit || 'ตามพิกัดตู้มาตรฐาน ISO (Max 22 Tons)');
      setManifest(rem.manifest || 'AMS/AFR USD 30/BL ตามระเบียบศุลกากร');
      setGeneralNotes(rem.generalNotes || `อัปเดตข้อกำหนดจากเอกสาร ${file.name}`);

      const rules = Array.isArray(rem.specialRules) && rem.specialRules.length > 0
        ? rem.specialRules.join('\n')
        : `• ค่าระวางรวม LSS / BUC ตามประกาศของ ${carrier}\n• อัปเดตจากเอกสาร PDF ${file.name}`;
      setSpecialRulesText(rules);

      setSourceStatus(`สกัดด้วย Gemini AI สำเร็จ (${mappedRoutes.length} เส้นทาง)`);
      setActiveTab('routes');

    } catch (e: unknown) {
      console.error('Upload & parse failed:', e);
      const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการสกัดข้อมูลจากไฟล์ PDF กรุณาลองใหม่อีกครั้ง';
      setErrorMsg(message);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * ขั้นตอนที่ 2: ยืนยันการนำเข้าข้อมูล
   * รวบรวมเส้นทาง, ข้อกำหนด Remarks และวันที่มีผล (validFrom/validTo) ที่ผู้ใช้ตรวจแก้แล้ว
   * ส่งกลับไปที่หน้า page.tsx (onApplyData) เพื่อบันทึกลง Supabase Cloud และ Local PostgreSQL ถาวร
   */
  const handleConfirm = async () => {
    if (extractedRoutes.length === 0 || isSaving) return;

    const carrier = detectedCarrier || selectedCarrier || 'COSCO';
    // แปลงข้อความเงื่อนไขพิเศษแบบหลายบรรทัดเป็น Array โดยตัดสัญลักษณ์ bullet หน้าบรรทัดออก
    const specialRulesArray = specialRulesText
      .split('\n')
      .map(s => s.trim().replace(/^[•\-\*]\s*/, ''))
      .filter(Boolean);

    const knowledge: CarrierKnowledge = {
      fullName: carrier,
      freeTime: freeTime.trim(),
      weightLimit: weightLimit.trim(),
      manifest: manifest.trim(),
      specialRules: specialRulesArray
    };

    const remarksSummary = generalNotes || freeTime || 'อัปเดตข้อมูลอัตราค่าระวางและข้อกำหนด';

    // อัปเดต validFrom / validTo ล่าสุดที่ผู้ใช้แก้ไขใน Date Picker ลงในทุกเส้นทางก่อนส่งบันทึก
    const finalRoutes = extractedRoutes.map((r) => ({
      ...r,
      carrier,
      validFrom,
      validTo,
      validity: `${validFrom} ถึง ${validTo}`
    }));

    setIsSaving(true);
    try {
      await onApplyData(carrier, finalRoutes, knowledge, remarksSummary, { validFrom, validTo });
      onClose();
    } catch (err) {
      console.error('Confirm error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-slate-800 rounded-xl border border-slate-700">
              <FileText className="w-5 h-5 text-blue-400" />
            </span>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                นำเข้าและอัปเดตตารางราคาด้วยไฟล์ PDF
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                สกัดอัตราค่าระวาง Ocean Freight พร้อมข้อกำหนดและเงื่อนไข (Remarks) ของสายเรือ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Carrier Selection */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ระบุสายเรือ (Carrier):
              </label>
              <select
                value={selectedCarrier}
                onChange={(e) => setSelectedCarrier(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer"
              >
                <option value="AUTO">🔍 ตรวจจับสายเรืออัตโนมัติจากเนื้อหา PDF</option>
                {carriers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/pdf';
              input.onchange = (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files && target.files[0]) handleFileUpload(target.files[0]);
              };
              input.click();
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-600 bg-blue-50/70'
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70'
            }`}
          >
            <Upload className="w-7 h-7 text-slate-600 mx-auto mb-2" />
            <h4 className="font-bold text-slate-900 text-sm">
              ลากไฟล์ PDF มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              รองรับไฟล์ใบเสนอราคา / Tariff / Schedule PDF ของสายเรือ
            </p>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs font-semibold text-blue-900 flex items-center justify-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span>กำลังอ่านและสกัดตารางราคาทุกตารางพร้อมข้อกำหนด (Remarks) ด้วย Gemini AI...</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && !isProcessing && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Extracted Content with Tabs */}
          {extractedRoutes.length > 0 && !isProcessing && (
            <div className="space-y-3 pt-2">
              
              {/* Status Header & Quick Validity Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  สกัดข้อมูลสำเร็จ ({detectedCarrier}): พบ {extractedRoutes.length} เส้นทาง (แก้ไขตัวเลขในตารางได้ทันที)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddRouteRow}
                    className="text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                  >
                    + เพิ่มแถวเส้นทาง
                  </button>
                  {sourceStatus && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {sourceStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation Tabs: Routes vs Remarks */}
              <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('routes')}
                  className={`pb-2.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'routes'
                      ? 'border-b-2 border-slate-900 text-slate-900'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. ตารางค่าระวาง ({extractedRoutes.length} เส้นทาง - แก้ไขได้)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('remarks')}
                  className={`pb-2.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'remarks'
                      ? 'border-b-2 border-slate-900 text-slate-900'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>2. วันหมดอายุ & ข้อกำหนด Remarks ({validFrom} ถึง {validTo}) <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">สำคัญ</span></span>
                </button>
              </div>

              {/* Tab 1: Editable Routes Table */}
              {activeTab === 'routes' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-2">ต้นทาง (POL)</th>
                        <th className="p-2">ปลายทาง (POD)</th>
                        <th className="p-2 w-20">20&apos;GP ($)</th>
                        <th className="p-2 w-20">40&apos;GP ($)</th>
                        <th className="p-2 w-20">40&apos;HQ ($)</th>
                        <th className="p-2 w-24">Transit</th>
                        <th className="p-2">หมายเหตุ / Surcharges</th>
                        <th className="p-2 w-10 text-center">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extractedRoutes.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 font-medium">
                          <td className="p-1.5">
                            <input
                              type="text"
                              aria-label={`ต้นทางแถวที่ ${i + 1}`}
                              value={r.pol}
                              onChange={(e) => handleUpdateRouteField(i, 'pol', e.target.value)}
                              className="w-28 px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              aria-label={`ปลายทางแถวที่ ${i + 1}`}
                              value={r.pod}
                              onChange={(e) => handleUpdateRouteField(i, 'pod', e.target.value)}
                              className="w-36 px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              aria-label={`ราคา 20 ฟุต แถวที่ ${i + 1}`}
                              value={r.rate20}
                              onChange={(e) => handleUpdateRouteField(i, 'rate20', Number(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              aria-label={`ราคา 40GP แถวที่ ${i + 1}`}
                              value={r.rate40}
                              onChange={(e) => handleUpdateRouteField(i, 'rate40', Number(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              aria-label={`ราคา 40HQ แถวที่ ${i + 1}`}
                              value={r.rate40hq ?? r.rate40}
                              onChange={(e) => handleUpdateRouteField(i, 'rate40hq', Number(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-slate-900 font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              aria-label={`ระยะเวลาแถวที่ ${i + 1}`}
                              value={r.tt}
                              onChange={(e) => handleUpdateRouteField(i, 'tt', e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              aria-label={`หมายเหตุแถวที่ ${i + 1}`}
                              value={r.notes}
                              onChange={(e) => handleUpdateRouteField(i, 'notes', e.target.value)}
                              className="w-full min-w-[140px] px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              aria-label={`ลบเส้นทาง ${r.pod}`}
                              onClick={() => handleDeleteRouteRow(i)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                              title="ลบเส้นทางนี้"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Remarks & Guidelines Editor */}
              {activeTab === 'remarks' && (
                <div className="space-y-3.5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  
                  {/* Validity Period (Valid From / Valid To) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ราคามีผลตั้งแต่วันที่ (Valid From):</span>
                      </label>
                      <input
                        type="date"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-red-600" />
                        <span>สิ้นสุดวันที่ (Valid To / Expiry):</span>
                      </label>
                      <input
                        type="date"
                        value={validTo}
                        onChange={(e) => setValidTo(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  {/* Free Time & Weight Limit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>วันฟรีตู้ปลายทาง (Free Time at POD):</span>
                      </label>
                      <input
                        type="text"
                        value={freeTime}
                        onChange={(e) => setFreeTime(e.target.value)}
                        placeholder="เช่น 14-21 Days Combined"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-blue-600" />
                        <span>ข้อจำกัดน้ำหนัก (Weight Limit & OWC):</span>
                      </label>
                      <input
                        type="text"
                        value={weightLimit}
                        onChange={(e) => setWeightLimit(e.target.value)}
                        placeholder="เช่น เกิน 22 Tons มี OWC USD 50/20'"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  {/* Manifest */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>เอกสารความปลอดภัย (Manifest / AMS / AFR / ENS):</span>
                    </label>
                    <input
                      type="text"
                      value={manifest}
                      onChange={(e) => setManifest(e.target.value)}
                      placeholder="เช่น AMS/AFR USD 30/BL, ENS EUR 25/BL"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  {/* Special Rules Textarea */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <ListPlus className="w-3.5 h-3.5 text-blue-600" />
                      <span>ข้อกำหนด & หมายเหตุพิเศษ (Special Rules & Surcharges):</span>
                    </label>
                    <textarea
                      rows={3}
                      value={specialRulesText}
                      onChange={(e) => setSpecialRulesText(e.target.value)}
                      placeholder="ใส่แต่ละข้อกำหนดต่อ 1 บรรทัด เช่น ค่าระวางรวม LSS / BUC..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      * ข้อมูลในส่วนนี้จะถูกบันทึกและแสดงในป๊อปอัป &ldquo;ข้อกำหนดสายเรือ&rdquo; และหน้ารายละเอียดต้นทุน
                    </span>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px]">
            {extractedRoutes.length > 0 && (
              <span>พร้อมบันทึก {extractedRoutes.length} เส้นทาง และ Remarks เข้าสู่ระบบ</span>
            )}
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              disabled={extractedRoutes.length === 0 || isSaving}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-98 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>กำลังบันทึกลง Cloud...</span>
                </>
              ) : (
                <span>✓ ยืนยัน & บันทึกลง Supabase Cloud</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
