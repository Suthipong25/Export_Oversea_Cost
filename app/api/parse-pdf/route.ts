import { NextRequest, NextResponse } from 'next/server';

export interface ExtractedRoute {
  pol: string;
  pod: string;
  region: string;
  rate20: number;
  rate40: number;
  rate40hq: number;
  tt: string;
  routing: 'DIRECT' | 'TRANSSHIPMENT';
  routingDetail: string;
  schedule: string;
  notes: string;
  validFrom?: string;
  validTo?: string;
  validity?: string;
}

export interface ExtractedRemarks {
  freeTime: string;
  weightLimit: string;
  manifest: string;
  generalNotes: string;
  specialRules: string[];
}

export interface RawParsedRoute {
  pol?: string;
  pod?: string;
  region?: string;
  rate20?: number | string;
  rate40?: number | string;
  rate40hq?: number | string;
  tt?: string;
  routing?: string;
  routingDetail?: string;
  schedule?: string;
  notes?: string;
  validFrom?: string;
  validTo?: string;
}

export interface GeminiParseResponse {
  carrier?: string;
  validFrom?: string;
  validTo?: string;
  validityText?: string;
  routes?: RawParsedRoute[];
  remarks?: {
    freeTime?: string;
    weightLimit?: string;
    manifest?: string;
    generalNotes?: string;
    specialRules?: string[];
  };
}

