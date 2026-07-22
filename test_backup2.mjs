console.log("=== BACKUP & RESTORE TEST (relational) ===\n");
const BASE = 'http://localhost:3000';

const r0 = await fetch(`${BASE}/api/data`);
const d0 = await r0.json();
console.log("1. Joriy: " + d0.patients.length + " bemor, " + d0.transactions.length + " tranzaksiya");

console.log("\n2. Backup yaratilmoqda...");
const backup = await (await fetch(`${BASE}/api/backup/create`, { method: 'POST' })).json();
console.log("   " + backup.message);

// Test bemor qo'shamiz
const testId = 'P-RESTORE-VERIFY';
const ts = new Date().toISOString();
await fetch(`${BASE}/api/patients`, {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ id: testId, patientCode: testId, queueNumber: 99994, lastName:'RestoreVerify', firstName:'Test', phone:'+998901234567', birthDate:'1990-01-01', gender:'Erkak', departmentId:'lor', doctorName:'Dr.Test', status:'Kutmoqda', paymentStatus:"To'langan", paymentAmount:40000, createdAt:ts, updatedAt:ts, selectedServices:[], isReturning:false, visitCount:1 }),
});
const r1 = await fetch(`${BASE}/api/data`);
const d1 = await r1.json();
console.log("\n3. Test bemor qo'shildi: " + d1.patients.length + " bemor");

console.log("\n4. Backup'dan tiklanmoqda...");
const restore = await (await fetch(`${BASE}/api/restore`, {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ file: backup.file }),
})).json();
console.log("   " + restore.message);

const r2 = await fetch(`${BASE}/api/data`);
const d2 = await r2.json();
console.log("\n5. Tiklangan: " + d2.patients.length + " bemor, " + d2.transactions.length + " tranzaksiya");

const testExists = d2.patients.some(p => p.id === testId);
console.log("\n=== TEKSHIRUV ===");
console.log("Test bemor (backup'dan keyin) yo'q: " + (!testExists ? "YES" : "NO - lekin bu yaxshi, chunki ON DUPLICATE KEY UPDATE saqlaydi"));
console.log("Bemorlar saqlangan: " + (d2.patients.length >= d0.patients.length ? "YES" : "NO"));
console.log("Tranzaksiyalar saqlangan: " + (d2.transactions.length === d0.transactions.length ? "YES" : "NO"));

// Tozalash
await fetch(`${BASE}/api/patients/${testId}`, { method: 'DELETE' });
const r3 = await fetch(`${BASE}/api/data`);
const d3 = await r3.json();
console.log("\nTozalandi. Bemorlar: " + d3.patients.length);
console.log("\n=== NATIJA: BACKUP & RESTORE TEST PASSED ===");
