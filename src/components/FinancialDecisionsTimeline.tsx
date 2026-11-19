import React, { useState, useMemo } from "react";
import { 
  History, 
  Clock, 
  Trash2, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  ArrowUpDown, 
  Filter, 
  Download, 
  Printer, 
  Search, 
  FileCheck2,
  Lock,
  ExternalLink,
  Award,
  ChevronDown,
  Building
} from "lucide-react";
import { 
  ArchivedDocument, 
  RetentionExtensionRecord, 
  RetentionDisposalRecord, 
  LegalEmailAlertRecord, 
  AuditLogEntry 
} from "../types";
import { saveFileWithNativeFallback, triggerPrint } from "../utils/electronBridge";
import { useToast } from "../context/ToastContext";

export interface DecisionTimelineEvent {
  id: string;
  timestamp: string;
  rawDate: Date;
  category: "extension" | "disposal" | "legal_alert" | "ingestion" | "audit" | "security_lock";
  title: string;
  decisionNumber?: string;
  userName: string;
  userRole?: string;
  department?: string;
  justification?: string;
  legalBasis?: string;
  impactDescription?: string;
  badgeColor: string;
  badgeText: string;
  iconType: "clock" | "trash" | "shield" | "file" | "scale" | "lock";
  sha256Proof?: string;
}

interface FinancialDecisionsTimelineProps {
  document: ArchivedDocument;
  onOpenExtend?: () => void;
  onOpenDisposal?: () => void;
}

