export interface SecurityScanResult {
  isSafe: boolean;
  riskScore: number;
  threatsDetected: string[];
}

const INJECTION_PATTERNS = [
  /ignore\s+all\s+previous\s+instructions/i,
  /glem\s+alle\s+tidligere\s+instrukser/i,
  /system\s+prompt\s+override/i,
  /you\s+are\s+now\s+a/i,
  /reveal\s+your\s+instructions/i,
  /vis\s+dine\s+instruktioner/i,
  /act\s+as\s+root/i,
];

export function scanForPromptInjection(inputText: string): SecurityScanResult {
  const threats: string[] = [];
  let score = 0;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(inputText)) {
      threats.push(`Detekterede injection mønster: "${pattern.source}"`);
      score += 35;
    }
  }

  if ((inputText.match(/<script>/gi) || []).length > 0) {
    threats.push("Detekterede HTML/Script tags (Mulig XSS)");
    score += 50;
  }

  return {
    isSafe: score < 50,
    riskScore: Math.min(score, 100),
    threatsDetected: threats,
  };
}
