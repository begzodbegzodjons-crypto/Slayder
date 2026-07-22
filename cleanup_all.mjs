const BASE = 'http://localhost:3000';
const r = await fetch(`${BASE}/api/data`);
const d = await r.json();
const toDelete = d.patients.filter(p => p.id.includes('P-INS-') || p.id.includes('P-MIX-') || p.id.includes('P-CONC-') || p.id.includes('P-STRESS-') || p.id.includes('P-TEST-'));
console.log(`Tozalash: ${toDelete.length} ta test bemor o'chirilmoqda...`);
// Batch bilan o'chiramiz (100 tadan)
for (let i = 0; i < toDelete.length; i += 100) {
  const batch = toDelete.slice(i, i + 100);
  await Promise.all(batch.map(p =>
    fetch(`${BASE}/api/patients/${p.id}`, { method: 'DELETE' }).catch(() => {})
  ));
  console.log(`  ${Math.min(i + 100, toDelete.length)}/${toDelete.length} o'chirildi`);
}
const r2 = await fetch(`${BASE}/api/data`);
const d2 = await r2.json();
console.log(`Yakuniy: ${d2.patients.length} bemor (217 bo'lishi kerak)`);