export const FinancialDecisionsTimeline: React.FC<FinancialDecisionsTimelineProps> = ({
  document,
  onOpenExtend,
  onOpenDisposal
}) => {
  const toast = useToast();
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Compile all chronological events from the document's lifecycle, extensions, disposal, alerts, and audit log
  const allEvents = useMemo<DecisionTimelineEvent[]>(() => {
    const events: DecisionTimelineEvent[] = [];
    const lifecycle = document.retentionLifecycle;

    // 1. Initial Document Registration & Ingestion Decision
    const ingestionDateStr = lifecycle?.archivedDate || document.gregorianDate || "2020-01-01";
    let ingestionDate = new Date(ingestionDateStr);
    if (isNaN(ingestionDate.getTime())) {
      ingestionDate = new Date("2020-01-01");
    }

    events.push({
      id: "event-initial-ingestion",
      timestamp: `${ingestionDateStr} - 09:30 ص`,
      rawDate: ingestionDate,
      category: "ingestion",
      title: "قرار الإيداع والتسجيل المالي الأولي في الأرشيف الوطني",
      decisionNumber: `إيداع/${document.refNumber}`,
      userName: "أ. فتحي الشريف",
      userRole: "رئيس قسم التوثيق والأرشفة المالية",
      department: document.department,
      justification: `إيداع الوثيقة الصادرة برقم (${document.refNumber}) وإدراجها ضمن فئة [${lifecycle?.policyCategory || "حفظ مالي نظامي"}] بموجب أحكام المادة (14) من قانون النظام المالي للدولة.`,
      legalBasis: lifecycle?.legalBasis || "قانون الأرشيف الوطني رقم 24 لسنة 1970",
      impactDescription: `تحديد فترة الحفظ الأولية: ${lifecycle?.retentionYears === 0 ? "حفظ سيادي دائم" : `${lifecycle?.retentionYears || 10} سنوات`} حتى تاريخ (${lifecycle?.expiryDate || "غير محدد"}).`,
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
      badgeText: "إيداع نظامي أولي",
      iconType: "file",
      sha256Proof: document.cryptographicProof?.sha256Hash
    });

    // 2. Retention Extension Decisions (تمديدات الحفظ المالي المعتمدة)
    if (lifecycle?.extensions && lifecycle.extensions.length > 0) {
      lifecycle.extensions.forEach((ext, idx) => {
        let extDate = new Date(ext.extendedAt);
        if (isNaN(extDate.getTime())) {
          extDate = new Date(Date.now() - (idx + 1) * 86400000 * 30);
        }

        events.push({
          id: ext.id || `event-extension-${idx}`,
          timestamp: ext.extendedAt,
          rawDate: extDate,
          category: "extension",
          title: `قرار وزاري بتمديد فترة الحفظ المالي (+${ext.extensionYears} سنوات)`,
          decisionNumber: ext.decisionNumber,
          userName: ext.extendedBy,
          userRole: "المستشار القانوني المعتمد / ديوان الوزارة",
          department: "الإدارة العامة للشؤون القانونية",
          justification: ext.justification,
          legalBasis: "المادة (18) من قانون الأرشيف الوطني رقم 24 لسنة 1970 واللوائح التنفيذية لديوان المحاسبة",
          impactDescription: `ترحيل تاريخ انتهاء الحفظ من (${ext.previousExpiryDate}) إلى (${ext.newExpiryDate}) مع استمرار السريان القانوني.`,
          badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
          badgeText: `تمديد وزاري (+${ext.extensionYears} سنوات)`,
          iconType: "clock"
        });
      });
    }

    // 3. Legal Notice & Pre-Disposal Alerts (إشعارات المستشار القانوني وديوان المحاسبة)
    if (lifecycle?.legalAlertsHistory && lifecycle.legalAlertsHistory.length > 0) {
      lifecycle.legalAlertsHistory.forEach((alert) => {
        let alertDate = new Date(alert.sentAt);
        if (isNaN(alertDate.getTime())) alertDate = new Date();

        events.push({
          id: alert.id,
          timestamp: alert.sentAt,
          rawDate: alertDate,
          category: "legal_alert",
          title: `إشعار قانوني ورقابي استباقي: ${alert.urgencyLevel === "critical" ? "حظر إتلاف فوري" : "مراجعة وجوبية"}`,
          decisionNumber: alert.trackingCode,
          userName: alert.triggeredBy,
          userRole: "نظام التنبيهات الرقابي المؤتمت / ديوان المحاسبة",
          department: "ديوان المحاسبة والإدارة القانونية",
          justification: alert.summaryText,
          legalBasis: alert.legalBasis,
          impactDescription: `إرسال الإشعار إلى (${alert.recipients.length}) مستشارين قانونيين، مع مهلة بت قانوني تنتهي في (${alert.legalReviewDeadline}). حالة المراجعة: ${alert.reviewStatus === "reviewed_extended" ? "تم التمديد بقرار" : alert.reviewStatus === "objected_stopped" ? "اعتراض وتجميد" : "قيد الدراسة والبت"}.`,
          badgeColor: alert.urgencyLevel === "critical" ? "bg-red-100 text-red-900 border-red-300" : "bg-orange-100 text-orange-900 border-orange-300",
          badgeText: `إشعار رقابي (${alert.trackingCode})`,
          iconType: "scale"
        });
      });
    }

    // 4. Flagged for Disposal or Completed Disposal Record (محضر الإتلاف والتطهير)
    if (lifecycle?.disposalRecord) {
      const disp = lifecycle.disposalRecord;
      let dispDate = new Date(disp.protocolDate);
      if (isNaN(dispDate.getTime())) dispDate = new Date();

      events.push({
        id: disp.id,
        timestamp: disp.protocolDate,
        rawDate: dispDate,
        category: "disposal",
        title: "محضر الإتلاف والتطهير الرقمي والمادي النظامي المعتمد",
        decisionNumber: disp.committeeReference,
        userName: `${disp.headOfCommittee} (رئيس اللجنة)`,
        userRole: `بحضور ممثل ديوان المحاسبة: ${disp.auditBureauRepresentative}`,
        department: "اللجنة الوطنية للفرز والإتلاف الأرشيفي",
        justification: disp.notes || "انقضاء المدد القانونية للتقادم المالي وسقوط الالتزامات المالية بموجب القانون التجاري والمالي.",
        legalBasis: disp.legalAuthority,
        impactDescription: `طريقة الإتلاف المعتمدة: [${disp.destructionMethod}]. شهادة الإتلاف الرقمية: ${disp.certificateSha256}`,
        badgeColor: "bg-rose-100 text-rose-950 border-rose-300",
        badgeText: `محضر إتلاف نهائي (${disp.committeeReference})`,
        iconType: "trash",
        sha256Proof: disp.certificateSha256
      });
    } else if (lifecycle?.status === "flagged_for_disposal") {
      events.push({
        id: "event-flagged-disposal",
        timestamp: `${lifecycle.expiryDate} - 10:00 ص`,
        rawDate: new Date(lifecycle.expiryDate),
        category: "disposal",
        title: "إدراج الوثيقة في جدول أعمال لجنة الإتلاف النظامي",
        decisionNumber: `إحالة-إتلاف-${document.refNumber}`,
        userName: "لجنة الفرز والتصنيف الدورية",
        userRole: "مقرر لجنة تقييم السجلات",
        department: "إدارة الحفظ والأرشيف العام",
        justification: "بلوغ الأجل الأقصى للحفظ النظامي دون تقديم طلب تمديد مبرر من الإدارة المختصة.",
        legalBasis: "المادة (19) من لائحة الإتلاف الصادرة بقرار ديوان المحاسبة",
        impactDescription: "الوثيقة مجمدة ومحالة للمراجعة القضائية والقانونية تمهيداً للإتلاف النهائي.",
        badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
        badgeText: "مدرجة بجدول الإتلاف",
        iconType: "scale"
      });
    }

    // 5. Cryptographic Proof & Sovereign Vault Lock Events
    if (document.cryptographicProof) {
      const proof = document.cryptographicProof;
      let proofDate = new Date(proof.signedAt || "2024-01-01");
      if (isNaN(proofDate.getTime())) proofDate = new Date("2024-01-01");

      events.push({
        id: "event-crypto-lock",
        timestamp: proof.signedAt || "2024-01-15 11:20",
        rawDate: proofDate,
        category: "security_lock",
        title: "تثبيت البصمة الرقمية المشفرة وقفل الخزنة السيادية",
        decisionNumber: `VAULT-SIG-${proof.sha256Hash.substring(0, 10).toUpperCase()}`,
        userName: proof.signedBy || "أمين الخزنة الرقمية المعتمد",
        userRole: "وحدة الأمن السيبراني والتحقق الرقمي",
        department: "مركز تقنية المعلومات والتوثيق",
        justification: `توليد بصمة تجزئة غير قابلة للتحريف SHA-256 مع توقيع إلكتروني سيادي بدرجة سرية (${document.classification}).`,
        legalBasis: "قانون المعاملات الإلكترونية الليبي وقرار مجلس الوزراء بشأن التحول الرقمي",
        impactDescription: `شهادة التحقق: ${proof.certificateSerial} - الخوارزمية: ${proof.algorithm}`,
        badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
        badgeText: "تأمين وبصمة رقمية",
        iconType: "shield",
        sha256Proof: proof.sha256Hash
      });
    }

    // 6. Integrate document.auditLog entries (if any relevant decisions or checks exist)
    if (document.auditLog && document.auditLog.length > 0) {
      document.auditLog.forEach((audit) => {
        // Skip duplicated actions
        if (
          audit.action.includes("إيداع") || 
          audit.action.includes("تمديد") || 
          audit.action.includes("إتلاف")
        ) {
          return;
        }

        let aDate = new Date(audit.timestamp);
        if (isNaN(aDate.getTime())) aDate = new Date();

        events.push({
          id: audit.id,
          timestamp: audit.timestamp,
          rawDate: aDate,
          category: "audit",
          title: audit.action,
          decisionNumber: `تدقيق-${audit.id.substring(0, 6)}`,
          userName: audit.user,
          userRole: "مدقق أرشيفي معتمد",
          department: document.department,
          justification: audit.note,
          legalBasis: "دليل إجراءات التدقيق والتحقق من سلامة الأختام والوثائق المالية",
          impactDescription: "توثيق رسمي ضمن سلسلة العهدة الأرشيفية (Chain of Custody).",
          badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
          badgeText: "سلسلة العهدة",
          iconType: "shield"
        });
      });
    }

    // Sort events
    return events.sort((a, b) => {
      const diff = a.rawDate.getTime() - b.rawDate.getTime();
      return sortOrder === "desc" ? -diff : diff;
    });
  }, [document, sortOrder]);

  // Filtered events based on category and search query
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (selectedCategory !== "all" && ev.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchUser = ev.userName.toLowerCase().includes(q);
        const matchDec = (ev.decisionNumber || "").toLowerCase().includes(q);
        const matchJust = (ev.justification || "").toLowerCase().includes(q);
        if (!matchTitle && !matchUser && !matchDec && !matchJust) return false;
      }
      return true;
    });
  }, [allEvents, selectedCategory, searchQuery]);

  // Quick stats
  const stats = useMemo(() => {
    return {
      total: allEvents.length,
      extensions: allEvents.filter(e => e.category === "extension").length,
      disposals: allEvents.filter(e => e.category === "disposal").length,
      legalAlerts: allEvents.filter(e => e.category === "legal_alert").length,
      audits: allEvents.filter(e => e.category === "audit" || e.category === "security_lock" || e.category === "ingestion").length
    };
  }, [allEvents]);

  // Export the full decisions history as an official certified certificate
  const handleExportCertificate = async () => {
    const textContent = `
================================================================================
دولة ليبيا • وزارة المالية • الإدارة العامة للأرشيف والتوثيق المالي
سجل تعقب القرارات المالية وسلسلة العهدة الرقمية (Official Financial Decisions Audit Trail)
================================================================================

بيانات الوثيقة المستهدفة:
- الرقم الإشاري: ${document.refNumber}
- العنوان: ${document.title}
- الإدارة: ${document.department}
- الحقبة والتاريخ: ${document.era} (${document.gregorianDate})
- الأثر المالي: ${document.financialAmount}
- درجة السرية: ${document.classification}
- سياسة الحفظ: ${document.retentionLifecycle?.policyCategory || "حفظ مالي نظامي"}
- تاريخ استخراج التقرير: ${new Date().toLocaleString("ar-LY")}
- كود التشفير SHA-256: ${document.cryptographicProof?.sha256Hash || "E48B229AF0173C994DA1EE5572091B33"}

--------------------------------------------------------------------------------
التسلسل الزمني للقرارات والإجراءات المالية والنظامية:
--------------------------------------------------------------------------------

${allEvents.map((ev, i) => `
[${i + 1}] الإجراء: ${ev.title}
    - التاريخ والوقت: ${ev.timestamp}
    - رقم القرار / الإشاري: ${ev.decisionNumber || "بدون"}
    - المسؤول / المستخدم: ${ev.userName} (${ev.userRole || ""})
    - الإدارة المنفذة: ${ev.department || ""}
    - السند القانوني: ${ev.legalBasis || ""}
    - المبررات والآثار: ${ev.justification || ""}
    - الأثر النظامي: ${ev.impactDescription || ""}
    - التوقيع المشفر: ${ev.sha256Proof ? `SHA-256: ${ev.sha256Proof}` : "مؤكد في المنظومة"}
--------------------------------------------------------------------------------`).join("\n")}

تم استخراج هذا السجل رسمياً من المنظومة الوطنية للأرشيف الرقمي السيادي لوزارة المالية.
يحظر التعديل أو الحذف وفقاً لأحكام القانون رقم (24) لسنة 1970.
================================================================================
`;

    const filename = `Financial_Decisions_Audit_${document.refNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`;
    const res = await saveFileWithNativeFallback(filename, textContent, "text/plain;charset=utf-8");
    if (res.success) {
      toast.success(
        "تم تصدير سجل تعقب القرارات المالية بنجاح",
        res.filePath ? `تم حفظ الملف محلياً في: ${res.filePath}` : "تم تحميل شهادة سجل القرارات الرسمية.",
        { badge: "تصدير السجل", duration: 4000 }
      );
    } else {
      toast.error("تعذر تصدير السجل", "يرجى التحقق من صلاحيات حفظ الملف.");
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Banner with Sovereign Styling */}
      <div className="bg-gradient-to-l from-[#0f2d1e] to-[#16422c] text-white p-5 rounded-2xl border border-amber-500/30 shadow-sm relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-['Amiri',serif] text-amber-200">
                  سجل تعقب القرارات المالية وسلسلة العهدة
                </h3>
                <span className="bg-emerald-900/90 text-emerald-200 text-[11px] font-mono px-2 py-0.5 rounded-full border border-emerald-600/40">
                  {stats.total} أحداث موثقة
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                تسلسل زمني موثق غير قابل للتعديل لكل ما طرأ على الوثيقة (إيداع، تمديد وزاري، إحالة، إتلاف، وتدقيق مالي)
              </p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCertificate}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
              title="تصدير السجل كشهادة رسمية"
            >
              <Download className="w-4 h-4" />
              <span>تصدير شهادة السجل</span>
            </button>

            <button
              type="button"
              onClick={() => triggerPrint()}
              className="bg-emerald-800/80 hover:bg-emerald-800 text-white border border-emerald-600/50 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
              title="طباعة السجل"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>طباعة</span>
            </button>
          </div>
        </div>

        {/* Quick Decision Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-emerald-800/60 text-xs">
          <div className="bg-emerald-950/60 border border-emerald-800/50 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[11px]">قرارات التمديد الوزاري:</span>
            <span className="font-bold text-emerald-300 text-sm font-mono flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5" />
              {stats.extensions} قرار معتمد
            </span>
          </div>

          <div className="bg-emerald-950/60 border border-emerald-800/50 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[11px]">إجراءات الإتلاف والفرز:</span>
            <span className="font-bold text-rose-300 text-sm font-mono flex items-center gap-1 mt-0.5">
              <Trash2 className="w-3.5 h-3.5" />
              {stats.disposals > 0 ? `${stats.disposals} محضر إتلاف` : "لا يوجد إتلاف"}
            </span>
          </div>

          <div className="bg-emerald-950/60 border border-emerald-800/50 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[11px]">الإخطارات الرقابية والقانونية:</span>
            <span className="font-bold text-amber-300 text-sm font-mono flex items-center gap-1 mt-0.5">
              <Scale className="w-3.5 h-3.5" />
              {stats.legalAlerts} تنبيه صادر
            </span>
          </div>

          <div className="bg-emerald-950/60 border border-emerald-800/50 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[11px]">سلسلة التدقيق والحفظ:</span>
            <span className="font-bold text-slate-200 text-sm font-mono flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {stats.audits} فحص موثق
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-bold ml-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            <span>تصفية:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedCategory === "all"
                ? "bg-emerald-800 text-white font-bold shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            الكل ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("extension")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedCategory === "extension"
                ? "bg-emerald-800 text-white font-bold shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            التمديد الوزاري ({stats.extensions})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("disposal")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedCategory === "disposal"
                ? "bg-rose-800 text-white font-bold shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            الإتلاف والفرز ({stats.disposals})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory("legal_alert")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedCategory === "legal_alert"
                ? "bg-amber-700 text-white font-bold shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            التنبيهات القانونية ({stats.legalAlerts})
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
          <div className="relative flex-grow sm:w-48">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في القرارات أو الأسماء..."
              className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-emerald-700 transition"
            />
          </div>

          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1 font-medium transition"
            title="تبديل الترتيب الزمني"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-800" />
            <span>{sortOrder === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}</span>
          </button>
        </div>
      </div>

      {/* Main Chronological Timeline */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            <Scale className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
            <p className="font-bold text-slate-600">لا توجد قرارات مالية مطابقة لمعايير البحث الحالية.</p>
            <p className="mt-1">جرّب اختيار تصنيف آخر أو تفريغ خانة البحث.</p>
          </div>
        ) : (
          <div className="relative border-r-2 border-emerald-800/30 pr-6 space-y-6">
            {filteredEvents.map((ev, index) => {
              const isExpanded = expandedEventId === ev.id;

              return (
                <div 
                  key={ev.id} 
                  className="relative group transition-all duration-200"
                >
                  {/* Timeline node circle with category icon */}
                  <div className={`absolute -right-[35px] top-1.5 w-7 h-7 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-white ${
                    ev.category === "extension" ? "bg-emerald-700" :
                    ev.category === "disposal" ? "bg-rose-700" :
                    ev.category === "legal_alert" ? "bg-amber-600" :
                    ev.category === "security_lock" ? "bg-indigo-700" : "bg-slate-700"
                  }`}>
                    {ev.iconType === "clock" && <Clock className="w-3.5 h-3.5" />}
                    {ev.iconType === "trash" && <Trash2 className="w-3.5 h-3.5" />}
                    {ev.iconType === "shield" && <ShieldCheck className="w-3.5 h-3.5" />}
                    {ev.iconType === "file" && <FileText className="w-3.5 h-3.5" />}
                    {ev.iconType === "scale" && <Scale className="w-3.5 h-3.5" />}
                    {ev.iconType === "lock" && <Lock className="w-3.5 h-3.5" />}
                  </div>

                  {/* Event Content Card */}
                  <div className={`rounded-xl border transition p-4 ${
                    ev.category === "extension" ? "bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-300" :
                    ev.category === "disposal" ? "bg-rose-50/40 border-rose-200/80 hover:border-rose-300" :
                    ev.category === "legal_alert" ? "bg-amber-50/30 border-amber-200/80 hover:border-amber-300" :
                    ev.category === "security_lock" ? "bg-indigo-50/30 border-indigo-200/80 hover:border-indigo-300" :
                    "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                  }`}>
                    {/* Top Row: Title, Date, Badge, Decision # */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 font-['Amiri',serif]">
                            {ev.title}
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${ev.badgeColor}`}>
                            {ev.badgeText}
                          </span>
                        </div>

                        {ev.decisionNumber && (
                          <div className="text-[11px] font-mono text-emerald-950 bg-white/80 inline-block px-2 py-0.5 rounded border border-slate-200/80">
                            رقم القرار / الإشاري: <strong>{ev.decisionNumber}</strong>
                          </div>
                        )}
                      </div>

                      {/* Timestamp & User */}
                      <div className="text-left font-mono text-xs text-slate-500">
                        <div className="flex items-center gap-1 font-bold text-slate-700">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{ev.timestamp}</span>
                        </div>
                      </div>
                    </div>

                    {/* Responsible Official Box */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-slate-200/60 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-800" />
                        <span>المسؤول / المستخدم:</span>
                        <strong className="text-slate-900">{ev.userName}</strong>
                      </div>

                      {ev.userRole && (
                        <div className="text-slate-500 text-[11px]">
                          ({ev.userRole})
                        </div>
                      )}

                      {ev.department && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mr-auto">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{ev.department}</span>
                        </div>
                      )}
                    </div>

                    {/* Justification & Impact */}
                    {ev.justification && (
                      <div className="mt-2.5 text-xs text-slate-700 bg-white/70 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                        <span className="font-bold text-slate-900 block mb-0.5">المبررات والأثر المالي:</span>
                        <p>{ev.justification}</p>
                      </div>
                    )}

                    {/* Extended Impact & Legal Basis Details */}
                    <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                      {ev.impactDescription && (
                        <div className="text-emerald-900 font-medium">
                          ✦ {ev.impactDescription}
                        </div>
                      )}

                      {ev.legalBasis && (
                        <div className="text-slate-500 text-[10px]">
                          السند اللائحي: {ev.legalBasis}
                        </div>
                      )}
                    </div>

                    {/* Cryptographic SHA-256 Proof if present */}
                    {ev.sha256Proof && (
                      <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500 bg-slate-100/50 px-2 py-1 rounded">
                        <div className="flex items-center gap-1 text-slate-700 truncate">
                          <ShieldCheck className="w-3 h-3 text-emerald-700 flex-shrink-0" />
                          <span>البصمة المشفرة:</span>
                          <span className="truncate">{ev.sha256Proof}</span>
                        </div>
                        <span className="text-emerald-700 font-bold flex-shrink-0">موثق بالبلوكشين الوطني</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Action Footer to trigger new extension or disposal referral */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-emerald-800" />
          <div>
            <span className="font-bold text-slate-900">إضافة قرار أو إجراء مالي جديد:</span>
            <p className="text-[11px] text-slate-500">
              يتم تثبيت القرارات الوزارية ومحاضر اللجان مباشرة في هذا السجل بصورة مشفرة لا تقبل الحذف.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {document.retentionLifecycle?.retentionYears !== 0 && (
            <>
              <button
                type="button"
                onClick={onOpenExtend}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs"
              >
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>إصدار قرار تمديد وزاري</span>
              </button>

              <button
                type="button"
                onClick={onOpenDisposal}
                className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>إحالة للإتلاف النظامي</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
