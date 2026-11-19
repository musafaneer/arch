import React, { useEffect, useState } from "react";
import { 
  Minus, 
  Square, 
  X, 
  Monitor, 
  ShieldCheck, 
  Cpu
} from "lucide-react";
import { 
  isElectron, 
  getAppEnvironment, 
  minimizeWindow, 
  maximizeWindow, 
  closeWindow, 
  ElectronAppInfo 
} from "../utils/electronBridge";

export const DesktopTitleBar: React.FC = () => {
  const [runningInDesktop, setRunningInDesktop] = useState<boolean>(false);
  const [appInfo, setAppInfo] = useState<ElectronAppInfo | null>(null);

  useEffect(() => {
    const checkEnv = async () => {
      const isEl = isElectron();
      setRunningInDesktop(isEl);
      if (isEl) {
        const info = await getAppEnvironment();
        setAppInfo(info);
      }
    };
    checkEnv();
  }, []);

  // Only render the physical frame title bar when running inside Electron or if user toggled test preview
  if (!runningInDesktop) {
    return null;
  }

  return (
    <div 
      className="bg-[#0b2418] text-slate-200 h-9 flex items-center justify-between px-3 select-none border-b border-emerald-900/60 z-50 text-xs"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Right side in RTL: Title & Emblem */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-emerald-950 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <ShieldCheck className="w-3 h-3" />
        </div>
        <span className="font-bold font-['Amiri',serif] text-amber-200 tracking-wide">
          المنظومة الوطنية للأرشيف الرقمي السيادي - وزارة المالية الليبية
        </span>
        <span className="bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded text-[10px] font-mono flex items-center gap-1">
          <Cpu className="w-2.5 h-2.5" />
          <span>إصدار سطح المكتب {appInfo?.platform ? `(${appInfo.platform})` : ""}</span>
        </span>
      </div>

      {/* Left side in RTL (or controls side): Window controls */}
      <div 
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={minimizeWindow}
          title="تصغير"
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-emerald-800/60 text-slate-300 transition"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={maximizeWindow}
          title="تكبير / استعادة"
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-emerald-800/60 text-slate-300 transition"
        >
          <Square className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={closeWindow}
          title="إغلاق المنظومة"
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-red-600/80 text-slate-300 hover:text-white transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
