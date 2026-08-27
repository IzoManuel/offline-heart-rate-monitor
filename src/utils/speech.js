export function speechSupported(environment = globalThis) {
  return Boolean(environment?.speechSynthesis && typeof environment?.SpeechSynthesisUtterance === 'function');
}

export function speakText(text, environment = globalThis) {
  if (!speechSupported(environment) || !text) return false;
  const synthesis = environment.speechSynthesis;
  const voices = synthesis.getVoices?.() || [];
  synthesis.cancel();
  synthesis.resume?.();
  const utterance = new environment.SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.voice = voices.find(voice => voice.lang?.toLowerCase().startsWith('en')) || voices[0] || null;
  synthesis.speak(utterance);
  return true;
}

export function speechVoiceCount(environment = globalThis) {
  return speechSupported(environment) ? (environment.speechSynthesis.getVoices?.() || []).length : 0;
}
