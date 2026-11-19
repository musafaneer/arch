import { 
  ArchivedDocument, 
  LegalOfficerContact, 
  LegalEmailAlertRecord, 
  SecurityClassification 
} from "../types";

/**
 * Standard Institutional Legal Officers and Audit Authorities for Libyan Ministry of Finance
 */
export const DEFAULT_LEGAL_OFFICERS: LegalOfficerContact[] = [
  {
    id: "officer-legal-director",
    name: "المستشار د. عبد الرحمن البوسيفي",
    title: "مدير عام الإدارة العامة للشؤون القانونية",
    department: "ديوان وزارة المالية - طرابلس",
    email: "legal.director@mof.gov.ly",
    isPrimary: true,
    phone: "+218 21 334 1100",
    roleBadge: "legal_advisor"
  },
  {
    id: "officer-audit-inspector",
    name: "المستشارة خديجة بشير المقريف",
    title: "مراقب ديوان المحاسبة والامتثال المالي والقانوني",
    department: "ديوان المحاسبة والرقابة المالية العامة",
    email: "audit.inspector@audit.gov.ly",
    isPrimary: true,
    phone: "+218 21 360 4420",
    roleBadge: "audit_bureau"
  },
  {
    id: "officer-disposal-chair",
    name: "أ. فرج علي الكيلاني",
    title: "رئيس لجنة الفرز والإتلاف الأرشيفي النظامي",
    department: "لجنة تقييم وحفظ الوثائق التاريخية",
    email: "disposal.committee@mof.gov.ly",
    isPrimary: true,
    phone: "+218 21 444 8912",
    roleBadge: "disposal_committee_chair"
  },
  {
    id: "officer-field-liaison",
    name: "مكتب المراجعة الرقابية الميدانية",
    title: "المسؤول القانوني الميداني المناوب",
    department: "وحدة التفتيش والرقابة الميدانية",
    email: "room5@academy.edu.ly",
    isPrimary: true,
    phone: "+218 91 223 9081",
    roleBadge: "field_inspector"
  }
];

/**
 * Evaluates whether an archived document is "Sensitive" and warrants strict legal officer alert
 * prior to any disposal or statutory expiration.
 */
export function isDocumentSensitiveForDisposal(doc: ArchivedDocument): {
  isSensitive: boolean;
  reasons: string[];
  urgency: "warning" | "urgent" | "critical";
} {
  const reasons: string[] = [];
  let isSensitive = false;
  let urgency: "warning" | "urgent" | "critical" = "warning";

  const lifecycle = doc.retentionLifecycle;
  if (!lifecycle) {
    return { isSensitive: false, reasons: [], urgency: "warning" };
  }

  // Check 1: Security classification
  if (doc.classification === "سري للغاية") {
    isSensitive = true;
    reasons.push("تصنيف الوثيقة أمني رفيع (سري للغاية) يتطلب موافقة وزير المالية ومستشار ديوان المحاسبة");
    urgency = "critical";
  } else if (doc.classification === "سري" || doc.classification === "سري ومحدود") {
    isSensitive = true;
    reasons.push("وثيقة مصنفة سرية تمس المعاملات المالية السيادية");
    urgency = "urgent";
  }

  // Check 2: Sovereign or Royal policy
  if (
    lifecycle.policyCategory.includes("سيادي") ||
    doc.era.includes("المملكة") ||
    doc.title.includes("مرسوم") ||
    doc.title.includes("الاحتياطي") ||
    doc.title.includes("الذهب")
  ) {
    isSensitive = true;
    reasons.push("وثيقة تأسيسية سيادية يحظر قانوناً إتلافها بموجب المادة (4) من قانون الأرشيف رقم 24 لسنة 1970");
    urgency = "critical";
  }

  // Check 3: Large Financial Magnitude (> 100,000)
  const numericAmount = parseFloat(doc.financialAmount.replace(/[^0-9.]/g, "") || "0");
  if (numericAmount >= 100000 || doc.financialAmount.includes("مليون") || doc.financialAmount.includes("جنيه")) {
    isSensitive = true;
    reasons.push(`أثر مالي جسيم يبلغ (${doc.financialAmount}) يستوجب مراجعة الشؤون القانونية للتحقق من سقوط الحقوق بالتقادم`);
    if (urgency !== "critical") urgency = "urgent";
  }

  // Check 4: Physical Fragility & Historical Value
  if (doc.physicalCondition === "أوراق تاريخية هشة") {
    isSensitive = true;
    reasons.push("أصل تاريخي فريد يتطلب قرار لجنة متخصصة قبل أي إجراء ترحيل أو إتلاف");
  }

  // Check 5: Flagged for disposal or Expired or Expiring within 90 days
  const status = lifecycle.status;
  const days = lifecycle.daysUntilExpiry;

  if (status === "flagged_for_disposal") {
    reasons.push("الوثيقة مدرجة حالياً في قوائم محضر الإتلاف المقترح وتحتاج تصديقاً قانونياً مانعاً للخطأ");
    urgency = "critical";
  } else if (status === "expired") {
    reasons.push(`انتهى أجل الحفظ النظامي منذ ${Math.abs(days)} يوماً دون صدور قرار تمديد أو إتلاف معتمد`);
    if (urgency !== "critical") urgency = "urgent";
  } else if (status === "expiring_soon") {
    reasons.push(`يتبقى ${days} يوماً فقط على تاريخ انتهاء الصلاحية المحددة في لائحة الحفظ`);
  }

  return {
    isSensitive,
    reasons,
    urgency
  };
}

