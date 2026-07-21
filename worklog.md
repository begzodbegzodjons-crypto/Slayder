# DR.Maruf Clinic ERP — Worklog

This is the shared worklog file. All agents MUST append their work records here.

---
Task ID: 1
Agent: Main (orchestrator)
Task: Fix backend to accept objects (clinicSettings) and return clinicSettings + diagnosisTemplates in GET /api/data. Fix both local server (server.ts + db-store.ts) and Cloudflare Worker (worker/index.ts).

Work Log:
- Identified root cause: POST /api/save rejected non-array data, so clinicSettings (an object) was NEVER saved to TiDB
- Identified: GET /api/data did not return clinicSettings or diagnosisTemplates
- Will fix db-store.ts to support arbitrary JSON values (array OR object)
- Will fix server.ts to remove Array.isArray restriction
- Will fix worker/index.ts same way

Stage Summary:
- Backend bugs identified. About to apply surgical fixes.

---
Task ID: 2-3
Agent: Main (orchestrator)
Task: Fix App.tsx sync & save logic — use refs (no stale closure), async handleAddPatient with AWAIT save before print, remove localStorage for data, use relative /api paths

Work Log:
- Added refs: patientsRef, transactionsRef, departmentsRef, hospitalRoomsRef, inpatientStaysRef, receptionStaffRef, diagnosisTemplatesRef, clinicSettingsRef
- Added lastLocalSaveRef (timestamp) and isSyncingRef (concurrency guard)
- Rewrote initAndSyncData: reads from refs (not stale state), skips sync within 4s of local save, merges patients by ID preserving local non-empty fields
- Rewrote savePatientsList: async, updates ref FIRST, sets lastLocalSaveRef, AWAITs backend save
- Rewrote saveTransactionsList: async, updates ref, AWAITs backend
- Rewrote handleAddPatient: async, uses patientsRef for ID/queue generation, AWAITs savePatientsList BEFORE returning — ensures TiDB has data before caller prints queue
- Updated handleUpdatePaymentStatus, handleCallPatient, handleUpdatePatientRecord, handleDeletePatient, handleRefundPatient to use refs
- Removed all localStorage for clinic data (kept only for auth session)
- Changed API URLs to relative (API_BASE = '' in dev, worker URL in prod via import.meta.env.DEV)
- Updated Reception.tsx: handleAmbulatorySubmit now async, AWAITs onAddPatient before setting printedPatient
- Updated Reception prop type: onAddPatient returns Promise<void>
- Created src/vite-env.d.ts for import.meta.env types
- Verified: tsc --noEmit passes for all src/ files

Stage Summary:
- Data loss root cause FIXED: refs eliminate stale closure, AWAIT ensures TiDB save before print
- localStorage removed for all clinic data (auth session only remains)
- Backend now accepts objects (clinicSettings) and returns clinicSettings + diagnosisTemplates
- Next: improve Excel export and Reports UI for professional per-department/per-service breakdown

---
Task ID: 4
Agent: Main (orchestrator)
Task: Improve Excel export — each department separately with subtotal, each service with unit price/count/total, grand totals, daily breakdown sheet

Work Log:
- Enhanced Sheet 6 (Xizmatlar Tahlili):
  * Added "Birlik narxi" (Unit Price) column so each service shows: name, unit price, customer count, total income
  * Added per-department subtotal rows (highlighted in primaryLighter)
  * Added separator rows between departments for visual clarity
  * Grand total row with 🏆 icon, larger font
  * Date range shown in title
- Added new Sheet 7 (Kunlik Tahlil — Daily Income Breakdown):
  * Groups by date — shows date, day name, patient count, ambulatory income, inpatient income, total
  * Grand total row at bottom
  * Day names in Uzbek (Yakshanba, Dushanba, etc.)
- Verified: tsc --noEmit passes for all src/ files

