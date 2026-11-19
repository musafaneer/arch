import { DepartmentType, DocumentType, LibyanEra, SecurityClassification } from "../types";
import { normalizeArabicText, stripArabicDiacritics } from "./arabicSearchEngine";

export interface SuggestedTagItem {
  tag: string;
  confidence: number; // 0 - 100%
  category: "financial" | "institutional" | "legal_era" | "topic" | "security";
  matchedRule: string;
  sourceTextSnippet?: string;
}

export interface SmartTaggingAnalysisResult {
  suggestedKeywords: SuggestedTagItem[];
  suggestedDepartment?: {
    value: DepartmentType;
    confidence: number;
    reason: string;
  };
  suggestedDocType?: {
    value: DocumentType;
    confidence: number;
    reason: string;
  };
  suggestedClassification?: {
    value: SecurityClassification;
    confidence: number;
    reason: string;
  };
  suggestedEra?: {
    value: LibyanEra;
    confidence: number;
    reason: string;
  };
  suggestedFinancialAmount?: {
    amount: string;
    currency: string;
    confidence: number;
  };
  extractedEntities: {
    signatories: string[];
    lawsOrDecrees: string[];
    locations: string[];
  };
  summaryConfidenceScore: number;
}

// Comprehensive Institutional Dictionary for Libyan Financial Domain
interface TagPatternRule {
  tag: string;
  category: "financial" | "institutional" | "legal_era" | "topic" | "security";
  patterns: RegExp[];
  weight: number;
  explanation: string;
}

