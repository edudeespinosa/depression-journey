const CRISIS_PATTERNS = [
  /\bsuicid/i,
  /\bself.?harm\b/i,
  /kill\s+(my)?self/i,
  /end\s+(my\s+)?life/i,
  /want\s+to\s+die/i,
  /don'?t\s+want\s+to\s+(be\s+|keep\s+)?liv/i,
  /no\s+(longer\s+want|reason)\s+to\s+liv/i,
  /\bhurt\s+(my)?self/i,
  /\bcutting\s+(my)?self/i,
  /\boverdose\b/i,
  /ending\s+it\s+(all)?/i,
  /take\s+my\s+(own\s+)?life/i,
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

export const CRISIS_NOTICE: Record<string, string> = {
  en: "If you're having thoughts of suicide or self-harm, please reach out right now:\n📞 988 Suicide & Crisis Lifeline — call or text 988 (US, 24/7)\n💬 Crisis Text Line — text HOME to 741741\nYou don't have to face this alone.\n\n---\n\n",
  es: "Si estás teniendo pensamientos de suicidio o autolesión, comunícate ahora mismo:\n📞 988 Suicide & Crisis Lifeline — llama o envía un mensaje al 988 (EE.UU., 24/7)\n💬 Crisis Text Line — envía HOME al 741741\nNo tienes que enfrentarlo solo/a.\n\n---\n\n",
};

export const CRISIS_SYSTEM_RULE = `
SAFETY REQUIREMENT (mandatory — overrides all other instructions about length or format):
If the user expresses suicidal ideation, intent to self-harm, a wish to die, or describes a mental health emergency, you MUST:
1. Acknowledge their pain with warmth and without judgment
2. Include these crisis resources clearly in your response: "988 Suicide & Crisis Lifeline (call or text 988, 24/7 in the US) | Crisis Text Line (text HOME to 741741)"
3. Gently encourage them to reach out to a mental health professional or someone they trust
Do NOT omit crisis resources if any crisis signal is present.`;
