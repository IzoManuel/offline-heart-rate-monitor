export function speechSupported(environment = globalThis) {
  return Boolean(environment?.speechSynthesis && typeof environment?.SpeechSynthesisUtterance === 'function');
}

export function speakText(text, environment = globalThis) {
  if (!speechSupported(environment) || !text) return false;
  const synthesis = environment.speechSynthesis;
  synthesis.cancel();
  synthesis.resume?.();
  const utterance = new environment.SpeechSynthesisUtterance(text);
  synthesis.speak(utterance);
  return true;
}