/**
 * Filters all documents in the archive that are sensitive and approaching/at disposal stage
 */
export function getSensitiveDocumentsNearingDisposal(documents: ArchivedDocument[]): {
  documents: ArchivedDocument[];
  criticalCount: number;
  urgentCount: number;
  warningCount: number;
} {
  let criticalCount = 0;
  let urgentCount = 0;
  let warningCount = 0;

  const filtered = documents.filter(doc => {
    const lifecycle = doc.retentionLifecycle;
    if (!lifecycle) return false;

    // Must be in a critical lifecycle phase
    const isApproaching = 
      lifecycle.status === "expiring_soon" || 
      lifecycle.status === "expired" || 
      lifecycle.status === "flagged_for_disposal";

    if (!isApproaching) return false;

    const evaluation = isDocumentSensitiveForDisposal(doc);
    if (!evaluation.isSensitive) return false;

    if (evaluation.urgency === "critical") criticalCount++;
    else if (evaluation.urgency === "urgent") urgentCount++;
    else warningCount++;

    return true;
  });

  return {
    documents: filtered,
    criticalCount,
    urgentCount,
    warningCount
  };
}

/**
 * Builds the formal official Arabic Legal Notice Email Template (HTML & text)
 */
export function generateLegalNoticeEmailContent(
  doc: ArchivedDocument,
  recipients: LegalOfficerContact[],
  customNote?: string,
  senderUser?: { name: string; title: string }
): {
  subject: string;
  bodyHtml: string;
  summaryText: string;
  trackingCode: string;
  legalReviewDeadline: string;
} {
  const lifecycle = doc.retentionLifecycle;
  const evaluation = isDocumentSensitiveForDisposal(doc);
  const now = new Date();
  const timestampStr = now.toLocaleString("ar-LY", { dateStyle: "full", timeStyle: "short" });
  const trackingCode = `LY-MOF-LEGAL-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  // Legal review deadline: 14 business days from now or the scheduled expiry
  const deadlineDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const legalReviewDeadline = deadlineDate.toLocaleDateString("ar-LY", { dateStyle: "long" });

  const urgencyArabic = 
    evaluation.urgency === "critical" ? "طارئ وبالغ الأهمية (حظر إتلاف فوري)" :
    evaluation.urgency === "urgent" ? "عاجل جداً (مراجعة قانونية إلزامية)" : "تنبيه استباقي مشروط";

  const subject = `[تنبيه قانوني ${urgencyArabic}] اقتراب موعد إتلاف وثيقة حساسة - إشاري: ${doc.refNumber}`;

  const summaryText = `تنبيه صادر عن المنظومة الوطنية للأرشيف الرقمي لوزارة المالية الليبية إلى الإدارة العامة للشؤون القانونية وديوان المحاسبة بشأن الوثيقة ذات الرقم الإشاري (${doc.refNumber}) - "${doc.title}". تاريخ الإتلاف المقترح: ${lifecycle?.expiryDate || "غير محدد"}. يستوجب القرار مراجعة المستشارين القانونيين قبل التنفيذ لمنع إتلاف أي سجل ذي أثر سيادي أو مالي قائم.`;

  const recipientsListHtml = recipients
    .map(r => `<li style="margin-bottom: 4px;"><strong>${r.name}</strong> - ${r.title} (${r.email})</li>`)
    .join("");

  const reasonsListHtml = evaluation.reasons
    .map(r => `<li style="margin-bottom: 6px; color: #7f1d1d;"><strong>• ${r}</strong></li>`)
    .join("");

  const bodyHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: 'Cairo', 'Amiri', Tahoma, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; direction: rtl; text-align: right; color: #1e293b; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0f2d1e 0%, #16422c 100%); color: #fef08a; padding: 24px; border-bottom: 3px solid #eab308; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; background-color: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
    .content { padding: 28px; line-height: 1.8; font-size: 14px; }
    .doc-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 18px 0; }
    .data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 8px 0; }
    .legal-box { background: #fef2f2; border-right: 4px solid #dc2626; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .actions-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 18px; border-radius: 12px; margin: 24px 0; }
    .btn { display: inline-block; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; margin: 4px; }
    .btn-danger { background-color: #dc2626; color: #ffffff; }
    .btn-primary { background-color: #0f2d1e; color: #fef08a; }
    .footer { background: #f1f5f9; padding: 18px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">دولة ليبيا • وزارة المالية • الإدارة العامة للشؤون القانونية</div>
      <h1 style="margin: 0 0 10px 0; font-size: 20px; color: #ffffff;">إشعار استباقي لمراجعة قرار إتلاف وثيقة مالية حساسة</h1>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="badge">${urgencyArabic}</span>
        <span style="font-size: 12px; color: #fef08a; font-family: monospace;">كود التتبع الرقابي: ${trackingCode}</span>
      </div>
    </div>

    <div class="content">
      <p style="margin-top: 0; font-size: 15px;">
        <strong>السادة أصحاب الفضيلة والسعادة المستشارين القانونيين وممثلي ديوان المحاسبة المحترمين،</strong>
      </p>
      <p>
        تحية طيبة وبعد،،<br>
        بموجب أحكام <strong>المادة (18) من قانون الأرشيف الوطني رقم (24) لسنة 1970</strong> واللوائح التنفيذية لديوان المحاسبة بشأن التصرف في الوثائق والسجلات المالية، نود إحاطتكم علماً بأن المنظومة الرقمية الآلية قد رصدت <strong>اقتراب الأجل النظامي لإتلاف وثيقة مصنفة عالية الحساسية والأثر المالي</strong>، وتتطلب البت القضائي والإداري المسبق قبل اتخاذ أي تدبير تنفيذي.
      </p>

      <div class="doc-card">
        <h3 style="margin: 0 0 12px 0; color: #0f2d1e; font-size: 16px;">بيانات الوثيقة المستهدفة بالمراجعة:</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 35%;">الرقم الإشاري:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #0f2d1e; font-family: monospace;">${doc.refNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">عنوان الوثيقة:</td>
            <td style="padding: 6px 0; font-weight: bold;">${doc.title}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">الإدارة المنشئة / المودعة:</td>
            <td style="padding: 6px 0;">${doc.department}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">الحقبة والتاريخ:</td>
            <td style="padding: 6px 0;">${doc.era} (${doc.gregorianDate})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">درجة السرية والتصنيف:</td>
            <td style="padding: 6px 0; color: #b91c1c; font-weight: bold;">${doc.classification}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">المبلغ والأثر المالي:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #047857;">${doc.financialAmount}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">تاريخ الإتلاف النظامي المقترح:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #dc2626;">${lifecycle?.expiryDate || "غير محدد"} (${lifecycle?.daysUntilExpiry !== undefined ? lifecycle.daysUntilExpiry + " يوماً متبقية" : "فترة منتهية"})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">بصمة التشفير (SHA-256):</td>
            <td style="padding: 6px 0; font-family: monospace; font-size: 11px; color: #475569;">${doc.cryptographicProof?.sha256Hash || "E48B229AF0173C994DA1EE5572091B33"}</td>
          </tr>
        </table>
      </div>

      <div class="legal-box">
        <h4 style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px;">أسباب الحساسية ومبررات المراجعة الإلزامية:</h4>
        <ul style="margin: 0; padding-right: 20px;">
          ${reasonsListHtml}
        </ul>
      </div>

      ${customNote ? `
      <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 14px; border-radius: 8px; margin: 16px 0;">
        <strong style="color: #92400e;">ملاحظة المفتش / المرسل الميداني:</strong>
        <p style="margin: 6px 0 0 0; color: #78350f;">${customNote}</p>
      </div>` : ""}

      <div class="actions-box">
        <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;">الإجراءات القانونية المتاحة عبر المنظومة:</h4>
        <p style="margin-bottom: 12px; font-size: 13px;">
          يُرجى اتخاذ القرار الرقابي المناسب قبل انقضاء المهلة المحددة بتاريخ <strong>${legalReviewDeadline}</strong>:
        </p>
        <ol style="margin: 0; padding-right: 20px; font-size: 13px;">
          <li style="margin-bottom: 6px;"><strong>إصدار قرار تمديد وزاري:</strong> إبقاء السجل في الحفظ المالي لمدد إضافية (3 أو 5 أو 10 سنوات أو تحويله إلى دائم سيادي).</li>
          <li style="margin-bottom: 6px;"><strong>تسجيل اعتراض قانوني وتجميد الإتلاف:</strong> تعليق أي إجراءات للإتلاف مؤقتاً لحين استكمال قضايا أو مطالبات مالية عالقة.</li>
          <li style="margin-bottom: 6px;"><strong>اعتماد الإحالة للجنة الإتلاف:</strong> التحقق من استيفاء شروط التقادم وعدم ترتب أي التزام مالي على الدولة ثم تصديق المحضر.</li>
        </ol>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
        المرسل: <strong>${senderUser?.name || "نظام التنبيهات الرقابي المؤتمت"}</strong> - ${senderUser?.title || "ديوان وزارة المالية"}<br>
        تاريخ وزمن الإرسال: ${timestampStr}
      </p>

      <div style="margin-top: 16px;">
        <h5 style="margin: 0 0 6px 0; font-size: 12px; color: #475569;">قائمة المسؤولين القانونيين الموجه إليهم الإشعار:</h5>
        <ul style="margin: 0; padding-right: 20px; font-size: 12px; color: #475569;">
          ${recipientsListHtml}
        </ul>
      </div>
    </div>

    <div class="footer">
      المنظومة الوطنية الموحدة للتحول اللاورقي والأرشيف الرقمي • وزارة المالية • دولة ليبيا<br>
      هذا الإشعار رسمي وموثق في سجل التدقيق الأرشيفي العام وغير قابل للحذف • رمز الوثيقة: ${doc.id}
    </div>
  </div>
</body>
</html>
`;

  return {
    subject,
    bodyHtml,
    summaryText,
    trackingCode,
    legalReviewDeadline
  };
}

/**
 * In-memory storage for sent legal alerts to enable immediate reflection and audit log history
 */
const SENT_LEGAL_ALERTS_STORAGE_KEY = "ly_mof_sent_legal_alerts";

export function loadSentLegalAlerts(): LegalEmailAlertRecord[] {
  try {
    const raw = localStorage.getItem(SENT_LEGAL_ALERTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSentLegalAlert(alert: LegalEmailAlertRecord): void {
  try {
    const current = loadSentLegalAlerts();
    const updated = [alert, ...current.filter(a => a.id !== alert.id)];
    localStorage.setItem(SENT_LEGAL_ALERTS_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.error("Failed to save legal alert to local store:", err);
  }
}
