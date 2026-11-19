import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  Layers
} from "lucide-react";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number; // duration in ms, default 5000ms
  action?: ToastAction;
  badge?: string;
  sound?: boolean;
}

export interface ToastItem extends ToastOptions {
  id: string;
  timestamp: number;
  type: ToastType;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (options: ToastOptions) => string;
  success: (title: string, message?: string, options?: Partial<ToastOptions>) => string;
  info: (title: string, message?: string, options?: Partial<ToastOptions>) => string;
  warning: (title: string, message?: string, options?: Partial<ToastOptions>) => string;
  error: (title: string, message?: string, options?: Partial<ToastOptions>) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Soft subtle chime using Web Audio API for sovereign audit feedback
function playChime(type: ToastType) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14); // A5
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Ignore audio permission or playback restrictions
  }
}

interface SingleToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const SingleToast: React.FC<SingleToastProps> = ({ toast, onDismiss }) => {
  const duration = toast.duration ?? 5000;
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  useEffect(() => {
    if (duration <= 0) return;

    let timerId: any;
    const interval = 50;

    const tick = () => {
      if (!isPaused) {
        remainingTimeRef.current -= interval;
        const pct = Math.max(0, (remainingTimeRef.current / duration) * 100);
        setProgress(pct);

        if (remainingTimeRef.current <= 0) {
          onDismiss(toast.id);
          return;
        }
      }
      timerId = setTimeout(tick, interval);
    };

    timerId = setTimeout(tick, interval);
    return () => clearTimeout(timerId);
  }, [duration, isPaused, onDismiss, toast.id]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  // Styling based on Sovereign Libyan Architecture
  const getThemeStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          container: "bg-[#092418] text-white border-emerald-500/50 shadow-emerald-950/40",
          accentBar: "bg-gradient-to-r from-emerald-400 to-amber-400",
          iconBg: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
          badgeBg: "bg-emerald-900/80 text-emerald-200 border-emerald-700/60",
          defaultBadge: "عملية معتمدة",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        };
      case "info":
        return {
          container: "bg-[#0f1d33] text-white border-blue-500/40 shadow-blue-950/40",
          accentBar: "bg-gradient-to-r from-blue-400 to-sky-300",
          iconBg: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
          badgeBg: "bg-blue-900/80 text-blue-200 border-blue-700/60",
          defaultBadge: "إفادة إجرائية",
          icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />
        };
      case "warning":
        return {
          container: "bg-[#281806] text-white border-amber-500/50 shadow-amber-950/40",
          accentBar: "bg-gradient-to-r from-amber-400 to-yellow-300",
          iconBg: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
          badgeBg: "bg-amber-900/80 text-amber-200 border-amber-700/60",
          defaultBadge: "تنبيه تدقيق",
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        };
      case "error":
        return {
          container: "bg-[#2b0c0c] text-white border-red-500/50 shadow-red-950/40",
          accentBar: "bg-gradient-to-r from-red-500 to-rose-400",
          iconBg: "bg-red-500/20 text-rose-300 border border-red-500/30",
          badgeBg: "bg-red-900/80 text-rose-200 border-rose-700/60",
          defaultBadge: "تعذر الإجراء",
          icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -80, scale: 0.9 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md p-4 transition-all w-full max-w-md ${theme.container}`}
      dir="rtl"
      role="alert"
      aria-live="polite"
    >
      {/* Top countdown progress bar (RTL: shrinks from left to right) */}
      {duration > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${theme.accentBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-3 mt-0.5">
        {/* Leading Status Icon */}
        <div className={`p-2 rounded-xl shrink-0 flex items-center justify-center ${theme.iconBg}`}>
          {theme.icon}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-0.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-sm font-bold tracking-tight text-white font-['Cairo'] flex items-center gap-1.5 truncate">
              <span>{toast.title}</span>
            </h4>

            {/* Sovereign Badge */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${theme.badgeBg}`}>
              {toast.badge || theme.defaultBadge}
            </span>
          </div>

          {toast.message && (
            <p className="text-xs text-slate-200/90 leading-relaxed font-['Cairo'] line-clamp-3">
              {toast.message}
            </p>
          )}

          {/* Optional Action Button */}
          {toast.action && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-sm"
              >
                <span>{toast.action.label}</span>
                <ExternalLink className="w-3 h-3 text-slate-900" />
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button on left edge (RTL) */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
          title="إغلاق التنبيه"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback((options: ToastOptions): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastItem = {
      id,
      timestamp: Date.now(),
      type: options.type || "info",
      title: options.title,
      message: options.message,
      duration: options.duration ?? 5000,
      action: options.action,
      badge: options.badge,
      sound: options.sound ?? true
    };

    if (newToast.sound) {
      playChime(newToast.type);
    }

    setToasts((prev) => {
      // Keep up to 5 concurrent toasts to prevent viewport cluttering
      const updated = [newToast, ...prev];
      return updated.slice(0, 5);
    });

    return id;
  }, []);

  const success = useCallback(
    (title: string, message?: string, options?: Partial<ToastOptions>) =>
      showToast({ ...options, type: "success", title, message }),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, options?: Partial<ToastOptions>) =>
      showToast({ ...options, type: "info", title, message }),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, options?: Partial<ToastOptions>) =>
      showToast({ ...options, type: "warning", title, message }),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, options?: Partial<ToastOptions>) =>
      showToast({ ...options, type: "error", title, message }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        info,
        warning,
        error,
        dismissToast,
        clearAllToasts
      }}
    >
      {children}

      {/* Sovereign RTL Floating Toast Container */}
      <div 
        className="fixed top-5 left-4 sm:top-6 sm:left-6 z-50 flex flex-col gap-3 pointer-events-none max-w-md w-[calc(100vw-2rem)]"
        dir="rtl"
        aria-label="تنبيهات النظام الأرشيفي"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <SingleToast toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};
