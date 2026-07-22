console.log("=== 200 PARALLEL INSERT (1-batch) ===");
const BASE = 'http://localhost:3000';
const ids = [];
const promises = [];
for (let i = 1; i <= 200; i++) {
  const id = `P-INS-${i}`;
  ids.push(id);
  const ts = new Date().toISOString();
  promises.push(
    fetch(`${BASE}/api/patients`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id, patientCode: id, queueNumber: 99000+i, lastName:`Insert${i}`, firstName:`Test`, phone:`+99890${i}`, birthDate:'1990-01-01', gender:'Erkak', departmentId:'lor', doctorName:'Dr.Test', status:'Kutmoqda', paymentStatus:"To'langan", paymentAmount:40000, createdAt:ts, updatedAt:ts, selectedServices:[], isReturning:false, visitCount:1 }),
    }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
  );
}
const results = await Promise.all(promises);
const ok = results.filter(r => r === 'OK').length;
console.log(`INSERT natija: ${ok}/200 OK`);
const r1 = await fetch(`${BASE}/api/data`);
const d1 = await r1.json();
let saved = 0;
for (const id of ids) { if (d1.patients.some(p => p.id === id)) saved++; }
console.log(`Saqlangan: ${saved}/200 ${saved === 200 ? '✅' : '❌'}`);
