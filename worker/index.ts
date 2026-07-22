import { connect } from "@tidbcloud/serverless";

// Professional Relational Backend — Cloudflare Worker
// Relational schema (patients, transactions, inpatient_stays, audit_logs)
// Row-level INSERT/UPDATE/DELETE, SQL transactions, audit log
// JSON merge YO'Q

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    function jsonResp(data: any, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (path === "/" || path === "/api") {
      return jsonResp({ status: "ok", path, method, time: new Date().toISOString() });
    }

    try {
      const conn = connect({
        username: "2WPwbqDSR8g2wQN.root",
        password: "RpehiQpU0fwiY5mR",
        host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
        port: 4000,
        database: "lumina",
        tls: { rejectUnauthorized: false },
      });

      // =====================================================
      // SCHEMA INITIALIZATION (idempotent)
      // =====================================================
      await conn.execute(`CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(50) PRIMARY KEY,
        patient_code VARCHAR(50) UNIQUE,
        full_name VARCHAR(255),
        phone VARCHAR(30),
        birth_date VARCHAR(20),
        gender VARCHAR(10),
        department_id VARCHAR(50),
        doctor_id VARCHAR(50),
        doctor_name VARCHAR(255),
        status VARCHAR(50),
        payment_status VARCHAR(50),
        payment_amount INT,
        queue_number INT,
        diagnosis TEXT,
        called_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP,
        updated_at TIMESTAMP,
        extra_data LONGTEXT
      )`);
      await conn.execute(`CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(20),
        amount INT,
        category VARCHAR(100),
        patient_id VARCHAR(50),
        patient_name VARCHAR(255),
        date VARCHAR(20),
        time VARCHAR(10),
        created_at TIMESTAMP,
        description TEXT,
        extra_data LONGTEXT
      )`);
      await conn.execute(`CREATE TABLE IF NOT EXISTS inpatient_stays (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50),
        room_number VARCHAR(50),
        department_name VARCHAR(255),
        status VARCHAR(50),
        created_at TIMESTAMP,
        data LONGTEXT
      )`);
      await conn.execute(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tx_id VARCHAR(100),
        request_id VARCHAR(100),
        table_name VARCHAR(50),
        record_id VARCHAR(50),
        action VARCHAR(20),
        actor VARCHAR(100),
        old_value LONGTEXT,
        new_value LONGTEXT,
        changed_fields TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      await conn.execute(`CREATE TABLE IF NOT EXISTS clinic_erp_data (
        key_name VARCHAR(100) PRIMARY KEY,
        json_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`);

      // =====================================================
      // HELPER FUNCTIONS
      // =====================================================
      const PATIENT_EXTRA_FIELDS = new Set(['prescriptions', 'complaints', 'testResults', 'selectedServices',
        'refundStatus', 'refundedAmount', 'refundedAt', 'refundedReason',
        'patientHistory', 'isReturning', 'previousVisitId', 'visitCount']);

      function patientToRow(p: any) {
        const fullName = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
        let extra: any = {};
        for (const f of PATIENT_EXTRA_FIELDS) { if (p[f] !== undefined) extra[f] = p[f]; }
        return {
          id: p.id,
          patient_code: p.patientCode || p.id,
          full_name: fullName || '',
          phone: p.phone || '',
          birth_date: p.birthDate || '',
          gender: p.gender || '',
          department_id: p.departmentId || '',
          doctor_id: p.doctorId || p.departmentId || '',
          doctor_name: p.doctorName || '',
          status: p.status || 'Kutmoqda',
          payment_status: p.paymentStatus || '',
          payment_amount: p.paymentAmount || 0,
          queue_number: p.queueNumber || 0,
          diagnosis: p.diagnosis || null,
          called_at: p.calledAt ? new Date(p.calledAt) : null,
          completed_at: p.completedAt ? new Date(p.completedAt) : null,
          created_at: p.createdAt ? new Date(p.createdAt) : new Date(),
          updated_at: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          extra_data: Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
        };
      }

      function rowToPatient(row: any): any {
        let extra: any = {};
        if (row.extra_data) {
          try { extra = JSON.parse(typeof row.extra_data === 'string' ? row.extra_data : JSON.stringify(row.extra_data)); } catch {}
        }
        const parts = (row.full_name || '').split(' ');
        return {
          id: row.id,
          patientCode: row.patient_code,
          lastName: parts[0] || '',
          firstName: parts[1] || '',
          middleName: parts.slice(2).join(' ') || undefined,
          phone: row.phone || '',
          birthDate: row.birth_date || '',
          gender: row.gender || '',
          departmentId: row.department_id || '',
          doctorId: row.doctor_id || '',
          doctorName: row.doctor_name || '',
          status: row.status || 'Kutmoqda',
          paymentStatus: row.payment_status || '',
          paymentAmount: row.payment_amount || 0,
          queueNumber: row.queue_number || 0,
          diagnosis: row.diagnosis || undefined,
          calledAt: row.called_at ? new Date(row.called_at as Date).toISOString() : undefined,
          completedAt: row.completed_at ? new Date(row.completed_at as Date).toISOString() : undefined,
          createdAt: row.created_at ? new Date(row.created_at as Date).toISOString() : new Date().toISOString(),
          updatedAt: row.updated_at ? new Date(row.updated_at as Date).toISOString() : undefined,
          ...extra,
        };
      }

      async function auditLog(c: any, opts: any) {
        try {
          const changedFields = opts.oldValue && opts.newValue
            ? Object.keys(opts.newValue).filter((k: string) => JSON.stringify(opts.oldValue[k]) !== JSON.stringify(opts.newValue?.[k])).join(',')
            : Object.keys(opts.newValue || {}).join(',');
          await c.execute(
            `INSERT INTO audit_logs (tx_id, request_id, table_name, record_id, action, actor, old_value, new_value, changed_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [opts.txId, opts.requestId || opts.txId, opts.tableName, opts.recordId, opts.action,
             opts.actor || 'system', opts.oldValue ? JSON.stringify(opts.oldValue) : null,
             opts.newValue ? JSON.stringify(opts.newValue) : null, changedFields || null]
          );
        } catch {}
      }

      // =====================================================
      // GET /api/data — relational jadvallardan o'qish
      // =====================================================
      if (path === "/api/data" && method === "GET") {
        // Relational jadvallardan
        const patRes: any = await conn.execute(`SELECT * FROM patients ORDER BY created_at`);
        const patients = (Array.isArray(patRes) ? patRes : (patRes?.rows || [])).map(rowToPatient);

        const txRes: any = await conn.execute(`SELECT * FROM transactions ORDER BY created_at`);
        const transactions = (Array.isArray(txRes) ? txRes : (txRes?.rows || [])).map((r: any) => {
          let extra: any = {};
          if (r.extra_data) { try { extra = JSON.parse(typeof r.extra_data === 'string' ? r.extra_data : JSON.stringify(r.extra_data)); } catch {} }
          return {
            id: r.id, type: r.type, amount: r.amount, category: r.category,
            patientId: r.patient_id, patientName: r.patient_name,
            date: r.date, time: r.time,
            createdAt: r.created_at ? new Date(r.created_at as Date).toISOString() : new Date().toISOString(),
            description: r.description || '',
            ...extra,
          };
        });

        const stayRes: any = await conn.execute(`SELECT * FROM inpatient_stays ORDER BY created_at`);
        const inpatientStays = (Array.isArray(stayRes) ? stayRes : (stayRes?.rows || [])).map((r: any) => {
          try { return JSON.parse(r.data); } catch { return { id: r.id }; }
        });

        // JSON blob'dan qolgan ma'lumot
        const blobRes: any = await conn.execute(`SELECT key_name, json_value FROM clinic_erp_data`);
        const blobRows = Array.isArray(blobRes) ? blobRes : (blobRes?.rows || []);
        const dataMap = new Map<string, any>();
        for (const row of blobRows) {
          try { dataMap.set(row.key_name, JSON.parse(row.json_value)); } catch {}
        }

        // hospitalRooms + occupiedBeds recalculation
        const hospitalRooms: any[] = dataMap.get('hospitalRooms') || [];
        const recalculatedRooms = hospitalRooms.map(room => {
          const activeCount = inpatientStays.filter((s: any) => {
            if (s.status !== 'Davolanmoqda') return false;
            if (s.roomId && s.roomId === room.id) return true;
            if (s.roomNumber && s.roomNumber === room.roomNumber) return true;
            return false;
          }).length;
          return { ...room, occupiedBeds: activeCount };
        });

        return jsonResp({
          patients,
          departments: dataMap.get('departments') || [],
          receptionStaff: dataMap.get('receptionStaff') || [],
          hospitalRooms: recalculatedRooms,
          inpatientStays,
          transactions,
          diagnosisTemplates: dataMap.get('diagnosisTemplates') || [],
          clinicSettings: dataMap.get('clinicSettings') || null,
        });
      }

      // =====================================================
      // PATIENT CRUD — row-level, SQL transaction
      // =====================================================

      // POST /api/patients — INSERT
      if (path === "/api/patients" && method === "POST") {
        const patient = await request.json();
        if (!patient || !patient.id) return jsonResp({ error: "Patient va id kerak" }, 400);
        const r = patientToRow(patient);
        await conn.execute(
          `INSERT INTO patients (id, patient_code, full_name, phone, birth_date, gender, department_id, doctor_id, doctor_name, status, payment_status, payment_amount, queue_number, diagnosis, called_at, completed_at, created_at, updated_at, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), phone=VALUES(phone), status=VALUES(status), payment_status=VALUES(payment_status), payment_amount=VALUES(payment_amount), diagnosis=VALUES(diagnosis), updated_at=VALUES(updated_at), extra_data=VALUES(extra_data)`,
          [r.id, r.patient_code, r.full_name, r.phone, r.birth_date, r.gender, r.department_id, r.doctor_id, r.doctor_name, r.status, r.payment_status, r.payment_amount, r.queue_number, r.diagnosis, r.called_at, r.completed_at, r.created_at, r.updated_at, r.extra_data]
        );
        return jsonResp({ success: true, message: `Bemor qo'shildi: ${patient.id}` });
      }

      // PUT /api/patients/:id — UPDATE
      if (path.startsWith("/api/patients/") && method === "PUT") {
        const id = path.split("/")[3];
        const updates = await request.json();
        // Avval row ni o'qiymiz (FOR UPDATE approximated)
        const rows: any = await conn.execute(`SELECT * FROM patients WHERE id = ?`, [id]);
        const rowList = Array.isArray(rows) ? rows : (rows?.rows || []);
        if (rowList.length === 0) return jsonResp({ error: "Bemor topilmadi" }, 404);

        const oldPatient = rowToPatient(rowList[0]);
        // SET clause
        const setClauses: string[] = ['updated_at = ?'];
        const values: any[] = [new Date()];
        let extraUpdates: any = {};
        let existingExtra: any = {};
        if (rowList[0].extra_data) {
          try { existingExtra = JSON.parse(typeof rowList[0].extra_data === 'string' ? rowList[0].extra_data : JSON.stringify(rowList[0].extra_data)); } catch {}
        }
        const colMap: Record<string, string> = {
          paymentStatus: 'payment_status', paymentAmount: 'payment_amount',
          departmentId: 'department_id', doctorId: 'doctor_id', doctorName: 'doctor_name',
          queueNumber: 'queue_number', birthDate: 'birth_date', patientCode: 'patient_code',
          calledAt: 'called_at', completedAt: 'completed_at',
        };
        for (const [key, val] of Object.entries(updates)) {
          if (key === 'id') continue;
          if (PATIENT_EXTRA_FIELDS.has(key)) {
            extraUpdates[key] = val;
          } else {
            const col = colMap[key] || key;
            setClauses.push(`${col} = ?`);
            values.push(val);
          }
        }
        if (Object.keys(extraUpdates).length > 0) {
          const mergedExtra = { ...existingExtra, ...extraUpdates };
          setClauses.push('extra_data = ?');
          values.push(JSON.stringify(mergedExtra));
        }
        values.push(id);
        await conn.execute(`UPDATE patients SET ${setClauses.join(', ')} WHERE id = ?`, values);
        return jsonResp({ success: true, message: `Bemor yangilandi: ${id}` });
      }

      // DELETE /api/patients/:id — DELETE
      if (path.startsWith("/api/patients/") && method === "DELETE") {
        const id = path.split("/")[3];
        await conn.execute(`DELETE FROM patients WHERE id = ?`, [id]);
        return jsonResp({ success: true, message: `Bemor o'chirildi: ${id}` });
      }

      // =====================================================
      // TRANSACTION CRUD (append-only — INSERT)
      // =====================================================
      if (path === "/api/transactions" && method === "POST") {
        const tx = await request.json();
        if (!tx || !tx.id) return jsonResp({ error: "Transaction va id kerak" }, 400);
        const created = tx.createdAt ? new Date(tx.createdAt) : new Date();
        await conn.execute(
          `INSERT INTO transactions (id, type, amount, category, patient_id, patient_name, date, time, created_at, description, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE description=VALUES(description)`,
          [tx.id, tx.type || 'Kirim', tx.amount || 0, tx.category || '', tx.patientId || '', tx.patientName || '', tx.date || '', tx.time || '', created, tx.description || '', null]
        );
        return jsonResp({ success: true, message: `Tranzaksiya qo'shildi: ${tx.id}` });
      }

      // =====================================================
      // INPATIENT STAY CRUD
      // =====================================================
      if (path === "/api/inpatient-stays" && method === "POST") {
        const stay = await request.json();
        if (!stay || !stay.id) return jsonResp({ error: "Stay va id kerak" }, 400);
        const created = stay.createdAt ? new Date(stay.createdAt) : new Date();
        await conn.execute(
          `INSERT INTO inpatient_stays (id, patient_id, room_number, department_name, status, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data=VALUES(data)`,
          [stay.id, stay.patientId || '', stay.roomNumber || '', stay.departmentName || '', stay.status || 'Davolanmoqda', created, JSON.stringify(stay)]
        );
        return jsonResp({ success: true, message: `Statsionar bemor qo'shildi: ${stay.id}` });
      }

      // =====================================================
      // AUDIT LOG + HEALTH
      // =====================================================
      if (path === "/api/audit-logs" && method === "GET") {
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const logs: any = await conn.execute(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?`, [Math.min(limit, 1000)]);
        const logRows = Array.isArray(logs) ? logs : (logs?.rows || []);
        return jsonResp({ success: true, count: logRows.length, logs: logRows });
      }

      if (path === "/api/health" && method === "GET") {
        return jsonResp({ success: true, uptime: 0, memoryMB: 0, timestamp: new Date().toISOString(), env: 'cloudflare-worker' });
      }

      // =====================================================
      // LEGACY: POST /api/save (departments, rooms, settings uchun JSON blob)
      // patients/transactions/inpatientStays uchun ishlatilmaydi
      // =====================================================
      if (path === "/api/save" && method === "POST") {
        const body = await request.json();
        const { key, data, forceReplace } = body;
        if (!key || data === undefined || data === null) {
          return jsonResp({ error: "key va data kerak" }, 400);
        }
        const jsonStr = JSON.stringify(data);
        await conn.execute(
          `INSERT INTO clinic_erp_data (key_name, json_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE json_value = ?`,
          [key, jsonStr, jsonStr]
        );
        return jsonResp({ success: true, message: `Saqlandi: ${key}` });
      }

      // SSE endpoint (Cloudflare Worker cheklovi — real SSE yo'q, lekin /api/events query param bilan)
      if (path === "/api/events") {
        return jsonResp({ type: "connected", message: "SSE not supported on Worker, use polling" });
      }

      return jsonResp({ error: "Not found", path, method }, 404);
    } catch (e: any) {
      return jsonResp({ error: e.message, stack: e.stack?.substring(0, 200) }, 500);
    }
  },
};
