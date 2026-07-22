console.log("=== 200 PARALLEL UPDATE ===");
const BASE = 'http://localhost:3000';
const promises = [];
for (let i = 1; i <= 200; i++) {
  const id = `P-INS-${i}`;
  promises.push(
    fetch(`${BASE}/api/patients/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'Qabulda', diagnosis: `Updated ${i}` }),
    }).then(r => r.json()).then(j => j.success ? 'OK' : 'FAIL').catch(() => 'ERR')
  );
}
const results = await Promise.all(promises);
const ok = results.filter(r => r === 'OK').length;
console.log(`UPDATE natija: ${ok}/200 OK`);
const r1 = await fetch(`${BASE}/api/data`);
const d1 = await r1.json();
let verified = 0;
for (let i = 1; i <= 200; i++) {
  const p = d1.patients.find(p => p.id === `P-INS-${i}`);
  if (p && p.status === 'Qabulda' && p.diagnosis === `Updated ${i}`) verified++;
}
console.log(`Tasdiqlangan: ${verified}/200 ${verified === 200 ? '✅' : '❌'}`);
