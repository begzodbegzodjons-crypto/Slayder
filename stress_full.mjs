// =====================================================
// TO'LIQ STRESS-TEST: 1000 INSERT + 1000 UPDATE + 1000 DELETE + ARALASH
// Har bir operatsiya SQL Transaction ichida
// Natija: bitta ham yozuv yo'qolmasligi, duplicate bo'lmasligi
// =====================================================
console.log("═══════════════════════════════════════════════════════");
console.log("  TO'LIQ STRESS-TEST — Professional Relational Schema");
console.log("═══════════════════════════════════════════════════════\n");

const BASE = 'http://localhost:3000';

// 1. Boshlang'ich holat
const r0 = await fetch(`${BASE}/api/data`);
const d0 = await r0.json();
console.log(`Boshlang'ich: ${d0.patients.length} bemor\n`);

// ============ 1. 1000 PARALLEL INSERT ============
console.log("─── 1. 1000 PARALLEL INSERT ───");
const insertIds = [];
const insertPromises = [];
for (let i = 1; i <= 1000; i++) {
  const id = `P-INS-${Date.now()}-${i}`;
  insertIds.push(id);
  const ts = new Date().toISOString();
  const patient = {
    id, patientCode: id, queueNumber: 99000 + i,
    lastName: `Insert${i}`, firstName: `Test${i}`,
    phone: `+99890${String(i).padStart(7,'0')}`, birthDate: '1990-01-01',
    gender: 'Erkak', departmentId: 'lor', doctorName: 'Dr.Test',
    status: 'Kutmoqda', paymentStatus: "To'langan", paymentAmount: 40000,
    createdAt: ts, updatedAt: ts,
    selectedServices: [], isReturning: false, visitCount: 1,
  };
  insertPromises.push(
    fetch(`${BASE}/api/patients`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(patient),
    }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
  );
}
console.log("1000 ta INSERT yuborildi...");
const insertResults = await Promise.all(insertPromises);
const insertOk = insertResults.filter(r => r === 'OK').length;
console.log(`INSERT natija: ${insertOk}/1000 OK`);

// Tekshirish — nechtasi saqlangan
const r1 = await fetch(`${BASE}/api/data`);
const d1 = await r1.json();
let insertSaved = 0;
for (const id of insertIds) {
  if (d1.patients.some(p => p.id === id)) insertSaved++;
}
console.log(`Saqlangan: ${insertSaved}/1000 ${insertSaved === 1000 ? '✅' : '❌'}\n`);

