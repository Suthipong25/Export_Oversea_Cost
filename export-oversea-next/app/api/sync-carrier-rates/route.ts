import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface RouteSyncInput {
  pol?: string;
  pod?: string;
  region?: string;
  rate20?: number | string;
  rate40?: number | string;
  rate40hq?: number | string;
  routing?: string;
  routingDetail?: string;
  tt?: string;
  schedule?: string;
  notes?: string;
  validFrom?: string;
  validTo?: string;
  carrier?: string;
}

/**
 * API Endpoint: POST /api/sync-carrier-rates
 * หน้าที่: บันทึกและอัปเดตเรทค่าระวางเรือลงฐานข้อมูลแบบ Hybrid Dual-Sync 3 ชั้นพร้อมกัน
 *   1) Supabase Cloud PostgreSQL (ฐานข้อมูลหลัก + Real-time WebSocket)
 *   2) Local JSON Backup (data/all_rates_database.json สำหรับ Offline Cache)
 *   3) Local PostgreSQL เครื่องอื่นในวง LAN (ทำงานเมื่อตั้งค่า LOCAL_POSTGRES_URL)
 */
export async function POST(req: NextRequest) {
  try {
    // ขั้นที่ 1: ตรวจสอบสิทธิ์การเข้าถึง (Authentication Guard)
    const adminSecret = process.env.ADMIN_SYNC_SECRET || 'export_oversea_secure_admin_2026';
    const clientToken = req.headers.get('x-admin-token') || req.headers.get('authorization')?.replace('Bearer ', '');

    if (clientToken !== adminSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: ไม่ได้รับอนุญาตให้แก้ไขฐานข้อมูล โปรดระบุ Admin Token' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { carrier, routes, knowledge, remarksSummary, validFrom, validTo } = body;

    if (!carrier || !Array.isArray(routes) || routes.length === 0) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ครบถ้วน: ต้องระบุ carrier และ routes อย่างน้อย 1 รายการ' },
        { status: 400 }
      );
    }

    const typedRoutes = routes as RouteSyncInput[];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lktglsxmulicoivjjfxf.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseKey) {
      return NextResponse.json(
        { error: 'ไม่พบ Supabase API Key ในระบบ' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ขั้นที่ 2: ค้นหาหรือลงทะเบียนสายเรือ (carriers)
    const { data: carriers, error: cFetchErr } = await supabase
      .from('carriers')
      .select('id, code')
      .eq('code', carrier);

    if (cFetchErr) {
      console.error('Error fetching carrier:', cFetchErr);
    }

    let carrierId = carriers?.[0]?.id;

    if (!carrierId) {
      const { data: newCarrier, error: cErr } = await supabase
        .from('carriers')
        .insert([{
          code: carrier,
          name: knowledge?.fullName || carrier,
          is_active: true
        }])
        .select('id')
        .single();

      if (cErr) {
        console.error('Error creating carrier:', cErr);
        return NextResponse.json({ error: `ไม่สามารถสร้างสายเรือ ${carrier}: ${cErr.message}` }, { status: 500 });
      }
      carrierId = newCarrier.id;
    }

    // ขั้นที่ 3: ตรวจสอบท่าเรือปลายทาง (ports)
    const uniquePods = Array.from(new Set(typedRoutes.map((r) => (r.pod || '').trim()))).filter(Boolean);
    const { data: existingPorts } = await supabase
      .from('ports')
      .select('id, port_name')
      .in('port_name', uniquePods);

    const portMap = new Map<string, string>();
    (existingPorts || []).forEach(p => portMap.set(p.port_name.toLowerCase(), p.id));

    const missingPods = uniquePods.filter(pod => !portMap.has(pod.toLowerCase()));
    if (missingPods.length > 0) {
      const newPortsPayload = missingPods.map(pod => {
        const sample = typedRoutes.find((x) => (x.pod || '').trim().toLowerCase() === pod.toLowerCase());
        return {
          port_name: pod,
          country: sample?.region || 'International',
          region: sample?.region || 'International',
          is_popular: ['Shanghai', 'Tokyo', 'Busan', 'Singapore', 'Hochiminh'].includes(pod)
        };
      });

      const { data: insertedPorts, error: pErr } = await supabase
        .from('ports')
        .insert(newPortsPayload)
        .select('id, port_name');

      if (pErr) {
        console.warn('Warning inserting new ports:', pErr);
      } else if (insertedPorts) {
        insertedPorts.forEach(p => portMap.set(p.port_name.toLowerCase(), p.id));
      }
    }

    // ขั้นที่ 4: Scoped Overwrite — ลบเรทเก่าเฉพาะท่าเรือในชุดนี้
    if (uniquePods.length > 0) {
      const { error: delErr } = await supabase
        .from('freight_rates')
        .delete()
        .eq('carrier_id', carrierId)
        .in('pod', uniquePods);

      if (delErr) {
        console.error('Error clearing old rates for target ports:', delErr);
        return NextResponse.json({ error: `ไม่สามารถปรับปรุงเรทเดิม: ${delErr.message}` }, { status: 500 });
      }
    }

    // ขั้นที่ 5: คำนวณวันที่มีผล
    const now = new Date();
    const defaultValidFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split('T')[0];
    const defaultValidTo = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().split('T')[0];

    const effectiveValidFrom = validFrom || typedRoutes[0]?.validFrom || defaultValidFrom;
    const effectiveValidTo = validTo || typedRoutes[0]?.validTo || defaultValidTo;

    // ขั้นที่ 6: เตรียม Payload และแบ่ง Insert ทีละ 100 แถว
    const ratesPayload = typedRoutes.map((r) => {
      const rate20gp = Number(r.rate20) || 0;
      const rate40gp = Number(r.rate40) || 0;
      const rate40hq = Number(r.rate40hq || r.rate40) || 0;
      const podStr = (r.pod || '').trim();
      const isReefer =
        podStr.toLowerCase().includes('reefer') ||
        String(r.routingDetail || '').toLowerCase().includes('reefer');
      const vf = r.validFrom || effectiveValidFrom;

      return {
        carrier_id: carrierId,
        port_id: portMap.get(podStr.toLowerCase()) || null,
        pol: r.pol || 'LCH / BKK',
        pod: podStr,
        rate_20gp: rate20gp,
        rate_40gp: rate40gp,
        rate_40hq: rate40hq,
        rate_20rf: isReefer ? rate20gp : null,
        rate_40rh: isReefer ? rate40gp : null,
        currency: 'USD',
        service_name: r.routingDetail || '',
        routing_type: r.routing || 'DIRECT',
        transit_time: r.tt || '',
        frequency: r.schedule || '',
        valid_from: vf,
        valid_to: r.validTo || effectiveValidTo,
        period_cycle: vf >= '2026-11-15' ? '2H' : '1H',
        is_active: true,
        remarks: r.notes || remarksSummary || ''
      };
    });

    let totalInserted = 0;
    for (let i = 0; i < ratesPayload.length; i += 100) {
      const chunk = ratesPayload.slice(i, i + 100);
      const { data: inserted, error: insErr } = await supabase
        .from('freight_rates')
        .insert(chunk)
        .select('id');

      if (insErr) {
        console.error('Error inserting rates chunk:', insErr);
        return NextResponse.json({ error: `เกิดข้อผิดพลาดในการบันทึกเรท: ${insErr.message}` }, { status: 500 });
      }
      totalInserted += (inserted?.length || 0);
    }

    // ขั้นที่ 7: อัปเดตไฟล์สำรอง Local JSON
    try {
      const localFilePath = path.join(process.cwd(), 'data', 'all_rates_database.json');
      if (fs.existsSync(localFilePath)) {
        const content = fs.readFileSync(localFilePath, 'utf8');
        const localDb = JSON.parse(content);

        const targetPodSet = new Set(uniquePods.map(p => p.toLowerCase()));
        const otherRates = (localDb.rates || []).filter(
          (r: RouteSyncInput) => !(r.carrier === carrier && targetPodSet.has((r.pod || '').trim().toLowerCase()))
        );
        localDb.rates = [...typedRoutes, ...otherRates];

        if (!localDb.carrierKnowledgeBase) localDb.carrierKnowledgeBase = {};
        if (knowledge) {
          localDb.carrierKnowledgeBase[carrier] = {
            ...(localDb.carrierKnowledgeBase[carrier] || {}),
            fullName: knowledge.fullName || carrier,
            freeTime: knowledge.freeTime || '14 Days Combined',
            weightLimit: knowledge.weightLimit || 'ตามพิกัดตู้มาตรฐาน ISO',
            manifest: knowledge.manifest || 'ตามระเบียบศุลกากรปลายทาง',
            specialRules: [
              ...(knowledge.specialRules || []),
              ...(remarksSummary ? [`สรุปเงื่อนไข: ${remarksSummary}`] : [])
            ]
          };
        }

        const portSet = new Set(localDb.ports || []);
        uniquePods.forEach(pod => portSet.add(pod));
        localDb.ports = Array.from(portSet).sort();
        localDb.totalRates = localDb.rates.length;
        localDb.totalPorts = localDb.ports.length;
        localDb.lastUpdated = new Date().toISOString();

        fs.writeFileSync(localFilePath, JSON.stringify(localDb, null, 2), 'utf8');
      }
    } catch (fsErr) {
      console.warn('Local JSON sync skipped or non-fatal:', fsErr);
    }

    // ขั้นที่ 8: Dual-Write ไปยัง Local PostgreSQL เครื่องอื่นในวง LAN
    if (process.env.LOCAL_POSTGRES_URL) {
      try {
        const pool = new Pool({
          connectionString: process.env.LOCAL_POSTGRES_URL,
          connectionTimeoutMillis: 3000
        });

        const cRes = await pool.query('SELECT id FROM carriers WHERE code = $1', [carrier]);
        let localCid = cRes.rows[0]?.id;
        if (!localCid) {
          const newC = await pool.query(
            'INSERT INTO carriers (code, name, is_active) VALUES ($1, $2, TRUE) RETURNING id',
            [carrier, knowledge?.fullName || carrier]
          );
          localCid = newC.rows[0]?.id;
        }

        if (uniquePods.length > 0 && localCid) {
          await pool.query(
            'DELETE FROM freight_rates WHERE carrier_id = $1 AND pod = ANY($2::text[])',
            [localCid, uniquePods]
          );
        }

        for (const r of ratesPayload) {
          await pool.query(`
            INSERT INTO freight_rates (
              carrier_id, pol, pod, rate_20gp, rate_40gp, rate_40hq, currency,
              service_name, routing_type, transit_time, frequency, valid_from, valid_to, is_active, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [
            localCid, r.pol, r.pod, r.rate_20gp, r.rate_40gp, r.rate_40hq,
            r.currency, r.service_name, r.routing_type, r.transit_time, r.frequency,
            r.valid_from, r.valid_to, r.is_active, r.remarks
          ]);
        }

        await pool.end();
        console.log(`✅ Successfully synced ${ratesPayload.length} rates to local PostgreSQL machine!`);
      } catch (localPgErr: unknown) {
        const msg = localPgErr instanceof Error ? localPgErr.message : String(localPgErr);
        console.warn('Local PostgreSQL sync notice (non-fatal):', msg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `บันทึกข้อมูล ${carrier} ลง Supabase Cloud สำเร็จ (${totalInserted} เส้นทาง)`,
      count: totalInserted,
      carrier,
      validFrom: effectiveValidFrom,
      validTo: effectiveValidTo
    });

  } catch (error: unknown) {
    console.error('Fatal sync error:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
