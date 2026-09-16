/**
 * Content Guardrails & Free-Tier Quota Enforcers
 * Implements anti-spam heuristics, word count validation, image upload standards,
 * and comprehensive Tagalog/Filipino + English profanity detection with
 * leet-speak normalization.
 */

// Maximum image size: 2 MB strictly
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2,097,152 bytes
export const MIN_DESCRIPTION_CHARACTERS = 200;
export const MAX_DESCRIPTION_CHARACTERS = 15000;
export const MAX_DESCRIPTION_WORDS = 2500;
export const MIN_COMMENT_LENGTH = 10;
export const MAX_COMMENT_LENGTH = 1500;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// ─────────────────────────────────────────────────────────────
// LOW-EFFORT FILLER PHRASES
// ─────────────────────────────────────────────────────────────

// Unnecessary / low-effort filler phrases that don't constitute constructive developer feedback
const LOW_EFFORT_PHRASES = [
  /^nice$/i,
  /^cool$/i,
  /^good$/i,
  /^ok$/i,
  /^okay$/i,
  /^first$/i,
  /^first comment$/i,
  /^awesome$/i,
  /^wow$/i,
  /^test$/i,
  /^testing$/i,
  /^check out my$/i,
  /^follow me$/i,
  /^hi$/i,
  /^hello$/i,
  /^cool project$/i,
  /^nice project$/i,
  /^good job$/i,
  /^great work$/i,
  // Tagalog low-effort
  /^aye?s+$/i,
  /^ayos$/i,
  /^sige$/i,
  /^ge$/i,
  /^oks?$/i,
  /^lodi$/i,
  /^idol$/i,
  /^ang galing$/i,
  /^galing$/i,
  /^naks$/i,
  /^astig$/i,
];

// ─────────────────────────────────────────────────────────────
// SPAM PATTERNS
// ─────────────────────────────────────────────────────────────

// Spam patterns (suspicious links, crypto pump, telegram bots)
const SPAM_PATTERNS = [
  /t\.me\//i,
  /whatsapp/i,
  /free\s*crypto/i,
  /giveaway/i,
  /earn\s*\$?\d+/i,
  /bit\.ly\//i,
  /tinyurl\.com\//i,
  /discord\.gg\//i,
  /wa\.me\//i,
  /viber:\/\//i,
  /click\s+here\s+to\s+(win|earn|claim)/i,
  /send\s+(me\s+)?(dm|message|pm)/i,
  /free\s*(money|cash|gift)/i,
  /subscribe\s+to\s+my/i,
];

// Repetitive character regex: matches 4 or more identical consecutive characters (e.g. 'aaaa', 'oooooo')
const REPETITIVE_CHARS_REGEX = /(.)(\1){3,}/;

// ─────────────────────────────────────────────────────────────
// LEET-SPEAK NORMALIZER
// ─────────────────────────────────────────────────────────────

/**
 * Character substitution map for leet-speak normalization.
 * Covers common number/symbol → letter replacements used to evade filters.
 */
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "2": "z",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  "!": "i",
  "$": "s",
  "+": "t",
  "¡": "i",
  "€": "e",
  "£": "e",
};

/**
 * Normalizes text by:
 * 1. Lowercasing
 * 2. Replacing leet-speak characters with their letter equivalents
 * 3. Stripping separator characters (dots, underscores, dashes, asterisks) used to break up words
 * 4. Collapsing repeated characters (e.g. "puuuuuta" → "puta")
 *
 * This turns "p0t4ng 1n4 m0" into "potang ina mo" for accurate matching.
 */
