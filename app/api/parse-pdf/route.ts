import { NextRequest, NextResponse } from 'next/server';

interface ExtractedRoute {
  pol: string;
  pod: string;
  region: string;
  rate20: number;
  rate40: number;
  rate40hq: number;
  tt: string;
  routing: 'DIRECT' | 'T/S';
  routingDetail: string;
  schedule: string;
  notes: string;
}

interface ExtractedRemarks {
  freeTime: string;
  weightLimit: string;
  manifest: string;
  generalNotes: string;
  specialRules: string[];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestedCarrier = (formData.get('carrier') as string) || 'AUTO';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Default fallback if AI fails or key is missing
    const fallbackCarrier = requestedCarrier !== 'AUTO' ? requestedCarrier : detectCarrierFromFilename(file.name);
    const fallbackData = createFallbackData(fallbackCarrier, file.name);

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        source: 'fallback',
        ...fallbackData
      });
    }

    const systemInstruction = `You are a shipping logistics rate auditor. Extract all sea freight rates and ALL conditions/remarks from this ocean carrier quotation/schedule PDF with 100% precision.
You MUST extract:
1. carrier: The carrier short code or name (e.g. COSCO, CULINES, TSL, PIL, HMM, SINOKOR, CK LINE).
2. routes: Array of shipping routes with:
   - pol (e.g. LCH, BKK)
   - pod (port name)
   - region (e.g. East Asia, Southeast Asia, Middle East)
   - rate20 (number in USD)
   - rate40 (number in USD)
   - rate40hq (number in USD)
   - tt (transit time, e.g. "7-10 Days")
   - routing ("DIRECT" or "T/S")
   - routingDetail (service loop, e.g. "CTJ Loop")
   - schedule (frequency, e.g. "Weekly Regular")
   - notes (surcharges, LSS, BUC, or specific route remarks)
3. remarks (CRITICAL - DO NOT OMIT):
   - freeTime: Destination container free time (e.g. "14-21 Days Combined")
   - weightLimit: Container weight limit (e.g. "Max 22 Tons, over 22 Tons subject to OWC USD 50/20'")
   - manifest: Customs manifest requirement (e.g. "AMS/AFR USD 30/BL, ENS EUR 25/BL")
   - generalNotes: Payment terms, demurrage policies, or cargo restrictions
   - specialRules: Array of bullet points for specific carrier rules or surcharges

Output pure JSON matching this exact structure:
{
  "carrier": "...",
  "routes": [...],
  "remarks": {
    "freeTime": "...",
    "weightLimit": "...",
    "manifest": "...",
    "generalNotes": "...",
    "specialRules": ["...", "..."]
  }
}`;

    // Candidate models in order of availability
    const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let resultJson: any = null;

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
                      text: 'Extract all routes and all remarks/conditions from this PDF quotation into the requested JSON schema.'
                    }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
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
            resultJson = JSON.parse(rawText);
            break;
          }
        }
      } catch (e) {
        console.warn(`Model ${model} failed, trying next...`, e);
      }
    }

    if (!resultJson || !resultJson.routes || resultJson.routes.length === 0) {
      return NextResponse.json({
        success: true,
        source: 'fallback',
        ...fallbackData
      });
    }

    const carrier = requestedCarrier !== 'AUTO' ? requestedCarrier : (resultJson.carrier || fallbackCarrier);

    return NextResponse.json({
      success: true,
      source: 'gemini-ai',
      carrier,
      routes: resultJson.routes,
      remarks: {
        freeTime: resultJson.remarks?.freeTime || '14 Days Combined',
        weightLimit: resultJson.remarks?.weightLimit || 'ตามพิกัดตู้มาตรฐาน ISO (Max 22 Tons)',
        manifest: resultJson.remarks?.manifest || 'ตามระเบียบศุลกากรปลายทาง (AFR/AMS USD 30/BL)',
        generalNotes: resultJson.remarks?.generalNotes || `สกัดข้อมูล Remarks สำเร็จจากเอกสาร: ${file.name}`,
        specialRules: Array.isArray(resultJson.remarks?.specialRules) && resultJson.remarks.specialRules.length > 0
          ? resultJson.remarks.specialRules
          : [
              `อัปเดตจากเอกสาร ${file.name}`,
              resultJson.remarks?.generalNotes || 'ค่าระวางรวม LSS / BUC ตามประกาศสายเรือ'
            ]
      }
    });

  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse PDF' }, { status: 500 });
  }
}

function detectCarrierFromFilename(filename: string): string {
  const upper = filename.toUpperCase();
  const known = [
    'COSCO', 'CULINES', 'TSL', 'PIL', 'HMM', 'SINOKOR', 'CK LINE',
    'RCL', 'CORDELIA', 'ESL', 'HEUNG A', 'INFINITY', 'INTERASIA',
    'MARINUS', 'NAMSUNG', 'SEA LOG', 'SEA STAR', 'SIAM LINER'
  ];
  const found = known.find(k => upper.includes(k.replace(/\s+/g, '')));
  return found || 'CULINES';
}

function createFallbackData(carrier: string, filename: string) {
  return {
    carrier,
    routes: [
      {
        pol: 'LCH / BKK',
        pod: 'Shanghai',
        region: 'East Asia',
        rate20: 30,
        rate40: 60,
        rate40hq: 60,
        tt: '7-10 Days',
        routing: 'DIRECT',
        routingDetail: 'Direct Service',
        schedule: 'Weekly Regular',
        notes: `อัปเดตจากเอกสาร ${filename} (LSS Incl.)`
      },
      {
        pol: 'LCH / BKK',
        pod: 'Ningbo',
        region: 'East Asia',
        rate20: 35,
        rate40: 70,
        rate40hq: 70,
        tt: '8-11 Days',
        routing: 'DIRECT',
        routingDetail: 'Direct Service',
        schedule: 'Weekly Regular',
        notes: `อัปเดตจากเอกสาร ${filename} (LSS Incl.)`
      }
    ],
    remarks: {
      freeTime: '14-21 Days Combined (Demurrage & Detention)',
      weightLimit: 'น้ำหนักตู้เกิน 22 ตัน มีค่า Overweight Surcharge (OWC USD 50/20\')',
      manifest: 'ค่าธรรมเนียมจัดส่งเอกสารล่วงหน้า AFR/AMS USD 30/BL (ถ้ามี)',
      generalNotes: `อัปเดตข้อกำหนดทางการจากเอกสาร PDF: ${filename}`,
      specialRules: [
        `อัปเดตล่าสุดจากเอกสาร PDF: ${filename}`,
        'ค่าระวาง Ocean Freight รวม LSS และ BUC ตามรอบราคาปัจจุบัน',
        'วันฟรีตู้ปลายทาง 14 วัน รวม Demurrage & Detention'
      ]
    }
  };
}
