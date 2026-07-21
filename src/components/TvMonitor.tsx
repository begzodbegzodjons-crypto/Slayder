import React, { useState, useEffect } from 'react';
import { Patient, DepartmentId, Department } from '../types';
import { DEPARTMENTS as STATIC_DEPARTMENTS } from '../data';
import { Tv, Volume2, VolumeX, AlertCircle, Clock, Bell, Maximize2, Minimize2, ZoomIn, ZoomOut, Eraser } from 'lucide-react';

interface TvMonitorProps {
  patients: Patient[];
  inlineMode?: boolean; // If true, it's displayed inside the admin panel. If false, it's the fullscreen HDMI view.
  departments?: Department[];
}

export const TvMonitor: React.FC<TvMonitorProps> = ({ patients, inlineMode = false, departments }) => {
  const [activeCalled, setActiveCalled] = useState<Patient | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastCalledId, setLastCalledId] = useState<string>('');
  const [flashScreen, setFlashScreen] = useState<boolean>(false);
  const [localPatients, setLocalPatients] = useState<Patient[]>(patients);
  const [localDepts, setLocalDepts] = useState<Department[]>(departments || STATIC_DEPARTMENTS);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.8 to 1.5
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  // Monitor tozalash - vizual ko'rinishni tozalaydi, bazodan hech narsa o'chirmaydi
  const [isMonitorCleared, setIsMonitorCleared] = useState<boolean>(false);


  // Sync fullscreen state with native browser fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Fullscreen entry error:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Fullscreen exit error:", err);
      });
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 1.6));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.7));
  };

  // =====================================================
  // REAL-TIME SSE — polling yo'q!
  // Server ma'lumot o'zgarganda darhol yangilanadi.
  // Aloqasi uzilsa — avtomatik qayta ulanadi.
  // =====================================================
  const API_BASE = import.meta.env.DEV ? '' : 'https://medical-pro-api.norinkomp.workers.dev';

  useEffect(() => {
    // 1) Boshlang'ich ma'lumotni yuklash
    const loadInitial = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/data`);
        if (!res.ok) throw new Error('API server down');
        const dbData = await res.json();
        if (dbData.patients) setLocalPatients(dbData.patients);
        if (dbData.departments) setLocalDepts(dbData.departments);
        setConnectionStatus('online');
      } catch (err) {
        setConnectionStatus('offline');
      }
    };
    loadInitial();

    // 2) SSE ulanish — real-time yangilanishlar
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource(`${API_BASE}/api/events`);
        es.onopen = () => setConnectionStatus('online');
        es.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'connected') return;
            if (msg.type === 'update') {
              if (msg.key === 'patients') setLocalPatients(msg.data);
              else if (msg.key === 'departments') setLocalDepts(msg.data);
            }
          } catch {}
        };
        es.onerror = () => {
          setConnectionStatus('offline');
          if (es) { try { es.close(); } catch {} es = null; }
          reconnectTimer = setTimeout(connectSSE, 3000);
        };
      } catch {
        reconnectTimer = setTimeout(connectSSE, 3000);
      }
    };
    connectSSE();

    return () => {
      if (es) { try { es.close(); } catch {} }
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Update localPatients instantly when patients prop changes (important for same-tab inline preview)
  useEffect(() => {
    if (patients) {
      setLocalPatients(patients);
    }
  }, [patients]);

  // Update depts if prop updates
  useEffect(() => {
    if (departments && departments.length > 0) {
      setLocalDepts(departments);
    }
  }, [departments]);

  // Set the current active called patient
  useEffect(() => {
    // Active is the one with status = 'Qabulda' and most recently called (max calledAt)
    const activeOnes = localPatients.filter((p) => p.status === 'Qabulda');
    if (activeOnes.length > 0) {
      // Sort by calledAt descending
      activeOnes.sort((a, b) => {
        const t1 = a.calledAt ? new Date(a.calledAt).getTime() : 0;
        const t2 = b.calledAt ? new Date(b.calledAt).getTime() : 0;
        return t2 - t1;
      });
      const current = activeOnes[0];
      setActiveCalled(current);

      // Check if this is a newly called patient to play sound/TTS
      if (current && current.id !== lastCalledId) {
        setLastCalledId(current.id);
        triggerCallAlert(current);
      }
    } else {
      setActiveCalled(null);
    }
  }, [localPatients, lastCalledId]);

  const getDeptName = (id: DepartmentId) => {
    return localDepts.find((d) => d.id === id)?.name || id;
  };

  const getRoomNumber = (id: DepartmentId) => {
    return localDepts.find((d) => d.id === id)?.room || 'Noma\'lum';
  };

  const triggerCallAlert = (patient: Patient) => {
    // Flash screen effect
    setFlashScreen(true);
    setTimeout(() => setFlashScreen(false), 2500);

    if (!soundEnabled) return;

    // 1. Play professional chime audio using AudioContext
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Chime note sequence
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, start);
        gainNode.gain.setValueAtTime(0, start);
        gainNode.gain.linearRampToValueAtTime(0.3, start + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.05);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.4); // C5
      playTone(659.25, now + 0.15, 0.4); // E5
      playTone(783.99, now + 0.3, 0.4); // G5
      playTone(1046.50, now + 0.5, 0.6); // C6
    } catch (e) {
      console.log('Audio error:', e);
    }

    // 2. Bemor nomini toza o'zbek tilida ovozli e'lon qilish (TTS)
    // MUHIM: Faqat o'zbek tili (uz-UZ) ishlatiladi — ruscha/turkcha ovozlar OLIB TASHLANDI.
    // Brauzerda o'zbek ovozi bo'lmasa, default ovozdan foydalaniladi (nutq matni o'zbekcha).
    try {
      const deptName = getDeptName(patient.departmentId);
      const room = getRoomNumber(patient.departmentId);
      const speechText = `Navbat ${patient.queueNumber}. ${patient.lastName} ${patient.firstName}. ${deptName}, ${room}ga marhamat!`;

      const utterance = new SpeechSynthesisUtterance(speechText);
      // O'zbek tili majburiy — brauzer o'zbek ovozini tanlaydi
      utterance.lang = 'uz-UZ';
      utterance.rate = 0.85; // aniq chiqishi uchun biroz sekinroq
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Faqat o'zbek ovozini tanlaymiz — ruscha/turkcha EMAS
      const voices = window.speechSynthesis.getVoices();
      const uzVoice = voices.find(v => v.lang.toLowerCase().startsWith('uz'));
      if (uzVoice) {
        utterance.voice = uzVoice;
      }
      // Agar o'zbek ovozi topilmasa — default ovoz ishlatiladi,
      // lekin nutq matni (speechText) o'zbekcha bo'lgani uchun
      // brauzer uni imkon qadar o'zbekcha o'qishga harakat qiladi.

      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 1000);
    } catch (e) {
      console.log('TTS error:', e);
    }
  };

  // Helper to retrieve color coding and styling for each department
  const getDeptColorInfo = (id: string) => {
    const normId = id.toLowerCase();
    if (normId.includes('lor')) {
      return {
        colorName: "KO'K (LOR)",
        badgeBg: 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-[0_4px_12px_rgba(14,165,233,0.15)]',
        badgeText: 'text-white',
        borderClass: 'border-sky-100',
        rowBg: 'bg-white hover:bg-sky-50/20 border border-slate-100',
        textColor: 'text-sky-600 font-extrabold',
        roomBg: 'bg-sky-50 text-sky-800 border-sky-100',
        lightBg: 'bg-sky-50/50',
        glow: 'shadow-[0_10px_30px_rgba(14,165,233,0.06)]',
        accentGlow: 'bg-sky-50 border border-sky-100 text-sky-700',
      };
    }
    if (normId.includes('nevro')) {
      return {
        colorName: "SARIQ (NEVROLOGIYA)",
        badgeBg: 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.15)]',
        badgeText: 'text-slate-900',
        borderClass: 'border-amber-100',
        rowBg: 'bg-white hover:bg-amber-50/20 border border-slate-100',
        textColor: 'text-amber-700 font-extrabold',
        roomBg: 'bg-amber-50 text-amber-900 border-amber-100',
        lightBg: 'bg-amber-50/50',
        glow: 'shadow-[0_10px_30px_rgba(245,158,11,0.06)]',
        accentGlow: 'bg-amber-50 border border-amber-100 text-amber-800',
      };
    }
    if (normId.includes('kardio')) {
      return {
        colorName: "QIZIL (KARDIOLOGIYA)",
        badgeBg: 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_4px_12px_rgba(244,63,94,0.15)]',
        badgeText: 'text-white',
        borderClass: 'border-rose-100',
        rowBg: 'bg-white hover:bg-rose-50/20 border border-slate-100',
        textColor: 'text-rose-600 font-extrabold',
        roomBg: 'bg-rose-50 text-rose-800 border-rose-100',
        lightBg: 'bg-rose-50/50',
        glow: 'shadow-[0_10px_30px_rgba(244,63,94,0.06)]',
        accentGlow: 'bg-rose-50 border border-rose-100 text-rose-700',
      };
    }
    // Default (e.g. labaratoriya, others)
    return {
      colorName: "BINAFSHA (LABORATORIYA)",
      badgeBg: 'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-[0_4px_12px_rgba(168,85,247,0.15)]',
      badgeText: 'text-white',
      borderClass: 'border-purple-100',
      rowBg: 'bg-white hover:bg-purple-50/20 border border-slate-100',
      textColor: 'text-purple-600 font-extrabold',
      roomBg: 'bg-purple-50 text-purple-800 border-purple-100',
      lightBg: 'bg-purple-50/50',
      glow: 'shadow-[0_10px_30px_rgba(168,85,247,0.06)]',
      accentGlow: 'bg-purple-50 border border-purple-100 text-purple-700',
    };
  };

  // Next waiting list (exclude active called ones and completed ones)
  // Agar monitor tozalangan bo'lsa, bo'sh ro'yxat ko'rsatamiz (bazodan o'chirmaymiz)
  const waitingQueue = isMonitorCleared ? [] : localPatients
    .filter((p) => p.status === 'Kutmoqda')
    .sort((a, b) => a.queueNumber - b.queueNumber)
    .slice(0, 20);

  // Unified list of patients to display in the main center board: shows active 'Qabulda' first, then 'Kutmoqda'
  // Agar monitor tozalangan bo'lsa, faqat faol qabuldagi bemorni ko'rsatamiz (navbatni tozalaymiz)
  const displayPatients = isMonitorCleared ? [] : localPatients
    .filter((p) => p.status === 'Qabulda' || p.status === 'Kutmoqda')
    .sort((a, b) => {
      if (a.status === 'Qabulda' && b.status !== 'Qabulda') return -1;
      if (a.status !== 'Qabulda' && b.status === 'Qabulda') return 1;
      return a.queueNumber - b.queueNumber;
    })
    .slice(0, 10); // Display top 10 for absolute legibility and spacing on high-res TVs

  const testTriggerVoice = () => {
    if (activeCalled) {
      triggerCallAlert(activeCalled);
    } else if (localPatients.length > 0) {
      const mockPatient = localPatients[0];
      triggerCallAlert(mockPatient);
    } else {
      alert('Chaqirish uchun bemorlar ro\'yxati bo\'sh!');
    }
  };

  // Agar monitor tozalangan bo'lsa, faol bemor ham ko'rinmaydi
  const displayActiveCalled = isMonitorCleared ? null : activeCalled;

  // Monitor tozalash funksiyasi - faqat vizual ko'rinishni tozalaydi
  // Bazodan hech narsa o'chmaydi! Bemorlar, to'lovlar, tarix — hammasi saqlanib qoladi
  const handleClearMonitor = () => {
    if (!isMonitorCleared) {
      if (window.confirm(
        '🧹 NAVBAT MONITORINI TOZALASH\n\n' +
        'Bu amal faqat monitor ekranidagi navbat ro\'yxatini tozalaydi.\n\n' +
        '✅ Bemorlar ma\'lumotlari bazada saqlanib qoladi\n' +
        '✅ To\'lovlar va tarix o\'chirilmaydi\n' +
        '✅ Hisobotlar o\'zgarishsiz qoladi\n\n' +
        'Monitor tozalansinmi?'
      )) {
        setIsMonitorCleared(true);
      }
    } else {
      // Qayta ko'rsatish
      setIsMonitorCleared(false);
    }
  };

  // Dynamic ticker content to show patients and queue numbers on the moving footer
  const getDynamicTickerText = () => {
    const parts = [
      "🌟 DR.MARUF CLINIK SHIFOKORLARI SIZGA MUSTAHKAM SOG'LIK TILAYDI!",
    ];

    if (displayActiveCalled) {
      parts.push(
        `📣 HOZIRGI QABULDAGI BEMOR: NAVBAT #${displayActiveCalled.queueNumber} - ${displayActiveCalled.lastName.toUpperCase()} ${displayActiveCalled.firstName.toUpperCase()} (${getDeptName(displayActiveCalled.departmentId).toUpperCase()} xona: ${getRoomNumber(displayActiveCalled.departmentId)})`
      );
    }

    const waitings = localPatients.filter((p) => p.status === 'Kutmoqda').sort((a, b) => a.queueNumber - b.queueNumber);
    if (waitings.length > 0) {
      const waitStr = waitings.map((p) => `#${p.queueNumber} ${p.lastName.toUpperCase()}`).slice(0, 10).join(', ');
      parts.push(`⏱️ NAVBATDAGI BEMORLAR RAQAMLARI: ${waitStr}`);
    } else {
      parts.push("⏱️ NAVBATDAGI BEMORLAR RO'YXATI BO'SH");
    }

    parts.push(
      "🩺 ILTIMOS, NAVBATINGIZ KELGANDA KABINETLARGA TARTIB BILAN KIRING!",
      "🏢 SHIFOKOR KO'RIGIDAN KEYIN RETSEPTINGIZNI OLISHNI UNUTMANG!",
      "🌟 SALOMATLIGINGIZ O'Z QO'LINGIZDA!"
    );

    return parts.join("   •   ");
  };

  if (inlineMode) {
    // Small preview card in the admin workspace
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4 animate-fade-in">
        <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tashqi Monitor (HDMI TV) Simulyatori</h3>
              <p className="text-xxs text-slate-400 font-medium">Kasalxona kutish zalidagi televizor displeyi</p>
            </div>
          </div>
          <button
            onClick={() => window.open(window.location.origin + '?view=monitor', '_blank')}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100/60 rounded-xl text-xxs font-semibold transition-all cursor-pointer animate-pulse"
          >
            📺 Alohida tabda ochish (Full HD)
          </button>
        </div>

        {/* Monitor tozalash tugmasi (inline mode uchun) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearMonitor}
            className={`px-3 py-1.5 rounded-xl transition-all border text-xxs font-bold cursor-pointer flex items-center gap-1.5 ${
              isMonitorCleared
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                : 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200 hover:border-rose-300'
            }`}
            title={isMonitorCleared ? 'Navbatni qayta ko\'rsatish' : 'Monitor ekranini tozalash (baza o\'zgartirilmaydi)'}
          >
            <Eraser className="h-3.5 w-3.5" />
            {isMonitorCleared ? 'Navbatni qayta ko\'rsatish' : '🧹 Monitorni tozalash'}
          </button>
          {isMonitorCleared && (
            <span className="text-[10px] text-emerald-600 font-bold italic">
              ✅ Monitor tozalandi — baza o'zgartirilmadi
            </span>
          )}
        </div>

        {/* Small preview block */}
        <div className="bg-slate-50 text-slate-800 rounded-2xl p-5 font-sans relative overflow-hidden border border-slate-200/80 shadow-inner">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 mb-4 text-xxs font-mono text-slate-400">
            <span className="font-bold text-slate-500">🖥️ MONITOR TV SCREEN PREVIEW</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="hover:text-slate-600 cursor-pointer"
                title="Ovozli chaqiruvni yoqish/o'chirish"
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#00966d] animate-pulse" /> : <VolumeX className="h-3.5 w-3.5 text-rose-500" />}
              </button>
              <button onClick={testTriggerVoice} className="text-xxs text-[#00966d] font-bold hover:underline">
                🔊 Chaqirish test
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Active called */}
            <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-150 text-center flex flex-col justify-center shadow-sm">
              {displayActiveCalled ? (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-emerald-600 tracking-wider">CHAQIRILAYOTGAN BEMOR</div>
                  <div className="text-2xl font-extrabold text-emerald-700">#{displayActiveCalled.queueNumber}</div>
                  <div className="text-xs font-bold truncate text-slate-850">{displayActiveCalled.lastName} {activeCalled.firstName}</div>
                  <div className="text-xxs text-slate-400 font-medium">
                    {getDeptName(displayActiveCalled.departmentId)} ({getRoomNumber(activeCalled.departmentId)})
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-xxs py-4 font-bold uppercase">Chaqirilgan bemorlar yo'q</div>
              )}
            </div>

            {/* Waiting queue */}
            <div className="col-span-1 bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
              <div className="text-xxs font-bold text-slate-400 border-b border-slate-100 pb-1.5 mb-2 text-center">Navbatdagilar</div>
              <div className="space-y-1">
                {waitingQueue.length === 0 ? (
                  <div className="text-slate-400 text-[10px] text-center py-2">Navbat bo'sh</div>
                ) : (
                  waitingQueue.slice(0, 5).map((p) => {
                    const colors = getDeptColorInfo(p.departmentId);
                    return (
                      <div key={p.id} className={`flex justify-between text-[10px] ${colors.lightBg} px-1.5 py-0.5 rounded border ${colors.borderClass}`}>
                        <span className={`font-bold ${colors.textColor}`}>#{p.queueNumber}</span>
                        <span className="truncate max-w-[50px] text-slate-500 font-medium">{p.lastName}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-3.5 bg-emerald-50 text-emerald-700 border border-emerald-100 py-1.5 px-2 rounded-xl text-[9px] font-mono whitespace-nowrap overflow-hidden text-center">
            DR.Maruf Clinic sihat-salomatlik tilaydi!
          </div>
        </div>
      </div>
    );
  }

  // STANDALONE FULLSCREEN MONITOR VIEW FOR EXTERNAL TV (via HDMI)
  return (
    <div
      onClick={() => setHasInteracted(true)}
      className={`h-screen overflow-hidden clinic-bg-gradient text-slate-800 font-sans flex flex-col justify-between transition-all duration-300 ${
        flashScreen ? 'bg-emerald-50 border-b border-emerald-500/20' : ''
      }`}
    >
      {/* Interaction Warning for Audio */}
      {!hasInteracted && soundEnabled && (
        <div className="bg-amber-500 text-white font-black text-xs py-2 px-4 text-center cursor-pointer animate-pulse border-b border-amber-600 flex items-center justify-center space-x-2 z-50">
          <Volume2 className="h-4 w-4 animate-bounce" />
          <span>OVOZLI CHAQIRUVLARNI FAOLLASHTIRISH UCHUN EKRANGA BIR MARTA BOSING (CLICK TO ENABLE TV AUDIO CALLS)</span>
        </div>
      )}

      {/* Standalone Header */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-5 flex justify-between items-center shadow-md relative overflow-hidden">
        {/* Top aesthetic gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

        <div className="flex items-center space-x-4">
          <div className="bg-[#009e74] p-3 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/10">
            <Tv className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                DR.Maruf <span className="text-emerald-600">Clinic</span>
              </h1>
              
              {/* Live Connection Status indicator dot and badge */}
              <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                connectionStatus === 'online' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              }`}>
                <span className={`h-2 w-2 rounded-full ${connectionStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'} inline-block`}></span>
                <span>{connectionStatus === 'online' ? 'Ulanish: OK (Faol)' : 'Tarmoq kutilmoqda...'}</span>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-500 font-mono uppercase tracking-widest mt-0.5">
              Elektron Navbat Tizimi • Monitor Displeyi
            </p>
          </div>
        </div>

        {/* Control toolbar on standalone TV */}
        <div className="flex items-center space-x-4 z-10">
          {/* Zoom controls for fitting different TV/HDMI dimensions */}
          <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 overflow-hidden p-1">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.7}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              title="Shriftni kichiklashtirish"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono font-black text-slate-700 px-2 min-w-[65px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 1.6}
              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              title="Shriftni kattalashtirish"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Fullscreen control for perfect TV coverage */}
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl transition-all border border-slate-200 shadow-xs cursor-pointer flex items-center gap-2 font-bold text-xs"
            title="To'liq ekranga o'tkazish"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-5 w-5 text-emerald-600" />
                <span className="hidden md:inline text-slate-700">Kichraytirish</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-5 w-5 text-emerald-600 animate-pulse" />
                <span className="hidden md:inline text-emerald-600 font-extrabold">To'liq Ekran</span>
              </>
            )}
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl transition-colors border border-slate-200 shadow-xs cursor-pointer"
            title="Tovushni yoqish/o'chirish"
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-emerald-600 animate-bounce" />
            ) : (
              <VolumeX className="h-5 w-5 text-rose-500" />
            )}
          </button>

          {/* Monitor tozalash tugmasi - faqat vizual ko'rinishni tozalaydi, bazodan o'chirmaydi */}
          <button
            onClick={handleClearMonitor}
            className={`p-3 rounded-xl transition-all border shadow-xs cursor-pointer flex items-center gap-2 font-bold text-xs ${
              isMonitorCleared
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                : 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200 hover:border-rose-300'
            }`}
            title={isMonitorCleared ? 'Navbatni qayta ko\'rsatish (baza o\'zgartirilmagan)' : 'Monitor ekranini tozalash (baza o\'zgartirilmaydi)'}
          >
            <Eraser className="h-5 w-5" />
            <span className="hidden md:inline">
              {isMonitorCleared ? 'Navbatni qayta ko\'rsatish' : 'Monitorni tozalash'}
            </span>
          </button>

          <div className="bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-xl text-emerald-800 flex items-center space-x-2 font-mono text-base font-black shadow-sm">
            <Clock className="h-5 w-5 text-emerald-600 animate-spin-slow" />
            <span>
              {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main 
        className="flex-1 p-8 flex flex-col space-y-8 min-h-0 transition-all duration-200"
        style={{ zoom: zoomLevel }}
      >
        
        {/* UPPER BANNER SECTION */}
        {displayActiveCalled ? (
          (() => {
            const activeColors = getDeptColorInfo(displayActiveCalled.departmentId);
            return (
              <div
                className={`bg-white border rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative transition-all duration-300 overflow-hidden ${
                  flashScreen
                    ? 'border-emerald-400 bg-emerald-50/30 shadow-emerald-500/10'
                    : `border-slate-200/80 shadow-md`
                }`}
              >
                {/* Left side accent band */}
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-emerald-500 via-teal-400 to-emerald-600"></div>

                {flashScreen && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-2.5 rounded-b-2xl text-xs font-black tracking-widest uppercase flex items-center space-x-2 shadow-lg animate-bounce z-20">
                    <Bell className="h-4 w-4 animate-ring" />
                    <span>YANGI CHAQIRUV • MARHAMAT!</span>
                  </div>
                )}

                {/* Left section: Huge animated queue number, designed like a beautiful premium container */}
                <div className="flex items-center shrink-0 z-10 pl-2">
                  <div className={`p-4 rounded-3xl border border-slate-150 ${activeColors.roomBg} text-center min-w-[160px] md:min-w-[200px] flex flex-col justify-center relative overflow-hidden shadow-inner`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      NAVBAT RAQAMI
                    </span>
                    <span className={`text-6xl md:text-7xl font-black block py-4 px-4 rounded-2xl ${activeColors.badgeBg} ${activeColors.badgeText} shadow-md tracking-tight`}>
                      #{displayActiveCalled.queueNumber}
                    </span>
                  </div>
                </div>

                {/* Middle section: Patient Name */}
                <div className="flex-1 text-center md:text-left z-10">
                  <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase block mb-1">
                    QABULGA TAKLIF ETILADI
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight uppercase">
                    {displayActiveCalled.lastName} {displayActiveCalled.firstName} {displayActiveCalled.middleName || ''}
                  </h2>
                </div>

                {/* Right section: Department Info with Specific Color Theme */}
                <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full md:w-auto z-10">
                  <div className={`p-4 rounded-2xl border border-slate-150 ${activeColors.accentGlow} text-center min-w-[200px] flex flex-col justify-center`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      KABINET / YO'NALISH
                    </span>
                    <span className="text-xl font-black block">
                      {getDeptName(displayActiveCalled.departmentId).toUpperCase()}
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl border border-slate-150 ${activeColors.roomBg} text-center min-w-[120px] flex flex-col justify-center`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      XONA
                    </span>
                    <span className="text-3xl font-black block text-slate-900">
                      {getRoomNumber(displayActiveCalled.departmentId)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          /* Welcome Banner when there is no current active called patient */
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center space-x-5 text-center md:text-left z-10">
              <div className="p-4 bg-white/15 border border-white/20 rounded-2xl text-white shadow-sm shrink-0">
                <Bell className="h-10 w-10 animate-bounce" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  TIZIM FAOL • SHIFOKOR CHAQIRUVINI KUTING
                </h2>
                <p className="text-emerald-50 text-sm mt-1 max-w-xl font-bold">
                  Kutish zalidagi hurmatli bemorlar, navbatingiz kelganda ism-familiyangiz va navbat raqamingiz ekran yuqorisida ko'rsatiladi va ovozli e'lon qilinadi.
                </p>
              </div>
            </div>

            {/* Live Stats display instead of blank text */}
            <div className="grid grid-cols-2 gap-4 shrink-0 w-full md:w-auto z-10">
              <div className="bg-white/15 border border-white/20 p-4 rounded-2xl text-center min-w-[150px] shadow-inner">
                <span className="text-[10px] text-emerald-100 font-black tracking-widest uppercase block mb-1">NAVBDATDAGILAR</span>
                <span className="text-2xl font-black text-white">
                  {localPatients.filter((p) => p.status === 'Kutmoqda').length} ta bemor
                </span>
              </div>
              <div className="bg-white/15 border border-white/20 p-4 rounded-2xl text-center min-w-[150px] shadow-inner">
                <span className="text-[10px] text-emerald-100 font-black tracking-widest uppercase block mb-1">XIZMAT KO'RSATILDI</span>
                <span className="text-2xl font-black text-white">
                  {localPatients.filter((p) => p.status === 'Yakunlangan').length} ta
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CENTRAL HERO CLINICAL BOARD TABLE */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {/* Top aesthetic color bar inside container */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-500"></div>

          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping"></div>
              <h2 className="text-2xl font-black text-slate-900 tracking-wider">
                📋 NAVBATDAGI BEMORLAR TAQSIMOT JADVALI
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-sky-50 text-sky-800 border border-sky-100 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-xs">
                🔵 LOR: KO'K
              </span>
              <span className="bg-amber-50 text-amber-800 border border-amber-100 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-xs">
                🟡 NEVRO: SARIQ
              </span>
              <span className="bg-rose-50 text-rose-800 border border-rose-100 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-xs">
                🔴 KARDIO: QIZIL
              </span>
              <span className="bg-slate-50 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono font-black">
                Jami navbatda: {displayPatients.length} ta
              </span>
            </div>
          </div>

          {/* Majestic High-Legibility Table */}
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-slate-500 text-sm font-black tracking-widest uppercase border-b border-slate-100">
                  <th className="py-3 px-6 text-center w-32">NAVBAT №</th>
                  <th className="py-3 px-6">BEMORNING F.I.SH.</th>
                  <th className="py-3 px-6">QABUL QILUVCHI BO'LIM</th>
                  <th className="py-3 px-6 text-center w-40">KABINET / XONA</th>
                  <th className="py-3 px-6 text-center w-52">XOLATI</th>
                </tr>
              </thead>
              <tbody>
                {displayPatients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 text-slate-400">
                        <Tv className="h-16 w-16 text-slate-300 animate-pulse" />
                        <p className="text-xl font-bold">Hozircha navbatda bemorlar yo'q</p>
                        <p className="text-sm">Qabulxonadan yangi bemorlar ro'yxatdan o'tganda shu yerda ko'rinadi.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayPatients.map((patient) => {
                    const colors = getDeptColorInfo(patient.departmentId);
                    const isActive = patient.status === 'Qabulda';
                    const docName = localDepts.find((d) => d.id === patient.departmentId)?.doctorName || 'Malakali Shifokor';
                    
                    // Card style classes based on status and department
                    const cardBg = isActive 
                      ? `${colors.rowBg} ring-2 ring-emerald-500/80 shadow-lg ${colors.glow}` 
                      : `${colors.rowBg} shadow-xs`;
                    const borderStyle = isActive 
                      ? 'border-emerald-400/50' 
                      : 'border-slate-100';

                    return (
                      <tr
                        key={patient.id}
                        className={`transition-all duration-300 transform ${isActive ? 'scale-[1.01] z-10 relative' : 'hover:scale-[1.002]'}`}
                      >
                        {/* Queue Number Badge styled as a clean container with label */}
                        <td className={`py-5 px-6 text-center rounded-l-3xl border-l border-y ${borderStyle} ${cardBg}`}>
                          <div className={`mx-auto inline-block px-6 py-2 rounded-2xl border text-center min-w-[120px] ${colors.roomBg} border-slate-150 shadow-inner`}>
                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5 tracking-wider uppercase">NAVBAT №</span>
                            <span className={`text-2xl font-black ${colors.textColor}`}>#{patient.queueNumber}</span>
                          </div>
                        </td>

                        {/* Patient Name */}
                        <td className={`py-5 px-6 border-y ${borderStyle} ${cardBg}`}>
                          <div className="font-black text-2xl text-slate-950 tracking-tight">
                            {patient.lastName.toUpperCase()} {patient.firstName.toUpperCase()}
                          </div>
                          <div className="text-xs font-bold text-slate-500 mt-0.5 font-mono uppercase tracking-widest">
                            ID: {patient.id} • {patient.gender === 'Erkak' ? ' Erkak' : ' Ayol'}
                          </div>
                        </td>

                        {/* Department & Doctor Name */}
                        <td className={`py-5 px-6 border-y ${borderStyle} ${cardBg}`}>
                          <div className={`font-black text-xl tracking-wide ${colors.textColor}`}>
                            {getDeptName(patient.departmentId)}
                          </div>
                          <div className="text-sm font-bold text-slate-600 mt-0.5">
                            🧑‍⚕️ {docName}
                          </div>
                        </td>

                        {/* Room Number Block */}
                        <td className={`py-5 px-6 text-center border-y ${borderStyle} ${cardBg}`}>
                          <div className={`mx-auto inline-block px-6 py-2 rounded-2xl border text-center min-w-[120px] ${colors.roomBg} border-slate-150 shadow-inner`}>
                            <span className="text-[10px] font-bold text-slate-400 block mb-0.5 tracking-wider uppercase">XONA</span>
                            <span className="text-2xl font-black text-slate-800">{getRoomNumber(patient.departmentId)}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className={`py-5 px-6 text-center rounded-r-3xl border-r border-y ${borderStyle} ${cardBg}`}>
                          {isActive ? (
                            <div className="mx-auto bg-emerald-50 border border-emerald-300 text-emerald-700 font-black text-sm py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm animate-pulse">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                              <span>🟢 ICHKARIGA MARHAMAT</span>
                            </div>
                          ) : (
                            <div className="mx-auto bg-slate-50 border border-slate-150 text-slate-500 font-bold text-sm py-2.5 px-4 rounded-2xl flex items-center justify-center gap-1.5 shadow-xs">
                              <span>⏱️ NAVBATDA KUTMOQDA</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Marquee ticker at the bottom */}
      <footer className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black py-4 overflow-hidden relative border-t border-emerald-700 shadow-inner">
        <div className="flex items-center animate-marquee whitespace-nowrap text-lg space-x-8">
          <span>{getDynamicTickerText()}</span>
        </div>
      </footer>
      
      {/* Styled keyframe for Marquee */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}</style>
    </div>
  );
};