const TAG_PATTERN_RULES: TagPatternRule[] = [
  // 1. Petroleum, Concessions, Royalties
  {
    tag: "إتاوات نفطية",
    category: "financial",
    patterns: [/إتاو(ات|ة)/, /اتاو(ات|ة)/, /عائدات النفط/, /امتيازات التنقيب/, /عقد امتياز/, /حوض سرت/, /خام البريقة/],
    weight: 96,
    explanation: "كشف مصطلحات إتاوات وعقود امتيازات تنقيب بترولية بالوثيقة"
  },
  {
    tag: "عقد امتياز وإتاوات نفطية",
    category: "topic",
    patterns: [/عقد امتياز/, /امتيازات نفطية/, /شركات النفط/, /التنقيب عن النفط/],
    weight: 94,
    explanation: "تكرار مصطلحات عقود الاستكشاف والامتياز البترولي"
  },
  {
    tag: "مجلس الإعمار",
    category: "institutional",
    patterns: [/مجلس الإعمار/, /مجلس الاعمار/, /مشاريع الإعمار/, /تطوير البنية التحتية/],
    weight: 92,
    explanation: "رصد إشارة لهيئة مجلس الإعمار الوطني التاريخي"
  },
  {
    tag: "حساب الاحتياطي",
    category: "financial",
    patterns: [/حساب الاحتياطي/, /حساب خاص/, /الاحتياطي المالي/, /الاحتياطي العام/],
    weight: 90,
    explanation: "تحديد قيود الاحتياطي المالي والسيادي العام"
  },

  // 2. Customs, Tariffs, Ports
  {
    tag: "التعريفة الجمركية",
    category: "financial",
    patterns: [/تعريفة جمركية/, /تعرفة جمركية/, /رسوم جمركية/, /التعريفة الموحدة/, /مكتب جمرك/],
    weight: 95,
    explanation: "كشف بنود التعرفة والرسوم الجمركية الحدودية"
  },
  {
    tag: "إقرار وتخليص جمركي",
    category: "topic",
    patterns: [/تخليص جمركي/, /إقرار جمركي/, /اقرار جمركي/, /بيان جمركي/, /بوليصة شحن/, /منافذ برية/],
    weight: 93,
    explanation: "ورود مصطلحات بيانات وتخليص الشحنات الجمركية"
  },
  {
    tag: "ميناء طرابلس البحري",
    category: "topic",
    patterns: [/ميناء طرابلس/, /رصيف الميناء/, /البضائع الواردة/],
    weight: 88,
    explanation: "اكتشاف موقع الإنزال والجمارك بميناء طرابلس"
  },
  {
    tag: "ميناء بنغازي",
    category: "topic",
    patterns: [/ميناء بنغازي/, /جمرك بنغازي/, /أرصفة بنغازي/],
    weight: 88,
    explanation: "تحديد حركة الواردات عبر ميناء بنغازي"
  },

  // 3. Treasury, Disbursement, Public Debt
  {
    tag: "الخزانة العامة",
    category: "institutional",
    patterns: [/الخزانة العامة/, /الخزانه العامه/, /حساب الخزانة/, /أمين الخزانة/],
    weight: 95,
    explanation: "معاملة مركزية صادرة أو مقيدة لدى إدارة الخزانة العامة"
  },
  {
    tag: "إذن صرف مالي",
    category: "financial",
    patterns: [/إذن صرف/, /اذن صرف/, /صرف مالي/, /حوالة مالية/, /سند صرف/, /صرف من الباب/],
    weight: 94,
    explanation: "رصد أوامر وأذونات مدفوعات الخزانة"
  },
  {
    tag: "سندات خزانة وقرض عام",
    category: "financial",
    patterns: [/سندات خزانة/, /سندات الخزانة/, /قرض عام/, /اكتتاب عام/, /أذونات الخزانة/, /فوائد الدين/],
    weight: 93,
    explanation: "أدوات الدين العام والسندات السيادية المكتشفة"
  },
  {
    tag: "مصرف ليبيا المركزي",
    category: "institutional",
    patterns: [/مصرف ليبيا المركزي/, /بنك ليبيا/, /البنك المركزي/, /المصرف المركزي/, /محافظ المصرف/],
    weight: 92,
    explanation: "توثيق دور وعلاقة السلطة النقدية ومصرف ليبيا المركزي"
  },

  // 4. Budget, Emergency, Allocations
  {
    tag: "قانون الميزانية التقديرية",
    category: "financial",
    patterns: [/قانون الميزانية/, /الميزانية التقديرية/, /الموازنة العامة/, /أبواب الميزانية/, /الباب الأول/, /الباب الثاني/],
    weight: 95,
    explanation: "تشريعات وأبواب تخصيص الميزانية العامة للدولة"
  },
  {
    tag: "ميزانية الطوارئ",
    category: "financial",
    patterns: [/ميزانية الطوارئ/, /بند الطوارئ/, /ظروف طارئة/, /احتياطي الطوارئ/],
    weight: 90,
    explanation: "تخصيصات موازنة الطوارئ والإغاثة المالية"
  },
  {
    tag: "علاوات ومرتبات",
    category: "financial",
    patterns: [/كشف مرتبات/, /المرتبات والأجور/, /علاوات ديوانية/, /الرقم الوطني/, /استقطاعات الضمان/],
    weight: 92,
    explanation: "جداول استحقاقات الرواتب والمكافآت الوظيفية"
  },

  // 5. Taxes, Tithes, Revenue
  {
    tag: "الضريبة على الدخل",
    category: "financial",
    patterns: [/ضريبة الدخل/, /ضرائب الدخل/, /الضريبة النوعية/, /مصلحة الضرائب/, /الربط الضريبي/],
    weight: 92,
    explanation: "أحكام وقوائم الجباية والضريبة العامة"
  },
  {
    tag: "طابع دمغة مالية",
    category: "financial",
    patterns: [/دمغة مالية/, /طابع دمغة/, /رسم الدمغة/, /طوابع مالية/],
    weight: 88,
    explanation: "كشف رسوم وطوابع الدمغة السيادية"
  },

  // 6. Auditing & Compliance
  {
    tag: "ديوان المحاسبة",
    category: "institutional",
    patterns: [/ديوان المحاسبة/, /ديوان المحاسبه/, /الرقابة المالية/, /تقرير الرقابة/, /ملاحظات الفحص/],
    weight: 94,
    explanation: "خضوع الوثيقة أو الإجراء لفحص ورقابة ديوان المحاسبة"
  },
  {
    tag: "تسوية محاسبية",
    category: "financial",
    patterns: [/تسوية محاسبية/, /تسوية العهد/, /إقفال الحساب الختامي/, /الحسابات الختامية/],
    weight: 89,
    explanation: "إجراءات تسوية القيود والدفاتر الحسابية"
  },

  // 7. Real Estate & State Property
  {
    tag: "أملاك الدولة العامة",
    category: "institutional",
    patterns: [/أملاك الدولة/, /املاك الدوله/, /أصول عقارية/, /عقارات الدولة/, /نزع ملكية/],
    weight: 91,
    explanation: "معاملة توثيق وإدارة أصول وأملاك الدولة الليبية"
  },

  // 8. Decrees & Legal
  {
    tag: "المرسوم الملكي",
    category: "legal_era",
    patterns: [/مرسوم ملكي/, /إدريس الأول/, /ملك المملكة الليبية/, /قصر الخلد/],
    weight: 96,
    explanation: "صيغة المراسيم الملكية السامية لعهد المملكة الليبية"
  },
  {
    tag: "قرار مجلس الوزراء",
    category: "legal_era",
    patterns: [/مجلس الوزراء/, /رئيس الوزراء/, /قرار وزاري رقم/, /بناء على عرض وزير المالية/],
    weight: 90,
    explanation: "قرارات حكومية ومراسيم وزارية معتمدة"
  }
];

