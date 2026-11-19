import { ArchivedDocument, ArabicSearchMode, SearchFilterOptions, SearchMatchResult } from "../types";

/**
 * Strips Arabic diacritics (Harakat: Tashkeel, Tanween, Shadda, Sukun, Tatweel)
 */
export function stripArabicDiacritics(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "") // Diacritics
    .replace(/\u0640/g, "");               // Tatweel (ـ)
}

/**
 * Normalizes Arabic letters (Alef variants, Taa Marbuta, Alef Maqsura, Hamzas)
 */
export function normalizeArabicText(text: string): string {
  if (!text) return "";
  let clean = stripArabicDiacritics(text).toLowerCase();

  // Normalize Alef variants [أ, إ, آ, ٱ] -> ا
  clean = clean.replace(/[أإآٱ]/g, "ا");

  // Normalize Taa Marbuta [ة] -> ه
  clean = clean.replace(/ة/g, "ه");

  // Normalize Alef Maqsura [ى] -> ي
  clean = clean.replace(/ى/g, "ي");

  // Normalize Hamza on Waw or Yaa [ؤ, ئ] -> ء
  clean = clean.replace(/[ؤئ]/g, "ء");

  return clean;
}

// Synonyms and root expansions for historical Libyan financial terminology
const LIBYAN_FINANCIAL_ROOT_MAP: Record<string, string[]> = {
  "جمارك": ["جمرك", "جمارك", "جمركية", "تخليص", "تعرفة", "رسوم", "المنافذ", "ميناء"],
  "جمرك": ["جمارك", "جمركية", "تخليص", "تعرفة", "رسوم"],
  "خزانه": ["خزينة", "الخزانة", "اموال", "مدفوعات", "ايرادات", "اذن", "صرف"],
  "خزينة": ["خزانه", "الخزانة", "اموال", "مدفوعات", "ايرادات"],
  "مرسوم": ["مراسيم", "امر", "فرمان", "قانون", "قرار", "تشريع"],
  "مراسيم": ["مرسوم", "اوامر", "قوانين", "قرارات"],
  "ميزانيه": ["موازنة", "مخصصات", "اعتمادات", "ابواب", "الانفاق"],
  "موازنه": ["ميزانية", "مخصصات", "اعتمادات", "ابواب"],
  "نفط": ["بترول", "خام", "حقول", "اتاوات", "امتياز", "سرت"],
  "بترول": ["نفط", "خام", "اتاوات", "امتياز"],
  "اتاوات": ["اتاوة", "عائدات", "ريع", "حصص", "عوائد"],
  "مرتبات": ["رواتب", "اجور", "علاوات", "مستحقات", "الرقم الوطني", "ديوانيه"],
  "رواتب": ["مرتبات", "اجور", "علاوات", "الرقم الوطني"],
  "ضرائب": ["ضريبه", "جبايات", "مكوس", "دخل", "دمغة"],
  "ضريبه": ["ضرائب", "جبايات", "مكوس", "دمغة"],
  "سندات": ["سند", "قرض", "اكتتاب", "خزانة", "فوائد", "دين"],
  "املاك": ["عقارات", "اراضي", "اصول", "حيازة", "اميريه"]
};

/**
 * Extracts expanded query tokens taking into account morphological variations
 */
export function getExpandedTokens(token: string, enableStemming: boolean): string[] {
  const norm = normalizeArabicText(token);
  if (!norm) return [];

  const tokens = new Set<string>([norm]);

  if (enableStemming) {
    // Check root map
    if (LIBYAN_FINANCIAL_ROOT_MAP[norm]) {
      LIBYAN_FINANCIAL_ROOT_MAP[norm].forEach(syn => tokens.add(normalizeArabicText(syn)));
    }

    // Strip common Arabic prefixes (الـ, بـ, لـ, كـ, فـ, وـ)
    if (norm.startsWith("ال") && norm.length > 4) {
      tokens.add(norm.slice(2));
    }
    if ((norm.startsWith("بال") || norm.startsWith("كال") || norm.startsWith("فال") || norm.startsWith("وال")) && norm.length > 5) {
      tokens.add(norm.slice(3));
      tokens.add(norm.slice(1));
    }
    if ((norm.startsWith("ل") || norm.startsWith("ب") || norm.startsWith("و")) && norm.length > 4) {
      tokens.add(norm.slice(1));
    }
  }

  return Array.from(tokens);
}

/**
 * Evaluates boolean Arabic query expressions (e.g. `جمارك و بنغازي`, `نفط أو غاز`, `ميزانية بدون رواتب`)
 */
