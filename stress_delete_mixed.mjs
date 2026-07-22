console.log("=== 200 PARALLEL DELETE ===");
const BASE = 'http://localhost:3000';
const delPromises = [];
for (let i = 1; i <= 200; i++) {
  delPromises.push(
    fetch(`${BASE}/api/patients/P-INS-${i}`, { method: 'DELETE' })
      .then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
  );
}
const delResults = await Promise.all(delPromises);
const delOk = delResults.filter(r => r === 'OK').length;
console.log(`DELETE natija: ${delOk}/200 OK`);
const r1 = await fetch(`${BASE}/api/data`);
const d1 = await r1.json();
let delVerified = 0;
for (let i = 1; i <= 200; i++) {
  if (!d1.patients.some(p => p.id === `P-INS-${i}`)) delVerified++;
}
console.log(`O'chirilgan: ${delVerified}/200 ${delVerified === 200 ? '✅' : '❌'}`);

console.log("\n=== 300 ARALASH (INSERT+UPDATE+DELETE) ===");
const mixPromises = [];
const mixIds = [];
for (let i = 1; i <= 300; i++) {
  const op = i % 3;
  if (op === 0) {
    const id = `P-MIX-${i}`;
    mixIds.push({ id, op: 'INSERT' });
    const ts = new Date().toISOString();
    mixPromises.push(
      fetch(`${BASE}/api/patients`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id, patientCode: id, queueNumber: 98000+i, lastName:`Mix${i}`, firstName:'Test', phone:`+99891${i}`, birthDate:'1990-01-01', gender:'Erkak', departmentId:'lor', doctorName:'Dr.Mix', status:'Kutmoqda', paymentStatus:"To'langan", paymentAmount:50000, createdAt:ts, updatedAt:ts, selectedServices:[], isReturning:false, visitCount:1 }),
      }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
    );
  } else if (op === 1 && mixIds.length > 0) {
    const lastId = mixIds[mixIds.length - 1].id;
    mixPromises.push(
      fetch(`${BASE}/api/patients/${lastId}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ status: 'Qabulda', diagnosis: `Mixed ${i}` }),
      }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
    );
  } else if (mixIds.length > 0) {
    const lastId = mixIds[mixIds.length - 1].id;
    mixPromises.push(
      fetch(`${BASE}/api/patients/${lastId}`, { method: 'DELETE' })
        .then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
    );
  } else {
    mixPromises.push(Promise.resolve('SKIP'));
  }
}
const mixResults = await Promise.all(mixPromises);
const mixOk = mixResults.filter(r => r === 'OK' || r === 'SKIP').length;
console.log(`Aralash natija: ${mixOk}/300 ${mixOk === 300 ? '✅' : '❌'}`);

// Tozalash
const r2 = await fetch(`${BASE}/api/data`);
const d2 = await r2.json();
const remaining = d2.patients.filter(p => p.id.includes('P-MIX-'));
for (const p of remaining) {
  await fetch(`${BASE}/api/patients/${p.id}`, { method: 'DELETE' });
}
const r3 = await fetch(`${BASE}/api/data`);
const d3 = await r3.json();
console.log(`\n=== YAKUNIY ===`);
console.log(`Yakuniy bemorlar: ${d3.patients.length} (217 bo'lishi kerak)`);
console.log(d3.patients.length === 217 ? '🎉 STRESS-TEST PASSED — bitta ham yozuv yo\'qolmadi!' : '❌ XATO');