export function normalizeLeetSpeak(text: string): string {
  let result = text.toLowerCase();

  // Replace leet characters
  result = result
    .split("")
    .map((ch) => LEET_MAP[ch] || ch)
    .join("");

  // Strip common separator characters used to evade filters
  // e.g., "p.u.t.a", "p_u_t_a", "p-u-t-a", "p*u*t*a"
  result = result.replace(/[.\-_*~`^]/g, "");

  // Collapse repeated characters: "puuuuta" → "puta", "gaaago" → "gago"
  // Keep at most 2 consecutive identical characters (some legit words double letters)
  result = result.replace(/(.)\1{2,}/g, "$1$1");

  return result;
}

// ─────────────────────────────────────────────────────────────
// PROFANITY DICTIONARIES
// ─────────────────────────────────────────────────────────────

/**
 * English profanity / abuse words to maintain professional developer community standards.
 * Extended from the original 10-word list.
 */
const ENGLISH_PROFANITY: string[] = [
  // Original list
  "idiot", "moron", "trash", "garbage dev", "scam", "shitty",
  "bitch", "asshole", "fuck", "shit",
  // Extended
  "bastard", "damn", "crap", "dick", "cock", "pussy",
  "whore", "slut", "retard", "faggot", "nigger", "nigga",
  "cunt", "motherfucker", "dumbass", "dipshit", "bullshit",
  "stfu", "gtfo", "lmfao", "wtf",
  "kill yourself", "kys",
];

/**
 * Comprehensive Tagalog/Filipino profanity dictionary.
 * These are matched AFTER leet-speak normalization, so "g4g0" becomes "gago".
 *
 * Categories:
 * - Sexual slurs and vulgar terms
 * - Personal insults and derogatory terms
 * - Compound abuse phrases
 * - Threat language
 */
const TAGALOG_PROFANITY: string[] = [
  // ── Sexual slurs ──
  "putangina",
  "putanginamo",
  "putragis",
  "puta",
  "pokpok",
  "malibog",
  "libog",
  "kantot",
  "kantotin",
  "kinantot",
  "jakol",
  "jakulero",
  "jakulera",
  "tite",
  "titi",
  "pepe",
  "puke",
  "pekpek",
  "betlog",
  "bayag",
  "tamod",
  "hindot",
  "hindutan",
  "iyot",
  "iyotin",
  "burat",
  "bolitas",
  "chupa",
  "chupahin",
  "tsupa",
  "tsupahin",
  "kupal",
  "kepyas",

  // ── Personal insults ──
  "gago",
  "gaga",
  "bobo",
  "boba",
  "tanga",
  "tangina",
  "tanginamo",
  "ulol",
  "olol",
  "ungas",
  "inutil",
  "engot",
  "gunggong",
  "tarantado",
  "siraulo",
  "hayop",
  "hayopka",
  "salot",
  "peste",
  "bruha",
  "bruhilda",
  "punyeta",
  "leche",
  "letse",
  "gagi",              // softened gago, still derogatory
  "pakyu",             // Tagalog phonetic "fuck you"
  "pakshet",           // phonetic "fuckshit"
  "demonyita",
  "demonyito",
  "demonyo",
  "satanas",
  "bwisit",
  "walanghiya",
  "walang hiya",
  "shunga",
  "tukmol",
  "kinginamo",         // shortened tangina mo

  // ── Compound abuse phrases (after normalization, spaces stripped) ──
  "tangamo",
  "ulolmo",
  "bobomo",
  "gagomo",
  "hayopmo",
  "tangina mo",
  "potang ina mo",
  "potang ina",
  "tang ina",
  "tang inamo",
  "pota",              // shortened putangina
  "potangina",
  "potanginamo",
  "putang ina",
  "putang ina mo",
  "anak ng puta",
  "anak ng pating",    // evasion for anak ng puta
  "supalpal",
  "supot",
  "bakla",             // derogatory when used as insult
  "bading",            // derogatory when used as insult
  "bayot",             // Bisaya variant, derogatory

  // ── Threats / malicious intent ──
  "papatayin",
  "patayin",
  "patay ka",
  "patay kana",
  "sasaksakin",
  "saksak",
  "saksakin",
  "susunugin",
  "sunugin",
  "bobombahin",
  "ipapapatay",
  "pupugutan",
  "puputulin",
  "sisipain",
  "sasampalin",
  "babasagin",
  "wawasakin",
  "sasabog",
];

/**
 * Regex patterns for catching spaced-out or separator-evaded profanity.
 * These match even when characters have spaces, dots, or other separators between them.
 * Applied AFTER normalization.
 */
const PROFANITY_REGEX_PATTERNS: RegExp[] = [
  // Tagalog — flexible spacing
  /p\s*u\s*t\s*a\s*n\s*g\s*i\s*n\s*a/i,
  /p\s*u\s*t\s*a/i,
  /t\s*a\s*n\s*g\s*i\s*n\s*a/i,
  /g\s*a\s*g\s*o/i,
  /g\s*a\s*g\s*a/i,
  /b\s*o\s*b\s*o/i,
  /t\s*a\s*n\s*g\s*a/i,
  /u\s*l\s*o\s*l/i,
  /k\s*a\s*n\s*t\s*o\s*t/i,
  /h\s*i\s*n\s*d\s*o\s*t/i,
  /p\s*a\s*k\s*y\s*u/i,
  /p\s*a\s*k\s*s\s*h\s*e\s*t/i,
  /p\s*u\s*n\s*y\s*e\s*t\s*a/i,

  // English — flexible spacing
  /f\s*u\s*c\s*k/i,
  /s\s*h\s*i\s*t/i,
  /a\s*s\s*s\s*h\s*o\s*l\s*e/i,
  /b\s*i\s*t\s*c\s*h/i,
];

// ─────────────────────────────────────────────────────────────
// VALIDATION FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Counts words accurately across whitespace, punctuation, and newlines
 */
export function countWords(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  return words.length;
}

export interface GuardrailValidationResult {
  isValid: boolean;
  error?: string;
  wordCount?: number;
  charCount?: number;
}

/**
 * Validates portfolio description:
 * - Optional field: If empty or whitespace only, it is valid
 * - If provided, must be at least 200 characters
 * - Must not exceed 15,000 characters
 */
export function validatePortfolioDescription(description?: string | null): GuardrailValidationResult {
  if (!description || typeof description !== "string" || !description.trim()) {
    return {
      isValid: true,
      charCount: 0,
      wordCount: 0,
    };
  }

  const trimmed = description.trim();
  const charCount = trimmed.length;
  const wordCount = countWords(trimmed);

  if (charCount < MIN_DESCRIPTION_CHARACTERS) {
    return {
      isValid: false,
      error: `Description is optional, but if provided it must be at least ${MIN_DESCRIPTION_CHARACTERS} characters. (Current: ${charCount} characters)`,
      charCount,
      wordCount,
    };
  }

  if (charCount > MAX_DESCRIPTION_CHARACTERS) {
    return {
      isValid: false,
      error: `Description exceeds maximum limit of ${MAX_DESCRIPTION_CHARACTERS} characters. (Current: ${charCount} characters)`,
      charCount,
      wordCount,
    };
  }

  return { isValid: true, charCount, wordCount };
}

/**
 * Validates single cover image upload:
 * - Size must be <= 2 MB
 * - Allowed types: JPEG, PNG, WebP
 */
export function validateImageUpload(file: { size: number; type: string; name?: string }): GuardrailValidationResult {
  if (!file) {
    return { isValid: false, error: "An image file is required." };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 2.00 MB.`,
    };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: `Invalid file format (${file.type}). Only JPG, PNG, and WebP images are permitted.`,
    };
  }

  return { isValid: true };
}

