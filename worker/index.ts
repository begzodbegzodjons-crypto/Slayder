import { connect } from "@tidbcloud/serverless";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    // Debug endpoint
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

      // Ensure table exists
      await conn.execute(`CREATE TABLE IF NOT EXISTS clinic_erp_data (
        key_name VARCHAR(100) PRIMARY KEY,
        json_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`);

      // GET /api/data
      if (path === "/api/data" && method === "GET") {
        const res: any = await conn.execute(`SELECT key_name, json_value FROM clinic_erp_data`);
        const rows = Array.isArray(res) ? res : (res?.rows || []);
        const data: Record<string, any> = {};
        for (const row of rows as any[]) {
          try { data[row.key_name] = JSON.parse(row.json_value); } catch {}
        }
        return jsonResp({
          patients: data.patients || [],
          departments: data.departments || [],
          receptionStaff: data.receptionStaff || [],
          hospitalRooms: data.hospitalRooms || [],
          inpatientStays: data.inpatientStays || [],
          transactions: data.transactions || [],
          diagnosisTemplates: data.diagnosisTemplates || [],
          clinicSettings: data.clinicSettings || null,
        });
      }

      // POST /api/save — supports arrays AND objects (clinicSettings is an object)
      if (path === "/api/save" && method === "POST") {
        const body = await request.json();
        const { key, data } = body;
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

      // POST /api/seed
      if (path === "/api/seed" && method === "POST") {
        const departments = [
          { id: 'lor', name: 'LOR (Quloq-Burun-Tomoq)', doctorName: 'Dr. Shavkatov Rustam', room: '102-Xona', price: 150000, login: 'lor', password: 'lor123' },
          { id: 'nevrologiya', name: 'Nevrologiya', doctorName: 'Dr. Marufov Sanjar', room: '204-Xona', price: 180000, login: 'nevro', password: 'nevro123' },
          { id: 'kardiologiya', name: 'Kardiologiya', doctorName: 'Dr. Aliyeva Madina', room: '301-Xona', price: 200000, login: 'kardio', password: 'kardio123' },
          { id: 'labaratoriya', name: 'Laboratoriya (Tahlillar)', doctorName: 'Dr. Karimboyev Hilol', room: '105-Xona', price: 120000, login: 'lab', password: 'lab123' },
        ];
        const staff = [
          { id: 'admin-1', name: 'Administrator', login: 'admin', password: 'admin123' },
        ];
        const rooms = [
          { id: 'room-301', roomNumber: '301', capacity: 2, pricePerDay: 200000, occupiedBeds: 0, genderType: 'Erkak' },
          { id: 'room-302', roomNumber: '302', capacity: 3, pricePerDay: 150000, occupiedBeds: 0, genderType: 'Ayol' },
          { id: 'room-303', roomNumber: '303', capacity: 2, pricePerDay: 250000, occupiedBeds: 0, genderType: 'Aralash' },
        ];

        await conn.execute(`INSERT INTO clinic_erp_data (key_name, json_value) VALUES ('departments', ?) ON DUPLICATE KEY UPDATE json_value = ?`, [JSON.stringify(departments), JSON.stringify(departments)]);
        await conn.execute(`INSERT INTO clinic_erp_data (key_name, json_value) VALUES ('receptionStaff', ?) ON DUPLICATE KEY UPDATE json_value = ?`, [JSON.stringify(staff), JSON.stringify(staff)]);
        await conn.execute(`INSERT INTO clinic_erp_data (key_name, json_value) VALUES ('hospitalRooms', ?) ON DUPLICATE KEY UPDATE json_value = ?`, [JSON.stringify(rooms), JSON.stringify(rooms)]);
        await conn.execute(`INSERT INTO clinic_erp_data (key_name, json_value) VALUES ('patients', ?) ON DUPLICATE KEY UPDATE json_value = ?`, ['[]', '[]']);
        await conn.execute(`INSERT INTO clinic_erp_data (key_name, json_value) VALUES ('inpatientStays', ?) ON DUPLICATE KEY UPDATE json_value = ?`, ['[]', '[]']);
        await conn.execute(`INSERT INTO clinic_erp_data (key_name, json_value) VALUES ('transactions', ?) ON DUPLICATE KEY UPDATE json_value = ?`, ['[]', '[]']);

        return jsonResp({ success: true, message: "Seed completed" });
      }

      return jsonResp({ error: "Not found", path, method }, 404);
    } catch (e: any) {
      return jsonResp({ error: e.message, stack: e.stack?.substring(0, 200) }, 500);
    }
  },
};
