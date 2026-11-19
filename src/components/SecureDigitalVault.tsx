import React, { useState } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  Fingerprint,
  FileCheck2,
  RefreshCw,
  AlertTriangle,
  FileText,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  Database,
  Building2,
  Award,
  Hash,
  Binary,
  Layers,
  Printer,
  ChevronLeft,
  Search,
  Users
} from "lucide-react";
import { ArchivedDocument, IntegrityAuditRecord, SecurityClassification, VaultUser } from "../types";
import {
  VAULT_SYSTEM_USERS,
  checkClearanceAccess,
  calculateMerkleRoot,
  auditSingleDocument
} from "../utils/vaultCrypto";
import { useToast } from "../context/ToastContext";

interface SecureDigitalVaultProps {
  documents: ArchivedDocument[];
  onSelectDocument?: (doc: ArchivedDocument) => void;
  onInspectDocument?: (doc: ArchivedDocument) => void;
  currentUser: VaultUser;
  onSwitchUser: (user: VaultUser) => void;
  onToggleVaultLock?: (docId: string, locked: boolean) => void;
  onOpenUserManagement?: () => void;
}

export const SecureDigitalVault: React.FC<SecureDigitalVaultProps> = ({
  documents,
  onSelectDocument,
  onInspectDocument,
  currentUser,
  onSwitchUser,
  onToggleVaultLock,
  onOpenUserManagement
}) => {
  const toast = useToast();
  const handleSelectDoc = onInspectDocument || onSelectDocument || (() => {});
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "sovereign" | "integrity-audit" | "custody-certs">("overview");
  const [isAuditingAll, setIsAuditingAll] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditLogs, setAuditLogs] = useState<IntegrityAuditRecord[]>([]);
  const [unlockedVaultDocs, setUnlockedVaultDocs] = useState<Record<string, boolean>>({});
  const [selectedDocForCert, setSelectedDocForCert] = useState<ArchivedDocument | null>(documents[0] || null);
  const [simulatedTamperActive, setSimulatedTamperActive] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate live cryptographic Merkle Root
  const allHashes = documents.map(d => d.cryptographicProof?.sha256Hash || "0".repeat(64));
  const masterMerkleRoot = calculateMerkleRoot(allHashes);

  // Sovereign/Classified documents
  const sovereignDocs = documents.filter(
    d => d.isVaultLocked || d.classification === "سري للغاية" || d.classification === "سري"
  );

  // Filtered docs for custody certificate selector
  const filteredDocsForCert = documents.filter(d =>
    d.title.includes(searchTerm) || d.refNumber.includes(searchTerm)
  );

  // Run full integrity audit across all digitized documents
  const runFullVaultAudit = async () => {
    setIsAuditingAll(true);
    setAuditProgress(0);
    const newLogs: IntegrityAuditRecord[] = [];

    for (let i = 0; i < documents.length; i++) {
      await new Promise(res => setTimeout(res, 220));
      const doc = documents[i];
      const log = auditSingleDocument(doc, currentUser.name);

      // If simulated tamper is active, simulate a mismatch on the 2nd document
      if (simulatedTamperActive && i === 1) {
        log.status = "tampered";
        log.calculatedHash = "e89f4b7a01cd456789abcdef0123456789abcdef0123456789abcdef01234567";
      }

      newLogs.unshift(log);
      setAuditLogs([...newLogs]);
      setAuditProgress(Math.round(((i + 1) / documents.length) * 100));
    }

    setIsAuditingAll(false);
    if (simulatedTamperActive) {
      toast.warning(
        "تنبيه تدقيق أمني: اكتشاف عدم تطابق في البصمة الرقمية",
        "تم رصد محاولة محاكاة تلاعب برمجية في السجل الأرشيفي وتسجيل الحادثة في السجل الرقابي.",
        { badge: "رصد تلاعب", duration: 6000 }
      );
    } else {
      toast.success(
        "اكتمل التدقيق الجنائي للخزينة السيادية",
        `تم فحص ومطابقة جميع البصمات الإلكترونية (${documents.length} وثيقة) مع شجرة ميركل المركزية بنجاح 100%.`,
        { badge: "مطابقة سليمة", duration: 5500 }
      );
    }
  };

  // Attempt to unlock a sovereign top-secret document
  const handleUnlockDossier = (doc: ArchivedDocument) => {
    const access = checkClearanceAccess(currentUser.clearanceLevel, doc.classification);
    if (!access.allowed) {
      setAccessDeniedMessage(
        `تم رفض الوصول الأمني: الوثيقة مصنفة بدرجة [${doc.classification}]. تصريحك الحالي هو [${currentUser.clearanceLevel}]. يتطلب الوصول تصريح [سري للغاية] معتمد من ديوان الخزانة العامة.`
      );
      toast.error(
        "تم رفض الوصول الأمني",
        `الوثيقة مصنفة بدرجة [${doc.classification}]. تصريحك الحالي [${currentUser.clearanceLevel}] لا يخولك بفك التشفير.`,
        { badge: "حظر أمني", duration: 5500 }
      );
      setTimeout(() => setAccessDeniedMessage(null), 6000);
      return;
    }

    setUnlockedVaultDocs(prev => ({
      ...prev,
      [doc.id]: true
    }));

    toast.success(
      "تم فك تشفير السجل السيادي بنجاح",
      `تم التحقق من تصريحك [${currentUser.clearanceLevel}] ومطابقة مفتاح التشفير AES-256 للوثيقة.`,
      { badge: "تصريح نافذ", duration: 4500 }
    );
  };

  return (
    <div id="secure-digital-vault" className="space-y-6">
      {/* Access Denied Toast/Modal Notification */}
      {accessDeniedMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-red-950/95 border-2 border-red-600 text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 backdrop-blur-md">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-red-200 text-sm mb-1">تنبيه أمني: انتهاك تصريح السرية السيادية</h4>
              <p className="text-xs text-red-100 leading-relaxed">{accessDeniedMessage}</p>
            </div>
            <button
              onClick={() => setAccessDeniedMessage(null)}
              className="text-red-300 hover:text-white text-xs px-2 py-1 rounded bg-red-900/60"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Top Banner: Vault Status & Active User Security Badge */}
      <div className="bg-gradient-to-r from-[#0b2015] via-[#0f2d1e] to-[#0b2015] text-white rounded-2xl p-6 border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-600/60 text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>الخزينة الرقمية السيادية المعتمدة • معيار الحفظ الدائم WORM</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold font-['Amiri'] tracking-wide text-amber-100">
              خزينة الأرشيف المالي السيادي المشفرة
            </h2>
            <p className="text-xs lg:text-sm text-emerald-200/80 max-w-2xl leading-relaxed">
              منظومة التشفير المتطورة (AES-256-GCM) وسلسلة كتل التدقيق الجنائي غير القابلة للتعديل لحماية أصول ومراسيم وزارة المالية الليبية وتأكيد السلامة الرقمية عبر العقود.
            </p>
          </div>

          {/* Institutional User Switcher & Clearance Badge */}
          <div className="bg-black/40 border border-emerald-700/50 rounded-xl p-4 lg:w-80 shrink-0 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                المستخدم والمفتاح النشط
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                currentUser.clearanceLevel === "سري للغاية"
                  ? "bg-red-950 text-red-300 border border-red-700"
                  : currentUser.clearanceLevel === "سري"
                  ? "bg-amber-950 text-amber-300 border border-amber-700"
                  : "bg-emerald-950 text-emerald-300 border border-emerald-700"
              }`}>
                تصريح: {currentUser.clearanceLevel}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                {currentUser.name}
              </div>
              <div className="text-xs text-emerald-300/80 mt-0.5">{currentUser.title}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                <span>البصمة:</span>
                <span className="text-amber-200/90 truncate">{currentUser.keyFingerprint.slice(0, 17)}...</span>
              </div>
            </div>

            {/* Quick Role Toggle to test RBAC */}
            <div className="pt-2 border-t border-emerald-800/40 space-y-2">
              <div>
                <label className="text-[11px] text-emerald-300 block mb-1">محاكاة تبديل الرتبة وصلاحية الوصول:</label>
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const target = VAULT_SYSTEM_USERS.find(u => u.id === e.target.value);
                    if (target) onSwitchUser(target);
                  }}
                  className="w-full bg-slate-900/90 border border-emerald-700/60 rounded-lg text-xs text-amber-100 p-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {VAULT_SYSTEM_USERS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.title} ({u.clearanceLevel})
                    </option>
                  ))}
                </select>
              </div>

              {onOpenUserManagement && (
                <button
                  onClick={onOpenUserManagement}
                  className="w-full py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-lg text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>إدارة الحسابات وقواعد البيانات (RBAC)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Security Parameters Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-800/50">
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3">
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mb-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              تشفير البيانات الساكنة
            </div>
            <div className="text-sm font-bold text-white">AES-256-GCM (HSM)</div>
            <div className="text-[10px] text-emerald-300/70">مفاتيح سيادية معزولة</div>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3">
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              أمن البيانات المنقولة
            </div>
            <div className="text-sm font-bold text-white">TLS 1.3 / PFS</div>
            <div className="text-[10px] text-emerald-300/70">سرية أمامية تامة</div>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3">
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              جذر ميركل السيادي
            </div>
            <div className="text-sm font-bold font-mono text-amber-200 truncate" title={masterMerkleRoot}>
              {masterMerkleRoot.slice(0, 12)}...{masterMerkleRoot.slice(-8)}
            </div>
            <div className="text-[10px] text-emerald-300/70">{documents.length} سجلات موثقة</div>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3">
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              سياسة الحفظ والنزاهة
            </div>
            <div className="text-sm font-bold text-emerald-200">دائم WORM (لا يلغى)</div>
            <div className="text-[10px] text-emerald-300/70">ختم توقيع زمني LY-TSA</div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-all ${
            activeSubTab === "overview"
              ? "bg-[#0f2d1e] text-amber-300 shadow-md"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>لوحة المراقبة والتشفير</span>
        </button>

        <button
          onClick={() => setActiveSubTab("sovereign")}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-all relative ${
            activeSubTab === "sovereign"
              ? "bg-[#0f2d1e] text-amber-300 shadow-md"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Lock className="w-4 h-4 text-amber-400" />
          <span>الوثائق السيادية المقفلة ({sovereignDocs.length})</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </button>

        <button
          onClick={() => setActiveSubTab("integrity-audit")}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-all ${
            activeSubTab === "integrity-audit"
              ? "bg-[#0f2d1e] text-amber-300 shadow-md"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>التدقيق الجنائي وعدم التلاعب</span>
          {auditLogs.length > 0 && (
            <span className="bg-emerald-800 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {auditLogs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("custody-certs")}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-all ${
            activeSubTab === "custody-certs"
              ? "bg-[#0f2d1e] text-amber-300 shadow-md"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>شهادات الإيداع والعهدة الرقمية</span>
        </button>
      </div>

      {/* Tab 1: Overview & Cryptographic Architecture */}
      {activeSubTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Live Security Controls Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900 font-['Amiri'] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  مستويات الأمان والتحكم في الوصول الصارم (RBAC)
                </h3>
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full font-semibold border border-emerald-200">
                  الحالة: آمنة وفعالة 100%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-800" />
                    المطابقة مع معايير الأرشفة الدولية
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    تطبيق معيار <strong>OAIS (ISO 14721)</strong> و<strong>ISAD(G)</strong> لضمان استمرارية وصلاحية قراءة المخطوطات والقرارات التاريخية على مدى مئات السنين دون الاعتماد على برمجيات وسيطة مغلقة.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Binary className="w-4 h-4 text-amber-700" />
                    البصمة الرقمية والتوقيع المشفر
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    توليد بصمة <strong>SHA-256</strong> فورية لكل صفحة ممسوحة ونظام <strong>Merkle Tree</strong> لحساب تجانس الأرشيف الوطني وتحديد أي محاولة تلاعب بالبايتات لحظياً.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-800" />
                    حماية WORM (غير قابلة للمسح)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    تطبيق سياسة <strong>Write Once, Read Many</strong> السيادية، حيث تمنع المنظومة أي تعديل أو استبدال للمستند بعد توقيعه إلكترونياً من قبل لجنة الأرشيف.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    سلطة الختم الزمني الوطني (TSA)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    تأكيد تاريخ وساعة الأرشفة بربط مشفر مع خادم الوقت السيادي بمصرف ليبيا المركزي، مما يضفي حجية قانونية ملزمة للمستندات الرقمية أمام القضاء وديوان المحاسبة.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Live Integrity Test Card */}
            <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-['Amiri'] text-amber-200 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-emerald-400" />
                    الفحص الشامل لسلامة المستودع الرقمي
                  </h3>
                  <p className="text-xs text-emerald-200/80">
                    افحص الآن كافة وثائق وزارة المالية ({documents.length} وثيقة) للتحقق من سلامة البصمات التشفيرية ومطابقتها مع جذر ميركل.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveSubTab("integrity-audit");
                    runFullVaultAudit();
                  }}
                  disabled={isAuditingAll}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {isAuditingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ الفحص ({auditProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>بدء التدقيق الجنائي المباشر</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Institutional Roles & Clearance Directory */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-800" />
                  رتب وصلاحيات المستخدمين بالخزينة
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  انقر على أي مستخدم لتفعيل رتبته وتجربة قيود الصلاحيات
                </p>
              </div>

              <div className="space-y-3">
                {VAULT_SYSTEM_USERS.map((usr) => {
                  const isCurrent = usr.id === currentUser.id;
                  return (
                    <div
                      key={usr.id}
                      onClick={() => onSwitchUser(usr)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/30"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            {usr.name}
                            {isCurrent && (
                              <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-mono">
                                نشط
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">{usr.title}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          usr.clearanceLevel === "سري للغاية"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : usr.clearanceLevel === "سري"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}>
                          {usr.clearanceLevel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-2 truncate">
                        ID: {usr.badgeNumber} • الوطنية: {usr.nationalId}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sovereign Locked Dossiers (Top Secret Documents) */}
      {activeSubTab === "sovereign" && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong>الجناح السري للخزينة السيادية:</strong> هذه السجلات تتضمن محاضر الذهب السيادي، عقود امتياز النفط الأولى، والاتفاقيات الدولية المقيدة. للاطلاع على السجلات المحمية بدرجة <strong>سري للغاية</strong>، يلزم أن يكون المستخدم مسجلاً بتصريح <strong>سري للغاية</strong> (مثل: أمين الخزينة العامة).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sovereignDocs.map((doc) => {
              const isUnlocked = unlockedVaultDocs[doc.id] || currentUser.clearanceLevel === "سري للغاية";
              const accessCheck = checkClearanceAccess(currentUser.clearanceLevel, doc.classification);

              return (
                <div
                  key={doc.id}
                  className={`rounded-2xl border transition-all p-6 relative overflow-hidden ${
                    isUnlocked
                      ? "bg-white border-emerald-300 shadow-md"
                      : "bg-slate-900 border-red-900/60 text-white shadow-xl"
                  }`}
                >
                  {/* Security Watermark for locked docs */}
                  {!isUnlocked && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-700 text-red-300 text-xs font-bold">
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      <span>سري للغاية • مشفر ومقفل</span>
                    </div>
                  )}

                  {isUnlocked && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold">
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>مفتوح ومصرح به</span>
                    </div>
                  )}

                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-amber-500">
                      <Hash className="w-3.5 h-3.5" />
                      {doc.refNumber} • {doc.year} م
                    </div>

                    <h4 className={`text-lg font-bold font-['Amiri'] leading-snug ${isUnlocked ? "text-slate-900" : "text-amber-100"}`}>
                      {doc.title}
                    </h4>

                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      <span className={`px-2.5 py-0.5 rounded-full font-semibold ${
                        isUnlocked ? "bg-slate-100 text-slate-700" : "bg-slate-800 text-slate-300"
                      }`}>
                        {doc.department}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-900/60 text-amber-300 border border-amber-700/50">
                        المبلغ: {doc.financialAmount}
                      </span>
                    </div>

                    {/* Cryptographic Footprint */}
                    <div className={`p-3 rounded-xl font-mono text-[11px] space-y-1 ${
                      isUnlocked ? "bg-slate-50 border border-slate-200 text-slate-700" : "bg-black/50 border border-slate-800 text-emerald-400"
                    }`}>
                      <div className="flex justify-between">
                        <span className="text-slate-400">تشفير:</span>
                        <span>{doc.cryptographicProof?.encryptionAlgorithm || "AES-256-GCM"}</span>
                      </div>
                      <div className="flex justify-between truncate">
                        <span className="text-slate-400">SHA-256:</span>
                        <span className="truncate max-w-[200px]" title={doc.cryptographicProof?.sha256Hash}>
                          {doc.cryptographicProof?.sha256Hash.slice(0, 16)}...{doc.cryptographicProof?.sha256Hash.slice(-8)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex items-center gap-3">
                      {isUnlocked ? (
                        <button
                          onClick={() => onSelectDocument(doc)}
                          className="w-full py-2.5 px-4 bg-[#0f2d1e] hover:bg-[#143a27] text-amber-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
                        >
                          <Eye className="w-4 h-4" />
                          <span>فتح ومعاينة المخطوطة والمحتوى الكامل</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnlockDossier(doc)}
                          className={`w-full py-2.5 px-4 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow ${
                            accessCheck.allowed
                              ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                              : "bg-red-900/70 hover:bg-red-800 text-red-200 border border-red-700"
                          }`}
                        >
                          <Key className="w-4 h-4" />
                          <span>
                            {accessCheck.allowed
                              ? "فك التشفير بالمفتاح الوزاري السيادي"
                              : `طلب تصريح استثنائي (مطلوب: ${doc.classification})`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Integrity Audit & Anti-Tamper Engine */}
      {activeSubTab === "integrity-audit" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-['Amiri'] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  سجل التدقيق الجنائي التلقائي (Cryptographic Forensic Log)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  يقوم المحرك بمقارنة كل وثيقة ببصمتها التشفيرية الأصلية وجذر ميركل للتحقق من عدم التلاعب بأي حرف أو رقم مالي.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Simulation button for demo purposes */}
                <button
                  onClick={() => {
                    setSimulatedTamperActive(!simulatedTamperActive);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                    simulatedTamperActive
                      ? "bg-red-50 text-red-700 border-red-300"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                  title="محاكاة محاولة تلاعب غير مصرح بها لاختبار استجابة المنظومة"
                >
                  {simulatedTamperActive ? "⚠️ محاكاة التلاعب مفعلة" : "تجربة محاكاة التلاعب"}
                </button>

                <button
                  onClick={runFullVaultAudit}
                  disabled={isAuditingAll}
                  className="px-4 py-2 bg-[#0f2d1e] hover:bg-[#16422c] text-amber-200 font-bold rounded-xl text-xs flex items-center gap-2 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAuditingAll ? "animate-spin" : ""}`} />
                  <span>{isAuditingAll ? "جارٍ التدقيق..." : "إعادة الفحص الآن"}</span>
                </button>
              </div>
            </div>

            {/* Audit Results Table */}
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                <Shield className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">لم يتم تشغيل التدقيق الجنائي في هذه الجلسة</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  انقر على زر "بدء التدقيق الجنائي المباشر" لفحص التواقيع والبصمات الرقمية لكافة وثائق الأرشيف.
                </p>
                <button
                  onClick={runFullVaultAudit}
                  className="mt-2 px-5 py-2 bg-[#0f2d1e] text-amber-200 rounded-xl text-xs font-bold shadow"
                >
                  بدء فحص السلامة الآن
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="p-3">حالة النزاهة</th>
                      <th className="p-3">الرقم الإشاري</th>
                      <th className="p-3">عنوان الوثيقة</th>
                      <th className="p-3">بصمة SHA-256 المخزنة</th>
                      <th className="p-3">البصمة المحسوبة لحظياً</th>
                      <th className="p-3">زمن الاستجابة</th>
                      <th className="p-3">المدقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => {
                      const isPassed = log.status === "passed";
                      return (
                        <tr key={log.id} className={isPassed ? "hover:bg-slate-50" : "bg-red-50"}>
                          <td className="p-3">
                            {isPassed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                سليم ومطابق
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-full border border-red-300 animate-pulse">
                                <XCircle className="w-3.5 h-3.5" />
                                كشف تلاعب غير مصرح!
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">{log.docRef}</td>
                          <td className="p-3 max-w-[200px] truncate text-slate-900 font-medium" title={log.docTitle}>
                            {log.docTitle}
                          </td>
                          <td className="p-3 font-mono text-slate-500 text-[10px] truncate max-w-[120px]" title={log.storedHash}>
                            {log.storedHash.slice(0, 10)}...{log.storedHash.slice(-6)}
                          </td>
                          <td className="p-3 font-mono text-[10px] truncate max-w-[120px]" title={log.calculatedHash}>
                            <span className={isPassed ? "text-slate-500" : "text-red-700 font-bold"}>
                              {log.calculatedHash.slice(0, 10)}...{log.calculatedHash.slice(-6)}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-600">{log.verificationLatencyMs} ms</td>
                          <td className="p-3 text-slate-700">{log.checkedBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Custody Certificates (شهادات الإيداع والعهدة الرقمية) */}
      {activeSubTab === "custody-certs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Selector for Certificate */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-800" />
                اختر وثيقة لإصدار شهادة العهدة
              </h4>
              <div className="mt-2 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث بالرقم الإشاري أو العنوان..."
                  className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredDocsForCert.map((d) => {
                const isSelected = selectedDocForCert?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDocForCert(d)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-600 ring-1 ring-emerald-600/30"
                        : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-mono text-[10px] text-amber-700 font-bold mb-0.5">{d.refNumber}</div>
                    <div className="font-bold text-slate-900 truncate">{d.title}</div>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>{d.era.split("(")[0]}</span>
                      <span className="font-semibold text-emerald-800">{d.financialAmount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Tamper-Proof Custody Certificate View */}
          <div className="lg:col-span-2">
            {selectedDocForCert ? (
              <div className="bg-[#fcfbf7] border-2 border-emerald-900/30 rounded-2xl p-8 shadow-lg relative overflow-hidden space-y-6">
                {/* Print button */}
                <div className="flex justify-between items-center border-b border-amber-900/20 pb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-emerald-800" />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-950 font-mono">
                      State of Libya • Ministry of Finance Digital Vault
                    </span>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-[#0f2d1e] hover:bg-[#16422c] text-amber-200 font-bold rounded-lg text-xs flex items-center gap-2 shadow"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة الشهادة الرسمية</span>
                  </button>
                </div>

                {/* Certificate Header */}
                <div className="text-center space-y-2">
                  <div className="text-xs font-bold text-emerald-900">دولة ليبيا • وزارة المالية</div>
                  <div className="text-sm font-bold text-slate-700">ديوان الخزانة العامة والأرشيف المالي المركزي</div>
                  <h2 className="text-2xl font-bold font-['Amiri'] text-emerald-950 pt-1">
                    شهادة إيداع وحفظ أرشيفي رقمي مشفر (WORM)
                  </h2>
                  <div className="text-xs text-slate-500 font-mono">
                    CERT-ID: LY-MOF-VAULT-{selectedDocForCert.barcode}
                  </div>
                </div>

                {/* Statement */}
                <div className="bg-white/80 border border-emerald-800/20 rounded-xl p-5 text-xs text-slate-800 leading-relaxed space-y-3">
                  <p>
                    يُشهد ديوان وزارة المالية والمركز الوطني للأرشفة الرقمية بأن الوثيقة التاريخية الموضحة بياناتها أدناه قد تم إيداعها وتشفيرها نهائياً بالخزينة الرقمية السيادية وفقاً لمعايير الأرشفة العالمية ISO 14721، واكتسبت صفة <strong>الوثيقة الأصلية غير القابلة للإلغاء أو التعديل</strong>:
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">الرقم الإشاري:</span>
                      <strong className="text-slate-900">{selectedDocForCert.refNumber}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">التاريخ الرسمي:</span>
                      <strong className="text-slate-900">{selectedDocForCert.gregorianDate}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200 col-span-2">
                      <span className="text-slate-500 block text-[10px]">عنوان السجل:</span>
                      <strong className="text-slate-900 font-['Amiri'] text-sm">{selectedDocForCert.title}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">المبلغ المالي الموثق:</span>
                      <strong className="text-emerald-800">{selectedDocForCert.financialAmount}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">درجة السرية السيادية:</span>
                      <strong className="text-amber-800">{selectedDocForCert.classification}</strong>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Signature Block */}
                <div className="bg-slate-900 text-emerald-300 p-4 rounded-xl font-mono text-[10px] space-y-1.5">
                  <div className="text-amber-400 font-bold text-xs mb-1 flex items-center gap-1.5">
                    <Binary className="w-4 h-4" />
                    المطابقة الجنائية والأدلة التشفيرية (Cryptographic Proof)
                  </div>
                  <div className="break-all">
                    <span className="text-slate-400">SHA-256 Checksum: </span>
                    {selectedDocForCert.cryptographicProof?.sha256Hash}
                  </div>
                  <div className="break-all">
                    <span className="text-slate-400">Merkle Root: </span>
                    {masterMerkleRoot}
                  </div>
                  <div>
                    <span className="text-slate-400">Encryption Standard: </span>
                    {selectedDocForCert.cryptographicProof?.encryptionAlgorithm} (Hardware Protected Key)
                  </div>
                  <div>
                    <span className="text-slate-400">Timestamp Authority: </span>
                    {selectedDocForCert.cryptographicProof?.timestampAuthority}
                  </div>
                </div>

                {/* Signatures & Custody Stamp */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-amber-900/20 text-center text-xs">
                  <div className="space-y-2">
                    <div className="text-slate-600 font-medium">أمين الخزينة العامة والأرشيف السيادي</div>
                    <div className="font-bold text-emerald-950 font-['Amiri'] text-sm">م. عثمان مفتاح الترهوني</div>
                    <div className="text-[10px] text-slate-400 font-mono">LY-MOF-SEC-001 (التوقيع الرقمي معتمد)</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-slate-600 font-medium">مراقب ديوان المحاسبة والامتثال</div>
                    <div className="font-bold text-emerald-950 font-['Amiri'] text-sm">المستشارة خديجة بشير المقريف</div>
                    <div className="text-[10px] text-slate-400 font-mono">LY-ACC-INSP-042 (المطابقة الجنائية نافذة)</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
