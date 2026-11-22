const EXPLICIT_SOCRATIC_REQUEST = /سقراطی|فقط\s*سؤال|فقط\s*سوال|جواب\s*نده|خودم\s*به\s*جواب|خودم\s*کشف/;
const REFLECTIVE_MESSAGE = /چرا|دلیل|اشتباه|ترس|طمع|فومو|وارد|خارج|تصمیم|فکر|احساس|تکرار|ضرر|باخت|قول|انضباط|پشیمان|جبران/;
const HIGH_DISTRESS_MESSAGE = /خودکشی|آسیب\s*به\s*خود|ناامید|معیشت|قمار|فشار\s*روانی\s*شدید|زندگی‌ام\s*تمام/;

export function isExplicitSocraticRequest(message) {
  const text = typeof message === 'string' ? message.trim() : '';
  return Boolean(text && EXPLICIT_SOCRATIC_REQUEST.test(text));
}

export function shouldUseSocraticMode(message, previousAssistantTurns = 0) {
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text || HIGH_DISTRESS_MESSAGE.test(text)) return false;
  if (isExplicitSocraticRequest(text)) return true;
  const assistantTurns = Math.max(0, Number(previousAssistantTurns) || 0);
  return assistantTurns > 0
    && (assistantTurns + 1) % 3 === 0
    && REFLECTIVE_MESSAGE.test(text);
}