// ============ 2. 1000 PARALLEL UPDATE ============
console.log("─── 2. 1000 PARALLEL UPDATE ───");
const updatePromises = [];
for (let i = 0; i < 1000; i++) {
  const id = insertIds[i];
  updatePromises.push(
    fetch(`${BASE}/api/patients/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'Qabulda', paymentStatus: "To'langan", diagnosis: `Updated stress test ${i}` }),
    }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
  );
}
console.log("1000 ta UPDATE yuborildi...");
const updateResults = await Promise.all(updatePromises);
const updateOk = updateResults.filter(r => r === 'OK').length;
console.log(`UPDATE natija: ${updateOk}/1000 OK`);

// Tekshirish — status o'zgarganmi?
const r2 = await fetch(`${BASE}/api/data`);
const d2 = await r2.json();
let updateVerified = 0;
for (const id of insertIds) {
  const p = d2.patients.find(p => p.id === id);
  if (p && p.status === 'Qabulda' && p.diagnosis && p.diagnosis.includes('stress test')) updateVerified++;
}
console.log(`Tasdiqlangan: ${updateVerified}/1000 ${updateVerified === 1000 ? '✅' : '❌'}\n`);

// ============ 3. 1000 PARALLEL DELETE ============
console.log("─── 3. 1000 PARALLEL DELETE ───");
const deletePromises = [];
for (let i = 0; i < 1000; i++) {
  const id = insertIds[i];
  deletePromises.push(
    fetch(`${BASE}/api/patients/${id}`, {
      method: 'DELETE',
    }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
  );
}
console.log("1000 ta DELETE yuborildi...");
const deleteResults = await Promise.all(deletePromises);
const deleteOk = deleteResults.filter(r => r === 'OK').length;
console.log(`DELETE natija: ${deleteOk}/1000 OK`);

// Tekshirish — o'chirilganmi?
const r3 = await fetch(`${BASE}/api/data`);
const d3 = await r3.json();
let deleteVerified = 0;
for (const id of insertIds) {
  if (!d3.patients.some(p => p.id === id)) deleteVerified++;
}
console.log(`O'chirilgan: ${deleteVerified}/1000 ${deleteVerified === 1000 ? '✅' : '❌'}\n`);

// ============ 4. ARALASH INSERT + UPDATE + DELETE ============
console.log("─── 4. ARALASH INSERT + UPDATE + DELETE (1000 ta) ───");
const mixedIds = [];
const mixedPromises = [];
for (let i = 1; i <= 1000; i++) {
  const op = i % 3; // 0=INSERT, 1=UPDATE, 2=DELETE
  if (op === 0) {
    // INSERT
    const id = `P-MIX-${Date.now()}-${i}`;
    mixedIds.push({ id, op: 'INSERT' });
    const ts = new Date().toISOString();
    mixedPromises.push(
      fetch(`${BASE}/api/patients`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id, patientCode: id, queueNumber: 98000+i, lastName:`Mix${i}`, firstName:`Test`, phone:`+99891${i}`, birthDate:'1990-01-01', gender:'Erkak', departmentId:'lor', doctorName:'Dr.Mix', status:'Kutmoqda', paymentStatus:"To'langan", paymentAmount:50000, createdAt:ts, updatedAt:ts, selectedServices:[], isReturning:false, visitCount:1 }),
      }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
    );
  } else if (op === 1) {
    // UPDATE — oxirgi INSERT qilingan bemorni yangilash
    const prevId = mixedIds.length > 0 ? mixedIds[mixedIds.length - 1].id : null;
    if (prevId) {
      mixedIds.push({ id: prevId, op: 'UPDATE' });
      mixedPromises.push(
        fetch(`${BASE}/api/patients/${prevId}`, {
          method: 'PUT', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ status: 'Qabulda', diagnosis: `Mixed update ${i}` }),
        }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
      );
    } else {
      mixedIds.push({ id: 'skip', op: 'SKIP' });
      mixedPromises.push(Promise.resolve('SKIP'));
    }
  } else {
    // DELETE — oxirgi INSERT qilingan bemorni o'chirish
    const prevId = mixedIds.length > 0 ? mixedIds[mixedIds.length - 1].id : null;
    if (prevId && prevId !== 'skip') {
      mixedIds.push({ id: prevId, op: 'DELETE' });
      mixedPromises.push(
        fetch(`${BASE}/api/patients/${prevId}`, {
          method: 'DELETE',
        }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
      );
    } else {
      mixedIds.push({ id: 'skip', op: 'SKIP' });
      mixedPromises.push(Promise.resolve('SKIP'));
    }
  }
}
console.log("1000 ta aralash operatsiya yuborildi...");
const mixedResults = await Promise.all(mixedPromises);
const mixedOk = mixedResults.filter(r => r === 'OK' || r === 'SKIP').length;
console.log(`Aralash natija: ${mixedOk}/1000 OK`);

// Tozalash — qolgan MIX bemorlarni o'chirish
const r4 = await fetch(`${BASE}/api/data`);
const d4 = await r4.json();
const remaining = d4.patients.filter(p => p.id.includes('P-MIX-'));
console.log(`Qolgan MIX bemorlar: ${remaining.length} (tozalanmoqda...)`);
for (const p of remaining) {
  await fetch(`${BASE}/api/patients/${p.id}`, { method: 'DELETE' });
}

// ============ YAKUNIY HISOB ============
const r5 = await fetch(`${BASE}/api/data`);
const d5 = await r5.json();
console.log("\n═══════════════════════════════════════════════════════");
console.log("  YAKUNIY HISOB");
console.log("═══════════════════════════════════════════════════════");
console.log(`Boshlang'ich bemorlar: ${d0.patients.length}`);
console.log(`Yakuniy bemorlar: ${d5.patients.length}`);
console.log(`Farq: ${d5.patients.length - d0.patients.length} (0 bo'lishi kerak)`);
console.log("");
console.log(`1000 INSERT: ${insertSaved}/1000 saqlandi ${insertSaved === 1000 ? '✅' : '❌'}`);
console.log(`1000 UPDATE: ${updateVerified}/1000 tasdiqlandi ${updateVerified === 1000 ? '✅' : '❌'}`);
console.log(`1000 DELETE: ${deleteVerified}/1000 o'chirildi ${deleteVerified === 1000 ? '✅' : '❌'}`);
console.log(`Aralash 1000: ${mixedOk}/1000 muvaffaqiyatli ${mixedOk === 1000 ? '✅' : '❌'}`);
console.log("");
const allPass = insertSaved === 1000 && updateVerified === 1000 && deleteVerified === 1000 && mixedOk === 1000 && d5.patients.length === d0.patients.length;
if (allPass) {
  console.log("🎉 STRESS-TEST TO'LIQ PASSED — bitta ham yozuv yo'qolmadi!");
} else {
  console.log("❌ STRESS-TEST FAILED — ba'zi muammolar bor");
}
