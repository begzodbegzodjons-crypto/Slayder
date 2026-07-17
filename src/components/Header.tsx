import React, { useEffect, useState } from 'react';
import { Activity, Clock, LogOut, User, ShieldAlert } from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openMonitorWindow: () => void;
  session: UserSession | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openMonitorWindow,
  session,
  onLogout,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setTime(now.toLocaleTimeString('uz-UZ', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!session) return null;

  // Role-based visible menu items
  const menuItems: { id: string; label: string }[] = [];

  if (session.role === 'admin') {
    menuItems.push(
      { id: 'admin_panel', label: '⚙️ Admin Panel' },
      { id: 'reception', label: '👥 Qabulxona' },
      { id: 'doctors', label: '🥼 Shifokor Kabineti' },
      { id: 'reports', label: '📊 Hisobot & Tahlillar' },
      { id: 'monitor_tab', label: '📺 Monitor' }
    );
  } else if (session.role === 'reception') {
    menuItems.push(
      { id: 'reception', label: '👥 Qabulxona' },
      { id: 'reports', label: '📊 Tahlillar' },
      { id: 'monitor_tab', label: '📺 Monitor' }
    );
  } else if (session.role === 'doctor') {
    menuItems.push(
      { id: 'doctors', label: '🥼 Shifokor Kabineti' }
    );
  }

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-emerald-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-full px-4 sm:px-8 lg:px-12">
        <div className="flex justify-between h-16 items-center">
          {/* Clinic Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/10 text-emerald-600 p-2.5 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-sm">
              <Activity className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
                DR.Maruf <span className="text-emerald-600 font-extrabold">Clinic</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-sans">
                ERP / CRM Portal
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="hidden md:flex space-x-1 bg-[#f0fdf4] p-1 rounded-xl border border-emerald-100/60">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                    isActive
                       ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 border border-emerald-500/10'
                       : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Profile, Clock, HDMI, Logout */}
          <div className="flex items-center space-x-3">
            <button
              id="open-monitor-hdmi-btn"
              onClick={openMonitorWindow}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/50 rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:scale-102"
              title="Monitor xizmatini alohida HDMI ekranga yoki yangi oynaga uzatish"
            >
              <span>📺 HDMI TV</span>
            </button>

            {/* Time / Status info */}
            <div className="hidden sm:flex items-center space-x-2 bg-emerald-50/50 px-3 py-2 rounded-xl border border-emerald-100/50 font-mono text-xs text-slate-700 font-bold">
              <Clock className="h-3.5 w-3.5 text-emerald-600 animate-spin-slow" />
              <span>{time}</span>
            </div>

            {/* Active User session info */}
            <div className="flex items-center space-x-2 bg-[#f0fdf4] text-slate-800 px-3 py-2 rounded-xl border border-emerald-100/60 text-xs font-medium">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span className="max-w-[120px] truncate text-slate-800 font-bold">{session.name}</span>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white font-extrabold uppercase rounded-lg">
                {session.role === 'admin' ? 'Admin' : session.role === 'reception' ? 'Qabul' : 'Shifokor'}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100"
              title="Tizimdan chiqish"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden justify-around py-2 border-t border-emerald-500/10 overflow-x-auto space-x-2">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all duration-150 border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-500/20'
                    : 'text-slate-500 border-transparent hover:bg-emerald-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