/**
 * Checks whether text contains profanity using a three-layer detection strategy:
 *
 * Layer 1: Exact normalized word match — split into words, check each against dictionaries
 * Layer 2: Substring containment — catch compound variants like "putanginamo", "gagoka"
 * Layer 3: Regex patterns — catch spaced/separator evasion like "g a g o", "p.u.t.a"
 *
 * @returns true if profanity is detected
 */
function containsProfanity(rawText: string): boolean {
  const normalized = normalizeLeetSpeak(rawText);
  const normalizedNoSpaces = normalized.replace(/\s+/g, "");

  // ── Layer 1: Exact word-level match ──
  const words = normalized.split(/\s+/);
  for (const word of words) {
    // Strip trailing punctuation for matching
    const clean = word.replace(/[.,!?;:'"()[\]{}]+$/g, "").replace(/^[.,!?;:'"()[\]{}]+/g, "");
    if (!clean) continue;

    for (const profanity of TAGALOG_PROFANITY) {
      if (clean === profanity.replace(/\s+/g, "")) return true;
    }
    for (const profanity of ENGLISH_PROFANITY) {
      if (clean === profanity.replace(/\s+/g, "")) return true;
    }
  }

  // ── Layer 2: Safe substring containment for unmistakable compound profanity ──
  // Only high-confidence terms that never legitimately appear inside innocent words
  const COMPOUND_PROFANITY_SUBSTRINGS = [
    "putangina",
    "potangina",
    "tangina",
    "tanginamo",
    "kingina",
    "kinginamo",
    "putragis",
    "tarantado",
    "siraulo",
    "punyeta",
    "pakshet",
    "pakyu",
    "motherfucker",
    "asshole",
    "dumbass",
    "dipshit",
    "bullshit",
    "kantot",
    "hindot",
    "kupal",
    "papatayin",
    "sasaksakin",
    "susunugin",
    "bobombahin",
    "jakulero",
    "jakulera",
    "walanghiya",
  ];

  for (const compound of COMPOUND_PROFANITY_SUBSTRINGS) {
    if (normalizedNoSpaces.includes(compound)) {
      return true;
    }
  }

  // Common insult + enclitic combinations without spaces (e.g. "gagoka", "bobomo", "tangaka")
  const ENCLITIC_ROOTS = ["gago", "gaga", "bobo", "boba", "tanga", "ulol", "inutil", "leche", "letse", "hayop", "salot", "ungas", "engot", "gunggong"];
  const ENCLITIC_SUFFIXES = ["ka", "mo", "ba", "nga", "kayo", "nyo", "niyo", "to", "yan"];
  for (const root of ENCLITIC_ROOTS) {
    for (const suffix of ENCLITIC_SUFFIXES) {
      if (normalizedNoSpaces.includes(root + suffix)) {
        return true;
      }
    }
  }

  // ── Layer 3: Regex patterns (catches spaced-out evasion) ──
  for (const pattern of PROFANITY_REGEX_PATTERNS) {
    if (pattern.test(rawText)) return true;
    if (pattern.test(normalized)) return true;
  }

  return false;
}

/**
 * Validates comment against low-effort, spam, repetition, and abuse guardrails.
 * Now includes comprehensive Tagalog/Filipino profanity detection with leet-speak
 * normalization to catch evasion attempts like "p0t4ng 1n4 m0".
 */
export function validateCommentContent(content: string): GuardrailValidationResult {
  if (!content || typeof content !== "string") {
    return { isValid: false, error: "Comment content cannot be empty." };
  }

  const trimmed = content.trim();

  // 1. Length check: min 10 characters
  if (trimmed.length < MIN_COMMENT_LENGTH) {
    return {
      isValid: false,
      error: `Comments must be at least ${MIN_COMMENT_LENGTH} characters to provide constructive feedback. (Current: ${trimmed.length})`,
    };
  }

  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return {
      isValid: false,
      error: `Comment exceeds maximum limit of ${MAX_COMMENT_LENGTH} characters.`,
    };
  }

  // 2. Reject low-effort 1-word filler phrases
  for (const pattern of LOW_EFFORT_PHRASES) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: "Low-effort comments (e.g. 'nice', 'cool', 'test') are not permitted. Please provide specific feedback on architecture, UI, or code quality.",
      };
    }
  }

  // 3. Reject repetitive character spam (e.g. 'aaaaaaa', 'soooooooo')
  if (REPETITIVE_CHARS_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: "Comment contains excessive repeating characters.",
    };
  }

  // 4. Reject suspicious link and promo spam
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: "Promotional links, social groups, or spam patterns are prohibited.",
      };
    }
  }

  // 5. Profanity / toxic language check — 3-layer Tagalog + English detection
  if (containsProfanity(trimmed)) {
    return {
      isValid: false,
      error: "Comment violates community guidelines. Offensive language (including Tagalog/Filipino) is not permitted. Please keep feedback respectful and constructive.",
    };
  }

  return { isValid: true };
}
