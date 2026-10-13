export interface AnonymizationResult {
  sanitizedText: string;
  redactedCount: number;
  detectedTypes: string[];
}

export function anonymizeDocumentText(text: string): AnonymizationResult {
  let sanitized = text;
  let count = 0;
  const detectedTypes: Set<string> = new Set();

  const cprRegex = /\b(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])\d{2}[- ]?\d{4}\b/g;
  if (cprRegex.test(sanitized)) {
    detectedTypes.add("CPR-nummer");
    sanitized = sanitized.replace(cprRegex, () => {
      count++;
      return "[REDACTED_CPR]";
    });
  }

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(sanitized)) {
    detectedTypes.add("E-mailadresse");
    sanitized = sanitized.replace(emailRegex, () => {
      count++;
      return "[REDACTED_EMAIL]";
    });
  }

  const phoneRegex = /(?:\+45\s?)?(?:\d{2}\s?){4}/g;
  if (phoneRegex.test(sanitized)) {
    detectedTypes.add("Telefonnummer");
    sanitized = sanitized.replace(phoneRegex, () => {
      count++;
      return "[REDACTED_PHONE]";
    });
  }

  return {
    sanitizedText: sanitized,
    redactedCount: count,
    detectedTypes: Array.from(detectedTypes),
  };
}