function testBooleanMatch(
  targetNorm: string,
  queryString: string,
  enableStemming: boolean
): { matched: boolean; matchedWords: string[] } {
  // Check for NOT (بدون or ليس or -)
  let positivePart = queryString;
  let negativeWords: string[] = [];

  if (queryString.includes(" بدون ")) {
    const parts = queryString.split(" بدون ");
    positivePart = parts[0];
    negativeWords = parts.slice(1).join(" ").split(/\s+/).map(normalizeArabicText);
  } else if (queryString.includes(" ليس ")) {
    const parts = queryString.split(" ليس ");
    positivePart = parts[0];
    negativeWords = parts.slice(1).join(" ").split(/\s+/).map(normalizeArabicText);
  }

  // If any negative word is in the target, match fails
  for (const neg of negativeWords) {
    if (neg && targetNorm.includes(neg)) {
      return { matched: false, matchedWords: [] };
    }
  }

  // Check for OR (أو)
  if (positivePart.includes(" أو ") || positivePart.includes(" او ")) {
    const orClauses = positivePart.split(/\s+(?:أو|او)\s+/);
    for (const clause of orClauses) {
      const clauseTokens = clause.split(/\s+/).filter(Boolean);
      const allMatched = clauseTokens.every(tok => {
        const expanded = getExpandedTokens(tok, enableStemming);
        return expanded.some(e => targetNorm.includes(e));
      });
      if (allMatched) {
        return { matched: true, matchedWords: clauseTokens };
      }
    }
    return { matched: false, matchedWords: [] };
  }

  // Default: AND (و or spaces)
  const andTokens = positivePart
    .replace(/\s+و\s+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const matchedWords: string[] = [];
  for (const tok of andTokens) {
    const expanded = getExpandedTokens(tok, enableStemming);
    const hasMatch = expanded.some(e => targetNorm.includes(e));
    if (!hasMatch) {
      return { matched: false, matchedWords: [] };
    }
    matchedWords.push(tok);
  }

  return { matched: true, matchedWords };
}

/**
 * Extracts an excerpt of the text containing the matched search terms
 */
function extractSnippet(text: string, queryWords: string[]): string {
  if (!text) return "";
  if (!queryWords || queryWords.length === 0) {
    return text.slice(0, 180) + "...";
  }

  const normalizedText = normalizeArabicText(text);
  let bestIndex = -1;

  for (const word of queryWords) {
    const normWord = normalizeArabicText(word);
    const idx = normalizedText.indexOf(normWord);
    if (idx !== -1) {
      bestIndex = idx;
      break;
    }
  }

  if (bestIndex === -1) {
    return text.slice(0, 180) + "...";
  }

  const start = Math.max(0, bestIndex - 60);
  const end = Math.min(text.length, bestIndex + 140);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";

  return prefix + text.slice(start, end).replace(/\n+/g, " ") + suffix;
}

/**
 * Parses financial amount string into numeric value for range filtering
 */
function parseFinancialNumber(amtStr: string): number {
  if (!amtStr) return 0;
  const cleaned = amtStr.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Executes full Arabic search with multi-faceted filtering
 */
export function executeArabicSearch(
  documents: ArchivedDocument[],
  filters: SearchFilterOptions
): SearchMatchResult[] {
  const {
    query,
    searchMode,
    normalizeArabic,
    stemmingEnabled,
    era,
    department,
    docType,
    classification,
    currency,
    yearRange,
    financialRange,
    physicalCondition,
    vaultLockedOnly
  } = filters;

  const rawQuery = query.trim();

  // 1. Pre-filter by metadata facets
  const candidateDocs = documents.filter(doc => {
    if (era !== "ALL" && doc.era !== era) return false;
    if (department !== "ALL" && doc.department !== department) return false;
    if (docType !== "ALL" && doc.docType !== docType) return false;
    if (classification !== "ALL" && doc.classification !== classification) return false;
    if (currency !== "ALL" && !doc.currency.includes(currency)) return false;
    if (doc.year < yearRange[0] || doc.year > yearRange[1]) return false;
    if (physicalCondition !== "ALL" && doc.physicalCondition !== physicalCondition) return false;
    if (vaultLockedOnly && !doc.isVaultLocked && doc.classification !== "سري للغاية") return false;

    // Financial Range Filter
    if (financialRange !== "ALL") {
      const num = parseFinancialNumber(doc.financialAmount);
      if (financialRange === "under-100k" && num >= 100000) return false;
      if (financialRange === "100k-1m" && (num < 100000 || num > 1000000)) return false;
      if (financialRange === "above-1m" && num <= 1000000) return false;
    }

    return true;
  });

  // If no textual query, return all matching faceted documents
  if (!rawQuery) {
    return candidateDocs.map(doc => ({
      document: doc,
      matchScore: 100,
      matchedFields: ["جميع السجلات"],
      snippet: doc.summary,
      matchedKeywords: []
    }));
  }

  // 2. Perform Full-Text Arabic NLP Search
  const isExactPhrase = (rawQuery.startsWith('"') && rawQuery.endsWith('"')) || searchMode === "exact-phrase";
  const cleanPhrase = rawQuery.replace(/^"|"$/g, "").trim();

  const results: SearchMatchResult[] = [];

  for (const doc of candidateDocs) {
    let score = 0;
    const matchedFields: string[] = [];
    const matchedKeywords: string[] = [];

    const normTitle = normalizeArabic ? normalizeArabicText(doc.title) : doc.title.toLowerCase();
    const normRef = normalizeArabic ? normalizeArabicText(doc.refNumber) : doc.refNumber.toLowerCase();
    const normSummary = normalizeArabic ? normalizeArabicText(doc.summary) : doc.summary.toLowerCase();
    const normOCR = normalizeArabic ? normalizeArabicText(doc.ocrText) : doc.ocrText.toLowerCase();
    const normSigners = doc.signatories.map(s => normalizeArabic ? normalizeArabicText(s) : s.toLowerCase()).join(" ");
    const normStamps = doc.stampsDetected.map(s => normalizeArabic ? normalizeArabicText(s) : s.toLowerCase()).join(" ");
    const normKeywords = doc.keywords.map(k => normalizeArabic ? normalizeArabicText(k) : k.toLowerCase()).join(" ");

    const fullDocumentCorpus = `${normRef} ${normTitle} ${normSummary} ${normOCR} ${normSigners} ${normStamps} ${normKeywords}`;

    if (isExactPhrase) {
      const targetPhrase = normalizeArabic ? normalizeArabicText(cleanPhrase) : cleanPhrase.toLowerCase();
      if (fullDocumentCorpus.includes(targetPhrase)) {
        score += 80;
        if (normRef.includes(targetPhrase)) { score += 50; matchedFields.push("الرقم الإشاري"); }
        if (normTitle.includes(targetPhrase)) { score += 40; matchedFields.push("عنوان الوثيقة"); }
        if (normOCR.includes(targetPhrase)) { score += 30; matchedFields.push("نص المخطوطة (OCR)"); }
        if (normSummary.includes(targetPhrase)) { score += 20; matchedFields.push("الملخص"); }
        matchedKeywords.push(cleanPhrase);
      }
    } else if (searchMode === "boolean") {
      const boolRes = testBooleanMatch(fullDocumentCorpus, rawQuery, stemmingEnabled);
      if (boolRes.matched) {
        score += 75;
        matchedFields.push("تطابق تعبير مركب");
        matchedKeywords.push(...boolRes.matchedWords);
      }
    } else {
      // Standard multi-token search with term scoring
      const tokens = cleanPhrase.split(/\s+/).filter(Boolean);
      let tokensMatchedCount = 0;

      for (const tok of tokens) {
        const expanded = getExpandedTokens(tok, stemmingEnabled);
        let tokenMatchedInDoc = false;

        for (const exp of expanded) {
          if (normRef.includes(exp)) {
            score += 45;
            tokenMatchedInDoc = true;
            if (!matchedFields.includes("الرقم الإشاري")) matchedFields.push("الرقم الإشاري");
          }
          if (normTitle.includes(exp)) {
            score += 35;
            tokenMatchedInDoc = true;
            if (!matchedFields.includes("العنوان")) matchedFields.push("العنوان");
          }
          if (normKeywords.includes(exp)) {
            score += 25;
            tokenMatchedInDoc = true;
            if (!matchedFields.includes("الكلمات المفتاحية")) matchedFields.push("الكلمات المفتاحية");
          }
          if (normSigners.includes(exp)) {
            score += 20;
            tokenMatchedInDoc = true;
            if (!matchedFields.includes("الموقعون")) matchedFields.push("الموقعون");
          }
          if (normStamps.includes(exp)) {
            score += 20;
            tokenMatchedInDoc = true;
            if (!matchedFields.includes("الأختام")) matchedFields.push("الأختام");
          }
          if (normSummary.includes(exp)) {
            score += 18;
            tokenMatchedInDoc = true;
            if (!matchedFields.includes("الملخص")) matchedFields.push("الملخص");
          }
          if (normOCR.includes(exp)) {
            score += 15;
            tokenMatchedInDoc = true;
            if (!matchedFields.includes("نص المخطوطة (OCR)")) matchedFields.push("نص المخطوطة (OCR)");
          }

          if (tokenMatchedInDoc) {
            matchedKeywords.push(exp);
            break;
          }
        }

        if (tokenMatchedInDoc) {
          tokensMatchedCount++;
        }
      }

      // If "all-words" mode, require all tokens to match
      if (searchMode === "all-words" && tokensMatchedCount < tokens.length) {
        score = 0;
      }
    }

    if (score > 0) {
      results.push({
        document: doc,
        matchScore: Math.min(100, score),
        matchedFields: Array.from(new Set(matchedFields)),
        snippet: extractSnippet(doc.ocrText || doc.summary, matchedKeywords),
        matchedKeywords: Array.from(new Set(matchedKeywords))
      });
    }
  }

  // Sort descending by match score
  return results.sort((a, b) => b.matchScore - a.matchScore);
}