/**
 * API Endpoint: POST /api/parse-pdf
 * หน้าที่: รับไฟล์ใบเสนอราคา PDF ของสายเรือ -> แปลงเป็น Base64 -> ส่งให้ Google Gemini AI สกัดข้อมูลทุกตาราง
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestedCarrier = (formData.get('carrier') as string) || 'AUTO';

    if (!file) {
      return NextResponse.json({ error: 'กรุณาแนบไฟล์ PDF' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ไม่พบ GEMINI_API_KEY ในระบบ (.env.local)' },
        { status: 500 }
      );
    }

    // แปลงไฟล์ PDF เป็น Base64 เพื่อส่งแนบแบบ inlineData ให้ Gemini Vision อ่านตารางทั้งหมด
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    const detectedCarrierFallback =
      requestedCarrier !== 'AUTO' ? requestedCarrier : detectCarrierFromFilename(file.name);

    const systemInstruction = `You are a senior shipping logistics tariff auditor. Extract ALL sea freight rates and ALL remarks/surcharges from this ocean carrier quotation PDF with 100% completeness.

CRITICAL EXTRACTION RULES:
1. READ ALL TABLES: Extract routes from EVERY table on EVERY page (including top table, bottom table, secondary tables, and side update boxes).
2. THAILAND ORIGINS ONLY: Only extract routes where Port of Loading (POL / Origin) is in Thailand (e.g. "Laem Chabang", "Bangkok", "Lat Krabang", "BKK / LCH", "LCH", "BKK", "LKB", "SHT", "PAT", "TCT"). DO NOT extract rows where Origin/POL is "Singapore".
3. KEEP SEPARATE ORIGINS SEPARATE: If a table has a row for "Bangkok" and a row for "Laem Chabang" (or "Lat Krabang"), output separate route objects for each origin ("Laem Chabang", "Bangkok", "Lat Krabang").
4. UNBUNDLE MULTI-PORT CELLS: If a destination cell lists multiple ports separated by "/", ";", or newlines (e.g. "Beira/Maputo/Nacala", "Hong Kong;Qinzhou;Yangpugang", "Rotterdam/Antwerp/Lehavre/Dunkirk/Hamburg/Wilhelmshaven/Zeebrugge/Southampton", "Altamira/Veracruz"), you MUST split them and output ONE separate route object per individual port! Never leave "/" or ";" inside a pod name.
5. SKIP SUSPENDED/STOPPED PORTS: Do not output routes where rate is "STOP", "SUSPENDED", "Case by Case", or 0.
6. REEFER vs DRY: If the table is for Reefer cargo (20RF / 40RH / 40RQ), append " (Reefer)" to the pod name (e.g. "Melbourne, Australia (Reefer)") and mention "Reefer (20RF/40RH)" in routingDetail and notes.
7. INLAND / ADD-ON DESTINATIONS: If the remarks list inland destinations with an add-on formula (e.g. "SAN JOSE = PUERTO LIMON + USD 500/500/500" or "VITORIA + 1020/1740"), calculate the total rate and include them as routes.
8. RICH NOTES: In each route's "notes" field, include validity dates, included surcharges (e.g. Incl BUC, FAF, EBS, CIS, PSS), subject-to surcharges with exact USD/EUR amounts (e.g. Subj FAF USD 325/650, WRS USD 120/240), and weight limits (OWC / HCS).

Output pure JSON matching this exact structure:
{
  "carrier": "COSCO",
  "validFrom": "YYYY-MM-DD",
  "validTo": "YYYY-MM-DD",
  "validityText": "15 - 30 Nov 2026",
  "routes": [
    {
      "pol": "Laem Chabang",
      "pod": "Port Name",
      "region": "Trade Lane / Region",
      "rate20": 1000,
      "rate40": 2000,
      "rate40hq": 2000,
      "tt": "14-18 Days",
      "routing": "DIRECT",
      "routingDetail": "Service Loop or Via Port",
      "schedule": "Weekly",
      "notes": "Valid 15-30 Nov 2026 | Incl BUC, Subj FAF USD .../TEU | ..."
    }
  ],
  "remarks": {
    "freeTime": "14-21 Days Combined",
    "weightLimit": "Exact weight limit & OWC/HCS tiers from PDF",
    "manifest": "AMS/AFR/ENS fee if mentioned",
    "generalNotes": "Summary of surcharges & conditions",
    "specialRules": ["Rule 1", "Rule 2"]
  }
}`;

    // ไล่ลองเรียกโมเดล Gemini ที่ตอบสนองไวและแม่นยำ พร้อมตั้ง maxOutputTokens = 16384 เพื่อไม่ให้ JSON ตารางใหญ่ถูกตัดกลางคัน
    const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let resultJson: GeminiParseResponse | null = null;
    let lastError = '';

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'application/pdf',
                        data: base64Data
                      }
                    },
                    {
                      text: `Extract every Thailand-origin route from all tables in this PDF (${file.name}), unbundling all "/" and ";" port groups into individual ports, into the requested JSON schema.`
                    }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
                maxOutputTokens: 16384
              },
              systemInstruction: {
                parts: [{ text: systemInstruction }]
              }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanedText = rawText
              .replace(/^```json\s*/i, '')
              .replace(/^```\s*/i, '')
              .replace(/\s*```$/i, '')
              .trim();
            resultJson = JSON.parse(cleanedText) as GeminiParseResponse;
            if (resultJson && Array.isArray(resultJson.routes) && resultJson.routes.length > 0) {
              break;
            }
          }
        } else {
          lastError = `HTTP ${response.status}`;
        }
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : String(e);
        console.warn(`Model ${model} failed, trying next...`, e);
      }
    }

    if (!resultJson || !Array.isArray(resultJson.routes) || resultJson.routes.length === 0) {
      return NextResponse.json(
        { error: `ไม่สามารถสกัดตารางเรทจากไฟล์ PDF นี้ได้ (${lastError || 'ไม่พบข้อมูลเส้นทางจากประเทศไทย'})` },
        { status: 422 }
      );
    }

    const carrier =
      requestedCarrier !== 'AUTO'
        ? requestedCarrier
        : (resultJson.carrier || detectedCarrierFallback).toUpperCase().trim();

    const now = new Date();
    const defaultValidFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split('T')[0];
    const defaultValidTo = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().split('T')[0];

    const validFrom = isValidIsoDate(resultJson.validFrom) ? (resultJson.validFrom as string) : defaultValidFrom;
    const validTo = isValidIsoDate(resultJson.validTo) ? (resultJson.validTo as string) : defaultValidTo;

    // Server-Side Post-Processor
    const normalizedRoutes = normalizeAndUnbundleRoutes(resultJson.routes, validFrom, validTo);

    if (normalizedRoutes.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบเส้นทางที่มีราคาสมบูรณ์จากท่าเรือในประเทศไทยในเอกสารนี้' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      source: 'gemini-ai',
      carrier,
      validFrom,
      validTo,
      validityText: resultJson.validityText || `${validFrom} ถึง ${validTo}`,
      routes: normalizedRoutes,
      remarks: {
        freeTime: resultJson.remarks?.freeTime || '14 Days Combined',
        weightLimit: resultJson.remarks?.weightLimit || 'ตามพิกัดตู้มาตรฐาน ISO (Max 22 Tons)',
        manifest: resultJson.remarks?.manifest || 'ตามระเบียบศุลกากรปลายทาง (AFR/AMS USD 30/BL)',
        generalNotes: resultJson.remarks?.generalNotes || `สกัดข้อมูลจากเอกสาร: ${file.name}`,
        specialRules:
          Array.isArray(resultJson.remarks?.specialRules) && resultJson.remarks.specialRules.length > 0
            ? resultJson.remarks.specialRules
            : [
                `อัปเดตจากเอกสาร ${file.name} (Valid: ${validFrom} ถึง ${validTo})`,
                resultJson.remarks?.generalNotes || 'ค่าระวางและ Surcharges ตามประกาศสายเรือ'
              ]
      }
    });
  } catch (error: unknown) {
    console.error('Error parsing PDF:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isValidIsoDate(d: unknown): boolean {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim());
}

/**
 * Post-Processor สำหรับทำความสะอาดและแยกพอร์ตที่มัดรวมด้วย '/' หรือ ';' ออกเป็นพอร์ตเดี่ยว
 * พร้อมกรองต้นทาง Singapore และพอร์ตที่ราคาเป็น 0 ออก
 */
function normalizeAndUnbundleRoutes(rawRoutes: RawParsedRoute[], validFrom: string, validTo: string): ExtractedRoute[] {
  const output: ExtractedRoute[] = [];

  for (const r of rawRoutes) {
    const rawPol = String(r.pol || 'Laem Chabang').trim();
    const upperPol = rawPol.toUpperCase();

    // ข้ามแถวที่ต้นทางเป็น Singapore ล้วนๆ (ไม่ได้ออกจากไทย)
    if (upperPol === 'SINGAPORE' || upperPol === 'SIN' || upperPol === 'SGSIN') {
      continue;
    }

    const rate20 = Number(r.rate20) || 0;
    const rate40 = Number(r.rate40) || 0;
    const rate40hq = Number(r.rate40hq || r.rate40) || 0;

    // ข้ามพอร์ตที่ถูกระงับบริการ (STOP / SUSPENDED / Case by Case ที่ไม่มีตัวเลขราคา)
    if (rate20 <= 0 && rate40 <= 0 && rate40hq <= 0) {
      continue;
    }

    // ปรับชื่อ POL ให้เป็นมาตรฐานเดียวกัน
    let pol = rawPol;
    if (upperPol === 'LCH' || upperPol === 'LAEM CHABANG' || upperPol.includes('LAEM CHABANG, CHON BURI')) {
      pol = 'Laem Chabang';
    } else if (upperPol === 'BKK' || upperPol === 'BANGKOK' || upperPol.includes('BANGKOK, KRUNG THEP')) {
      pol = 'Bangkok';
    } else if (upperPol === 'LKB' || upperPol === 'LKR' || upperPol === 'LAT KRABANG') {
      pol = 'Lat Krabang';
    } else if (upperPol.includes('BKK') && upperPol.includes('LCH')) {
      pol = 'BKK / LCH';
    } else if (upperPol.includes('BANGKOK') && upperPol.includes('LAEM CHABANG')) {
      pol = 'BKK / LCH';
    }

    const rawPod = String(r.pod || '').trim();
    if (!rawPod || /SUSPENDED|STOP/i.test(rawPod)) {
      continue;
    }

    // หาก AI ยังส่งชื่อพอร์ตที่คั่นด้วย '/' หรือ ';' มา ให้แยกเป็นพอร์ตเดี่ยวทั้งหมด
    const podParts = rawPod
      .split(/[/;]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 1 && !/SUSPENDED|STOP/i.test(p));

    const routingUpper = String(r.routing || '').toUpperCase();
    const routing: 'DIRECT' | 'TRANSSHIPMENT' =
      routingUpper === 'DIRECT' ? 'DIRECT' : 'TRANSSHIPMENT';

    for (const singlePod of podParts) {
      output.push({
        pol,
        pod: singlePod,
        region: String(r.region || 'International').trim(),
        rate20,
        rate40,
        rate40hq,
        tt: String(r.tt || '7-14 Days').trim(),
        routing,
        routingDetail: String(r.routingDetail || (routing === 'DIRECT' ? 'Direct Service' : 'T/S Service')).trim(),
        schedule: String(r.schedule || 'Weekly').trim(),
        notes: String(r.notes || `Valid ${validFrom} to ${validTo}`).trim(),
        validFrom,
        validTo,
        validity: `${validFrom} ถึง ${validTo}`
      });
    }
  }

  return output;
}

function detectCarrierFromFilename(filename: string): string {
  const upper = filename.toUpperCase();
  const known = [
    'COSCO', 'CULINES', 'TSL', 'PIL', 'HMM', 'SINOKOR', 'CK LINE',
    'RCL', 'CORDELIA', 'ESL', 'HEUNG A', 'INFINITY', 'INTERASIA',
    'MARINUS', 'MULTIBOX', 'NAMSUNG', 'SEA LOG', 'SEA STAR', 'SIAM LINER'
  ];
  const found = known.find((k) => upper.includes(k.replace(/\s+/g, '')) || upper.includes(k));
  return found || 'COSCO';
}
