// PROFESSIONAL STRESS-TEST: 4 xil operatsiya
console.log("====================================================");
console.log("  PROFESSIONAL STRESS-TEST (Normalized Schema)");
console.log("====================================================\n");

const BASE = 'http://localhost:3000';
const results = { insert: 0, update: 0, delete: 0, mixed: 0 };

// =====================================================
// 1. 1000 PARALLEL INSERT
// =====================================================
console.log("1️⃣  1000 PARALLEL INSERT...");
const insertIds = [];
const insertPromises = [];
const t1 = Date.now();
for (let i = 1; i <= 1000; i++) {
  const id = `P-INS-${Date.now()}-${i}`;
  insertIds.push(id);
  const patient = {
    id, patientCode: `PC-${i}-${Date.now()}`,
    firstName: `Insert${i}`, lastName: `Test${i}`,
    phone: `+99890${String(i).padStart(7,'0')}`,
    birthDate: '1990-01-01', gender: 'Erkak',
    departmentId: 'lor', doctorName: 'Dr.Test',
    paymentAmount: 40000, paymentStatus: "To'langan",
    status: 'Kutmoqda', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    queueNumber: 99000 + i,
  };
  insertPromises.push(
    fetch(`${BASE}/api/patients`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(patient),
    }).then(r => r.json()).then(j => j.success ? 1 : 0).catch(() => 0)
  );
}
const insertResults = await Promise.all(insertPromises);
results.insert = insertResults.reduce((a,b) => a+b, 0);
const insertTime = ((Date.now() - t1)/1000).toFixed(2);
console.log(`   Natija: ${results.insert}/1000 saqlandi (${insertTime}s)`);

// Tekshirish — barchasi TiDB da bormi?
const r1 = await fetch(`${BASE}/api/data`);
const d1 = await r1.json();
let insertVerified = 0;
for (const id of insertIds) {
  if (d1.patients.some(p => p.id === id)) insertVerified++;
}
console.log(`   Tasdiqlangan TiDB da: ${insertVerified}/1000`);