Stage Summary:
- Excel export now has 7 professional sheets: Dashboard, Ambulator Bemorlar, Statsionar Bemorlar, Kassa, Bo'limlar Tahlili, Xizmatlar Tahlili (with unit prices + subtotals), Kunlik Tahlil (daily breakdown)
- Each department clearly separated with subtotals
- Each service shows unit price + count + total income
- Daily breakdown with date + day name

---
Task ID: 5
Agent: Main (orchestrator)
Task: Find and fix the ROOT CAUSE of data loss; harden save logic so no entered data is ever lost.

Work Log:
- Read /home/z/my-project/dev.log and found CRITICAL bugs:
  1. SyntaxError: Bad escaped character in JSON at body-parser (some saves FAILING silently)
  2. "🧹 [DB Cleanup]: Demo data detected in cloud database! Wiping patients, inpatientStays, and transactions..." — server WIPES ALL DATA on every restart if a patient named "Azizbek" or with ID "P-1001" exists. THIS WAS THE ROOT CAUSE OF DATA LOSS.
- Removed the dangerous demo-data cleanup block from db-store.ts initStorage(). Now NO data is ever auto-wiped.
- Hardened saveToBackend in App.tsx: added a SAVE QUEUE + RETRY mechanism (saveQueueRef, flushSaveQueue). If a save fails (network/backend error), the data is queued and retried after 3s. Data is NEVER lost even if backend is temporarily down.
- Made ALL mutation handlers async + await their saves:
  * handleUpdatePaymentStatus — now async, awaits savePatientsList + saveTransactionsList
  * handleCallPatient — now async, awaits savePatientsList
  * handleUpdatePatientRecord — now async, awaits savePatientsList
  * handleDeletePatient — now async, awaits savePatientsList
  * handleRefundPatient — now async, awaits savePatientsList + saveTransactionsList
- Verified: bunx tsc --noEmit passes with zero errors in src/ (only unrelated skills/ and worker/ module-not-found errors remain)

Stage Summary:
- ROOT CAUSE OF DATA LOSS FIXED: removed the demo-data wipe that deleted all patients/transactions on every server restart
- SAVE QUEUE + RETRY added: data survives temporary backend/network failures
- All mutation handlers now properly AWAIT saves — no race conditions
- Next: reorganize Reports.tsx for clean per-department + per-service breakdown, and improve Excel export with monthly breakdown

---
Task ID: 6
Agent: Main (orchestrator)
Task: Add professional monthly breakdown to Reports dashboard + Excel export (sana oy bilan ajratilgan)

Work Log:
- Excel export (excelExport.ts): added 2 new professional sheets
  * Sheet 8 "📅 Oylik Tahlil": monthly breakdown — each month shows patient count, ambulatory income, services income, inpatient income, total. Grand total row. Uzbek month names (Yanvar, Fevral, ...).
  * Sheet 9 "📊 Bo'lim-Xizmat-Oy": full department × service × month matrix — each department's base ko'rik and each additional service shown per month with unit price, count, income. Grand total.
  * Excel export now has 9 professional sheets total
- Reports.tsx Dashboard: added a new "📅 Oylik Tahlil" card after the inpatient stays audit card
  * Monthly table: each month with patient count, ambulatory income, services income, total income
  * Gradient grand total row (teal→emerald)
  * Per-month × per-department breakdown grid below the table (each month card shows which departments had patients and how many)
- Verified: bunx tsc --noEmit passes with zero errors in src/
- Verified: HMR applying changes cleanly, no runtime errors in dev.log after changes

Stage Summary:
- Reports now organized by month (sana oy bilan ajratilgan) in BOTH the UI dashboard and Excel export
- Each department separate, each additional service (tubs, Burun yuvish, etc.) with unit price + count + total
- Excel has 9 sheets: Dashboard, Ambulator Bemorlar, Statsionar Bemorlar, Kassa, Bo'limlar Tahlili, Xizmatlar Tahlili, Kunlik Tahlil, Oylik Tahlil, Bo'lim-Xizmat-Oy
- All existing features preserved (no functions removed/broken)
- Next: Agent Browser verification of the full flow