/**
 * Analyzes full OCR text and metadata to generate automated Smart Tagging & Classification suggestions.
 */
export function analyzeDocumentOcrForSmartTagging(
  ocrText: string,
  currentDoc?: {
    title?: string;
    refNumber?: string;
    department?: DepartmentType;
    era?: LibyanEra;
    docType?: DocumentType;
    classification?: SecurityClassification;
    financialAmount?: string;
    existingKeywords?: string[];
  }
): SmartTaggingAnalysisResult {
  const normalizedOcr = normalizeArabicText(ocrText || "");
  const normalizedTitle = normalizeArabicText(currentDoc?.title || "");
  const fullText = `${normalizedTitle} \n ${normalizedOcr}`;

  // 1. Detect Keywords & Tags
  const detectedTagsMap = new Map<string, SuggestedTagItem>();

  for (const rule of TAG_PATTERN_RULES) {
    let matchCount = 0;
    let snippet = "";

    for (const pattern of rule.patterns) {
      const match = pattern.exec(ocrText || "") || pattern.exec(currentDoc?.title || "");
      if (match) {
        matchCount++;
        if (!snippet) {
          const idx = match.index;
          const start = Math.max(0, idx - 25);
          const end = Math.min(ocrText.length, idx + match[0].length + 25);
          snippet = ocrText.substring(start, end).replace(/\s+/g, " ").trim();
        }
      }
    }

    if (matchCount > 0) {
      // Calculate adjusted confidence
      const confidence = Math.min(99, rule.weight + (matchCount > 1 ? 3 : 0));
      detectedTagsMap.set(rule.tag, {
        tag: rule.tag,
        confidence,
        category: rule.category,
        matchedRule: rule.explanation,
        sourceTextSnippet: snippet ? `"...${snippet}..."` : undefined
      });
    }
  }

  // 2. Classify Security Level (Classification) based on keywords
  let suggestedClassification: SmartTaggingAnalysisResult["suggestedClassification"] = undefined;
  if (/سري للغاية|للغاية سري|top secret|معاملة حمراء/i.test(fullText)) {
    suggestedClassification = {
      value: "سري للغاية",
      confidence: 96,
      reason: "تم رصد عبارة 'سري للغاية' صريحة في متن أو ديباجة الوثيقة"
    };
  } else if (/سري ومحدود|سري جدا|مكتوم/i.test(fullText)) {
    suggestedClassification = {
      value: "سري ومحدود",
      confidence: 92,
      reason: "تم رصد دمغة 'سري ومحدود' أو تصنيف مكتوم في الترويسة"
    };
  } else if (/سري\b|لا يجوز تداوله|محظور النشر/i.test(fullText)) {
    suggestedClassification = {
      value: "سري",
      confidence: 89,
      reason: "اشتمال الوثيقة على صفة السرية الإدارية وفق ضوابط التداول"
    };
  } else if (/محدود\b|للاستعمال الداخلي/i.test(fullText)) {
    suggestedClassification = {
      value: "محدود",
      confidence: 85,
      reason: "وثيقة ذات تداول داخلي محدود النطاق"
    };
  } else {
    suggestedClassification = {
      value: "عام",
      confidence: 88,
      reason: "لا توجد قيود سرية أو علامات حظر في النص المستخرج"
    };
  }

  // 3. Detect Era from Years or Rulers
  let suggestedEra: SmartTaggingAnalysisResult["suggestedEra"] = undefined;
  if (/إدريس|التاج الملكي|المملكة الليبية|قصر الخلد|195[0-9]|196[0-8]/i.test(fullText)) {
    suggestedEra = {
      value: "المملكة الليبية (1951 - 1969)",
      confidence: 98,
      reason: "ذكر أسماء ملكية أو تاريخ يقع ضمن الفترة 1951 - 1969"
    };
  } else if (/الجماهيرية|اللجنة الشعبية العامة|ثورة الفاتح|197[0-9]|198[0-9]|199[0-9]|200[0-9]|2010/i.test(fullText)) {
    suggestedEra = {
      value: "حقبة الجمهورية والجماهيرية (1969 - 2011)",
      confidence: 96,
      reason: "ديباجة أو مسميات إدارية تعود للحقبة 1969 - 2011"
    };
  } else if (/دولة ليبيا|حكومة الوحدة|المجلس الرئاسي|201[1-9]|202[0-9]/i.test(fullText)) {
    suggestedEra = {
      value: "دولة ليبيا الحديثة (2011 - الآن)",
      confidence: 95,
      reason: "مراسلات صادرة بعد عام 2011 وفق النظام المؤسسي الحديث"
    };
  }

  // 4. Detect Department
  let suggestedDepartment: SmartTaggingAnalysisResult["suggestedDepartment"] = undefined;
  if (/جمرك|جمارك|تخليص جمركي|تعريفة جمركية/i.test(fullText)) {
    suggestedDepartment = {
      value: "مصلحة الجمارك الليبية",
      confidence: 95,
      reason: "تكرار مصطلحات التخليص والتعريفة الجمركية والمنافذ"
    };
  } else if (/ضرائب|ضريبة الدخل|جبايات|الربط الضريبي/i.test(fullText)) {
    suggestedDepartment = {
      value: "مصلحة الضرائب",
      confidence: 94,
      reason: "مستند يتضمن حسابات وعوائد الربط والتحصيل الضريبي"
    };
  } else if (/ميزانية|موازنة|تقديرات الميزانية|ابواب الصرف/i.test(fullText)) {
    suggestedDepartment = {
      value: "إدارة الميزانية العامة والتخطيط المالي",
      confidence: 93,
      reason: "وثيقة تخطيط مالي ومخصصات أبواب الميزانية"
    };
  } else if (/سندات|قرض عام|دين عام|اذونات خزانة/i.test(fullText)) {
    suggestedDepartment = {
      value: "إدارة الدين العام والالتزامات المالية",
      confidence: 92,
      reason: "إدارة وإصدار السندات والقروض العامة والالتزامات السيادية"
    };
  } else if (/املاك الدولة|عقارات الدولة|اراضي اميرية/i.test(fullText)) {
    suggestedDepartment = {
      value: "مصلحة أملاك الدولة",
      confidence: 92,
      reason: "سجلات تثبيت وإدارة الأصول العقارية العامة"
    };
  } else if (/حسابات|تدقيق|مطابقة قيود|ديوان المحاسبة/i.test(fullText)) {
    suggestedDepartment = {
      value: "إدارة الحسابات والرقابة المالية",
      confidence: 90,
      reason: "مطابقات محاسبية وتقارير رقابة دورية"
    };
  } else {
    suggestedDepartment = {
      value: "إدارة الخزانة العامة",
      confidence: 88,
      reason: "معاملات القبض والصرف وإدارة الحسابات السيادية العامة"
    };
  }

  // 5. Detect Document Type
  let suggestedDocType: SmartTaggingAnalysisResult["suggestedDocType"] = undefined;
  if (/مرسوم ملكي/i.test(fullText)) {
    suggestedDocType = {
      value: "مرسوم ملكي مالي",
      confidence: 98,
      reason: "عنوان أو ديباجة صريحة لمرسوم ملكي سامي"
    };
  } else if (/عقد امتياز|اتاوات نفط/i.test(fullText)) {
    suggestedDocType = {
      value: "عقد امتياز وإتاوات نفطية",
      confidence: 96,
      reason: "بنود امتياز نفطي وحصص وتوريد إتاوات"
    };
  } else if (/اذن صرف|إذن صرف/i.test(fullText)) {
    suggestedDocType = {
      value: "إذن صرف خزانة عامة",
      confidence: 95,
      reason: "أمر صرف مالي معتمد من الخزانة العامة"
    };
  } else if (/تخليص جمركي|اقرار جمركي|إقرار وتخليص/i.test(fullText)) {
    suggestedDocType = {
      value: "إقرار وتخليص جمركي",
      confidence: 94,
      reason: "بيان وتخليص بضائع جمركية"
    };
  } else if (/سندات خزانة|قرض عام/i.test(fullText)) {
    suggestedDocType = {
      value: "سندات خزانة وقرض عام",
      confidence: 93,
      reason: "أوراق اقتراض وأذونات دين عام"
    };
  } else if (/مرتبات|علاوات|كشف الرواتب/i.test(fullText)) {
    suggestedDocType = {
      value: "كشف مرتبات وعلاوات ديوانية",
      confidence: 92,
      reason: "جداول صرف الرواتب والبدلات الإدارية"
    };
  } else if (/قانون الميزانية|ميزانية تقديرية/i.test(fullText)) {
    suggestedDocType = {
      value: "قانون الميزانية التقديرية",
      confidence: 92,
      reason: "جداول وإقرار ميزانية تقديرية سنوية"
    };
  } else {
    suggestedDocType = {
      value: "قرار وزاري",
      confidence: 88,
      reason: "قرار تنظيمي مالي صادر عن سلطة وزارية"
    };
  }

  // 6. Extract Financial Amount if available in text
  let suggestedFinancialAmount: SmartTaggingAnalysisResult["suggestedFinancialAmount"] = undefined;
  const amountRegex = /([0-9]{1,3}(?:[,،.][0-9]{3})+|[0-9]{4,10})\s*(جنيه ليبي|دينار ليبي|مليم|درهم|L\.?D|L\.?£|دولار)/i;
  const amountMatch = amountRegex.exec(ocrText);
  if (amountMatch) {
    suggestedFinancialAmount = {
      amount: amountMatch[1].replace(/،/g, ","),
      currency: amountMatch[2],
      confidence: 91
    };
  }

  // 7. Extract Named Entities (Signatories & Laws)
  const signatories: string[] = [];
  const lawsOrDecrees: string[] = [];
  const locations: string[] = [];

  if (/إدريس|ادريس السنوسي/i.test(fullText)) signatories.push("إدريس الأول - ملك المملكة الليبية");
  if (/إسماعيل بن زكري/i.test(fullText)) signatories.push("إسماعيل بن زكري - وزير المالية والاقتصاد");
  if (/علي الساحلي/i.test(fullText)) signatories.push("علي الساحلي - رئيس الديوان الملكي");
  if (/عمر شنيب/i.test(fullText)) signatories.push("عمر شنيب - رئيس ديوان المحاسبة");
  if (/منصور الكيخيا/i.test(fullText)) signatories.push("منصور الكيخيا - وزير الخزانة");

  if (/قانون المعادن والنفط لسنة 1955/i.test(fullText)) lawsOrDecrees.push("قانون المعادن والنفط لسنة 1955");
  if (/المادة \(64\) من الدستور/i.test(fullText)) lawsOrDecrees.push("المادة (64) من الدستور الليبي");
  if (/قانون الجمارك الموحد/i.test(fullText)) lawsOrDecrees.push("قانون الجمارك الموحد");

  if (/طرابلس الغرب|قصر الخلد/i.test(fullText)) locations.push("طرابلس الغرب");
  if (/بنغازي/i.test(fullText)) locations.push("بنغازي");
  if (/حوض سرت/i.test(fullText)) locations.push("حوض سرت");
  if (/فزان/i.test(fullText)) locations.push("فزان");

  // Sort suggested keywords by confidence
  const suggestedKeywords = Array.from(detectedTagsMap.values()).sort(
    (a, b) => b.confidence - a.confidence
  );

  return {
    suggestedKeywords,
    suggestedDepartment,
    suggestedDocType,
    suggestedClassification,
    suggestedEra,
    suggestedFinancialAmount,
    extractedEntities: {
      signatories,
      lawsOrDecrees,
      locations
    },
    summaryConfidenceScore: suggestedKeywords.length > 0 ? 94 : 85
  };
}