// =====================================================
// 2. 1000 PARALLEL UPDATE
// =====================================================
console.log("\n2️⃣  1000 PARALLEL UPDATE...");
const updatePromises = [];
const t2 = Date.now();
for (const id of insertIds) {
  updatePromises.push(
    fetch(`${BASE}/api/patients/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'Qabulda', diagnosis: 'Stress test tashxis' }),
    }).then(r => r.json()).then(j => j.success ? 1 : 0).catch(() => 0)
  );
}
const updateResults = await Promise.all(updatePromises);
results.update = updateResults.reduce((a,b) => a+b, 0);
const updateTime = ((Date.now() - t2)/1000).toFixed(2);
console.log(`   Natija: ${results.update}/1000 yangilandi (${updateTime}s)`);

// Tekshirish — status o'zgarganmi?
const r2 = await fetch(`${BASE}/api/data`);
const d2 = await r2.json();
let updateVerified = 0;
for (const id of insertIds) {
  const p = d2.patients.find(p => p.id === id);
  if (p && p.status === 'Qabulda' && p.diagnosis === 'Stress test tashxis') updateVerified++;
}
console.log(`   Tasdiqlangan TiDB da: ${updateVerified}/1000 (status=Qabulda + diagnosis)`);

// =====================================================
// 3. 1000 PARALLEL DELETE
// =====================================================
console.log("\n3️⃣  1000 PARALLEL DELETE...");
const deletePromises = [];
const t3 = Date.now();
for (const id of insertIds) {
  deletePromises.push(
    fetch(`${BASE}/api/patients/${id}`, { method: 'DELETE' })
      .then(r => r.json()).then(j => j.success ? 1 : 0).catch(() => 0)
  );
}
const deleteResults = await Promise.all(deletePromises);
results.delete = deleteResults.reduce((a,b) => a+b, 0);
const deleteTime = ((Date.now() - t3)/1000).toFixed(2);
console.log(`   Natija: ${results.delete}/1000 o'chirildi (${deleteTime}s)`);

// Tekshirish — barchasi o'chirilganmi?
const r3 = await fetch(`${BASE}/api/data`);
const d3 = await r3.json();
let deleteVerified = 0;
for (const id of insertIds) {
  if (!d3.patients.some(p => p.id === id)) deleteVerified++;
}
console.log(`   Tasdiqlangan TiDB da: ${deleteVerified}/1000 o'chirilgan`);

// =====================================================
// 4. ARALASH (MIXED) — 250 INSERT + 250 UPDATE + 250 DELETE + 250 SELECT
// =====================================================
console.log("\n4️⃣  ARALASH (250 INSERT + 250 UPDATE + 250 DELETE + 250 SELECT)...");
const mixedPromises = [];
const mixedIds = [];
const t4 = Date.now();

// 250 INSERT
for (let i = 1; i <= 250; i++) {
  const id = `P-MIX-${Date.now()}-${i}`;
  mixedIds.push(id);
  const patient = {
    id, patientCode: `MC-${i}-${Date.now()}`,
    firstName: `Mix${i}`, lastName: `Test${i}`,
    phone: `+99891${String(i).padStart(7,'0')}`,
    birthDate: '1990-01-01', gender: 'Ayol',
    departmentId: 'nevrologiya', doctorName: 'Dr.Mix',
    paymentAmount: 60000, paymentStatus: "To'langan",
    status: 'Kutmoqda', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    queueNumber: 88000 + i,
  };
  mixedPromises.push(
    fetch(`${BASE}/api/patients`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(patient),
    }).then(r => r.json()).then(j => j.success ? 1 : 0).catch(() => 0)
  );
}

// 250 UPDATE (avval qo'shilganlarni)
await new Promise(r => setTimeout(r, 500)); // INSERT tugashini kutish
const r4a = await fetch(`${BASE}/api/data`);
const d4a = await r4a.json();
const updateableIds = mixedIds.filter(id => d4a.patients.some(p => p.id === id)).slice(0, 250);
for (const id of updateableIds) {
  mixedPromises.push(
    fetch(`${BASE}/api/patients/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'Yakunlangan', diagnosis: 'Aralash test' }),
    }).then(r => r.json()).then(j => j.success ? 1 : 0).catch(() => 0)
  );
}

// 250 DELETE
const deleteableIds = mixedIds.slice(125, 375); // 125-375 oraliqdagi IDlar
for (const id of deleteableIds) {
  mixedPromises.push(
    fetch(`${BASE}/api/patients/${id}`, { method: 'DELETE' })
      .then(r => r.json()).then(j => j.success ? 1 : 0).catch(() => 0)
  );
}

// 250 SELECT
for (let i = 0; i < 250; i++) {
  mixedPromises.push(
    fetch(`${BASE}/api/data`).then(r => r.json()).then(j => j.patients ? 1 : 0).catch(() => 0)
  );
}

const mixedResults = await Promise.all(mixedPromises);
results.mixed = mixedResults.reduce((a,b) => a+b, 0);
const mixedTime = ((Date.now() - t4)/1000).toFixed(2);
console.log(`   Natija: ${results.mixed}/${mixedPromises.length} muvaffaqiyatli (${mixedTime}s)`);

// Aralash testdan keyin qolgan mixed ma'lumotni tozalash
const r5 = await fetch(`${BASE}/api/data`);
const d5 = await r5.json();
const remaining = d5.patients.filter(p => p.id.startsWith('P-MIX-'));
console.log(`   Qolgan MIX bemorlar: ${remaining.length} (tozalanmoqda...)`);
for (const p of remaining) {
  await fetch(`${BASE}/api/patients/${p.id}`, { method: 'DELETE' });
}

// =====================================================
// YAKUNIY HISOBOT
// =====================================================
console.log("\n====================================================");
console.log("  YAKUNIY HISOBOT");
console.log("====================================================");
console.log(`  INSERT: ${results.insert}/1000 ✅ (TiDB: ${insertVerified})`);
console.log(`  UPDATE: ${results.update}/1000 ✅ (TiDB: ${updateVerified})`);
console.log(`  DELETE: ${results.delete}/1000 ✅ (TiDB: ${deleteVerified})`);
console.log(`  ARALASH: ${results.mixed}/${mixedPromises.length} ✅`);

const allPass = results.insert === 1000 && results.update === 1000 && results.delete === 1000
  && insertVerified === 1000 && updateVerified === 1000 && deleteVerified === 1000;
console.log(`\n  ${allPass ? '🎉 BARCHA STRESS-TESTLAR PASSED — bitta ham yozuv yo\'qolmadi!' : '❌ BA\'ZI TESTLAR FAILED'}`);

// Yakuniy holat
const rFinal = await fetch(`${BASE}/api/data`);
const dFinal = await rFinal.json();
console.log(`\n  Yakuniy bemorlar: ${dFinal.patients.length} (217 bo'lishi kerak)`);
console.log(`  Yakuniy tranzaksiyalar: ${dFinal.transactions.length}`);
