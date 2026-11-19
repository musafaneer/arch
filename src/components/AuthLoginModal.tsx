import React, { useState } from "react";
import {
  Shield,
  Key,
  Lock,
  User,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  ArrowRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { VaultRole } from "../types";

interface AuthLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUserManagement?: () => void;
}

export const AuthLoginModal: React.FC<AuthLoginModalProps> = ({
  isOpen,
  onClose,
  onOpenUserManagement
}) => {
  const { currentUser, login, quickSwitchUser, databaseStats, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"quick" | "credentials">("quick");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const demoProfiles = [
    {
      username: "admin",
      name: "م. عثمان مفتاح الترهوني",
      role: "CHIEF_CUSTODIAN",
      roleTitle: "أمين الخزينة العامة والسيادية",
      clearance: "سري للغاية",
      badge: "LY-MOF-SEC-001",
      badgeColor: "border-amber-500 bg-amber-50/70 text-amber-900"
    },
    {
      username: "auditor",
      name: "المستشارة خديجة بشير المقريف",
      role: "AUDIT_INSPECTOR",
      roleTitle: "مراقب ديوان المحاسبة والامتثال المالي",
      clearance: "سري",
      badge: "LY-ACC-INSP-042",
      badgeColor: "border-purple-500 bg-purple-50/70 text-purple-900"
    },
    {
      username: "archivist",
      name: "أ. سالم عبد الحميد الفيتوري",
      role: "SENIOR_ARCHIVIST",
      roleTitle: "كبير أخصائيي الأرشفة والترميم",
      clearance: "محدود",
      badge: "LY-MOF-ARC-118",
      badgeColor: "border-emerald-500 bg-emerald-50/70 text-emerald-900"
    },
    {
      username: "researcher",
      name: "د. عمر إبراهيم الزنتاني",
      role: "RESEARCHER",
      roleTitle: "باحث مالي معتمد (الاطلاع العام)",
      clearance: "عام",
      badge: "LY-RES-ACAD-507",
      badgeColor: "border-blue-500 bg-blue-50/70 text-blue-900"
    }
  ];

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await login(identifier, password);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || "فشل تسجيل الدخول");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSwitch = async (username: string) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await quickSwitchUser(username);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error || "تعذر التبديل");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">بوابة المصادقة والتصاريح الأمنية السيادية</h2>
              <p className="text-xs text-slate-300">
                منظومة الأرشيف الرقمي لوزارة المالية الليبية (RBAC Engine)
              </p>
            </div>
          </div>

          {/* Current Logged-in Banner */}
          {currentUser && (
            <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">الحساب المفعل حالياً:</span>
                <span className="font-bold text-amber-300">{currentUser.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {currentUser.clearanceLevel}
              </span>
            </div>
          )}
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => setActiveTab("quick")}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === "quick"
                ? "border-amber-600 text-amber-800 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            التبديل الفوري بين الهيئات المعتمدة
          </button>

          <button
            onClick={() => setActiveTab("credentials")}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              activeTab === "credentials"
                ? "border-amber-600 text-amber-800 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            تسجيل الدخول بكلمة المرور
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {activeTab === "quick" ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                اختر إحدى الهيئات الرقابية والأرشيفية المعتمدة لمحاكاة تجربة العمل وتفعيل الصلاحيات المقترنة بها فورياً:
              </p>

              <div className="space-y-2.5">
                {demoProfiles.map((p) => {
                  const isActive = currentUser?.username === p.username;

                  return (
                    <button
                      key={p.username}
                      onClick={() => handleQuickSwitch(p.username)}
                      disabled={isLoading}
                      className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between group ${
                        isActive
                          ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{p.name}</span>
                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white">
                                نشط
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{p.roleTitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.clearance}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors text-slate-400">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCredentialsLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  اسم المستخدم أو البريد الإلكتروني أو الرقم الوطني:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin أو o.tarhuni@mof.gov.ly أو 119680324881"
                    className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  كلمة المرور المشفرة (Bcrypt):
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-9 pl-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  كلمة المرور المبدئية لجميع الحسابات الافتراضية هي: <span className="font-mono font-bold text-slate-600">mof@Libya2026!</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>{isLoading ? "جاري التحقق من الهوية..." : "تسجيل الدخول وفحص التصريح"}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer info with DB stats */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>محرك التخزين النشط: <strong>{databaseStats?.currentEngine?.toUpperCase() || "SQLITE"}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenUserManagement && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUserManagement();
                }}
                className="text-amber-700 hover:underline font-semibold"
              >
                إدارة المستخدمين وقاعدة البيانات ⚙
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
