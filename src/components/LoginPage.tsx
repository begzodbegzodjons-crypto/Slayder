import React, { useState } from 'react';
import { Department, UserSession, ReceptionStaff } from '../types';
import { 
  User, 
  ShieldAlert, 
  Monitor, 
  Eye, 
  EyeOff, 
  Stethoscope, 
  ClipboardList, 
  FileText, 
  FlaskConical, 
  Coins, 
  Lock 
} from 'lucide-react';
// @ts-ignore
import doctorBg from '../assets/images/modern_doctors_team_bg_1784194824079.jpg';

interface LoginPageProps {
  departments: Department[];
  receptionStaff: ReceptionStaff[];
  onLoginSuccess: (session: UserSession) => void;
  openMonitorWindow: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  departments,
  receptionStaff = [],
  onLoginSuccess,
  openMonitorWindow,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Iltimos, barcha maydonlarni to\'ldiring');
      return;
    }

    // 1. Check Admin
    if (trimmedUser.toLowerCase() === 'admin' && trimmedPass === 'admin123') {
      onLoginSuccess({
        role: 'admin',
        name: 'Tizim Administratori',
      });
      return;
    }

    // 2. Check Reception from dynamic reception staff
    const matchedReception = receptionStaff.find(
      (rs) => rs.login.toLowerCase() === trimmedUser.toLowerCase() && rs.password === trimmedPass
    );

    if (matchedReception) {
      onLoginSuccess({
        role: 'reception',
        name: matchedReception.name,
      });
      return;
    }

    // 3. Check Doctor Cabinets dynamically from departments
    const matchedDept = departments.find(
      (d) => d.login.toLowerCase() === trimmedUser.toLowerCase() && d.password === trimmedPass
    );

    if (matchedDept) {
      onLoginSuccess({
        role: 'doctor',
        doctorId: matchedDept.id,
        name: matchedDept.doctorName,
      });
      return;
    }

    // No match
    setError('Login yoki parol noto\'g\'ri! Qayta urinib ko\'ring.');
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between font-sans text-slate-800 overflow-y-auto bg-slate-950">
      {/* Absolute Full-Screen Background Image */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img 
          src={doctorBg} 
          alt="Hospital Doctors Team" 
          className="w-full h-full object-cover opacity-85 scale-100 pointer-events-none transition-transform duration-1000"
          referrerPolicy="no-referrer"
        />
        {/* Soft elegant gradient overlays that let the bright clinical team image shine through clearly */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-900/30 to-emerald-950/40"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/70"></div>
      </div>

      {/* Top logo overlay or bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Stethoscope className="h-5.5 w-5.5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white block">DR.Maruf Clinic</span>
            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider block">ERP TIZIMI</span>
          </div>
        </div>

        {/* Dynamic TV Monitor shortcut button */}
        <button
          onClick={openMonitorWindow}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center space-x-1.5 shadow-md"
        >
          <Monitor className="h-4 w-4 text-emerald-400" />
          <span>Navbat Monitori</span>
        </button>
      </header>

      {/* Main Grid: Left Side Dominant Clinic Branding, Right Side Compact Login Card */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-8 sm:py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Side: Massive, beautiful, and prominent DR.Maruf Clinic branding content */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 sm:space-y-8 text-left z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/15 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider border border-emerald-500/25">
            <Stethoscope className="h-4.5 w-4.5 stroke-[2.5]" />
            <span>KASALLIKLARNI DAVOLASH VA PROFILAKTIKA ERP PORTALI</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
              DR.Maruf Clinic <br/>
              <span className="text-emerald-400">Tibbiy ERP Tizimi</span>
            </h1>
            <p className="text-slate-200 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-2xl drop-shadow-sm">
              Shifoxonaning barcha ichki operatsiyalarini avtomatlashtirilgan tartibda boshqaring. 
              Qabulxonadan tortib to shifokor ko'rigi, laboratoriya tahlillari va kassa hisob-kitoblarigacha barchasi yagona bazada!
            </p>
          </div>

          {/* Clean grids for clinical parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl pt-2">
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:border-emerald-500/30 hover:bg-white/8 transition-all duration-300 group">
              <div className="flex items-start space-x-3">
                <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-xs uppercase tracking-wider">Tezkor Qabulxona</h4>
                  <p className="text-slate-400 text-xs mt-1">Bemorlarni ro'yxatga olish, kvitansiyalar chop etish va elektron navbat.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:border-emerald-500/30 hover:bg-white/8 transition-all duration-300 group">
              <div className="flex items-start space-x-3">
                <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-xs uppercase tracking-wider">Shifokor Kabineti</h4>
                  <p className="text-slate-400 text-xs mt-1">Ko'rik tashxislari, tibbiy retseptlar, 80mm kvitansiya qog'ozlariga chop etish.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:border-emerald-500/30 hover:bg-white/8 transition-all duration-300 group">
              <div className="flex items-start space-x-3">
                <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-xs uppercase tracking-wider">Laboratoriya</h4>
                  <p className="text-slate-400 text-xs mt-1">Tahlillarni ro'yxatga olish va elektron tahlil natijalarini kiritish paneli.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:border-emerald-500/30 hover:bg-white/8 transition-all duration-300 group">
              <div className="flex items-start space-x-3">
                <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-xs uppercase tracking-wider">Moliya & Kassa</h4>
                  <p className="text-slate-400 text-xs mt-1">Kunlik tushumlar, kassirlar balansi, naqd va karta hisobotlari.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Very Compact, Clean and Premium Login Form */}
        <div className="lg:col-span-5 xl:col-span-4 w-full flex justify-center lg:justify-end z-10">
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-black/80 border border-slate-100 overflow-hidden relative">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500"></div>

            <div className="p-6 sm:p-8 space-y-4">
              <div>
                <span className="inline-flex bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-1 border border-emerald-100">
                  KIRISH EKRANI
                </span>
                <h2 className="text-lg font-black text-slate-950 tracking-tight">Tizimga Kirish</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-bold">
                  Boshqaruv tizimiga kirish paroli
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-[10px] font-black text-slate-600 mb-1 uppercase tracking-wide">
                    Foydalanuvchi nomi
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4 stroke-[2]" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="masalan: admin"
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 font-extrabold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-[10px] font-black text-slate-600 mb-1 uppercase tracking-wide">
                    Maxfiy Parol
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4 stroke-[2]" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 font-extrabold transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 flex items-center space-x-1.5 font-bold">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/15 hover:scale-[1.01] transition-all cursor-pointer"
                  >
                    <span className="text-xs font-black tracking-wider uppercase">Tizimga Kirish</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Compact Elegant Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-slate-400 font-bold">
        <span>© {new Date().getFullYear()} DR.Maruf Clinic ERP. Barcha huquqlar himoyalangan.</span>
        <div className="flex space-x-3 text-emerald-400">
          <span>Dastur muallifi: dasturchi Begzod Mirzalimov</span>
        </div>
      </footer>
    </div>
  );
};

