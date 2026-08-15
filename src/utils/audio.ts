// Web Speech API and Text-to-Speech utility for CHAT GPR

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis is not supported in this browser.");
    return false;
  }

  // Stop any ongoing speech
  stopSpeaking();

  // Strip markdown formatting for cleaner speech
  const cleanedText = text
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#~]/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "Math formula.")
    .replace(/\$([^$]+)\$/g, "$1")
    .trim();

  if (!cleanedText) return false;

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  currentUtterance = utterance;

  // Detect language
  const hasKhmer = /[\u1780-\u17FF]/.test(cleanedText);
  
  const voices = window.speechSynthesis.getVoices();
  if (hasKhmer) {
    utterance.lang = "km-KH";
    const khVoice = voices.find((v) => v.lang.startsWith("km"));
    if (khVoice) utterance.voice = khVoice;
  } else {
    utterance.lang = "en-US";
    const enVoice = voices.find((v) => v.lang.startsWith("en") && v.name.includes("Natural")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (enVoice) utterance.voice = enVoice;
  }

  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };

  utterance.onerror = (e) => {
    console.error("TTS error:", e);
    currentUtterance = null;
    onError?.();
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return window.speechSynthesis.speaking;
}
