/**
 * Content Guardrails & Free-Tier Quota Enforcers
 * Implements anti-spam heuristics, word count validation, and image upload standards.
 */

// Maximum image size: 2 MB strictly
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2,097,152 bytes
export const MIN_DESCRIPTION_CHARACTERS = 200;
export const MAX_DESCRIPTION_CHARACTERS = 15000;
export const MIN_DESCRIPTION_WORDS = 200;
export const MAX_DESCRIPTION_WORDS = 2500;
export const MIN_COMMENT_LENGTH = 10;
export const MAX_COMMENT_LENGTH = 1500;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

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
];

// Spam patterns (suspicious links, crypto pump, telegram bots)
const SPAM_PATTERNS = [
  /t\.me\//i,
  /whatsapp/i,
  /free\s*crypto/i,
  /giveaway/i,
  /earn\s*\$?\d+/i,
  /bit\.ly\//i,
  /tinyurl\.com\//i,
];

// Repetitive character regex: matches 4 or more identical consecutive characters (e.g. 'aaaa', 'oooooo')
const REPETITIVE_CHARS_REGEX = /(.)\1{3,}/;

// Generic profanity / abuse words to maintain professional developer community standards
const PROFANITY_LIST = [
  "idiot", "moron", "trash", "garbage dev", "scam", "shitty", "bitch", "asshole", "fuck", "shit"
];

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
 * Validates comment against low-effort, spam, repetition, and abuse guardrails
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

  // 5. Profanity / toxic language check
  const lower = trimmed.toLowerCase();
  for (const word of PROFANITY_LIST) {
    if (lower.includes(word)) {
      return {
        isValid: false,
        error: "Comment violates community guidelines. Please keep feedback respectful and constructive.",
      };
    }
  }

  return { isValid: true };
}
