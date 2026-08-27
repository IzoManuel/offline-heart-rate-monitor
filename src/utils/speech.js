export function speechSupported(environment = globalThis) {
  return Boolean(environment?.electronAPI?.speak) || Boolean(environment?.speechSynthesis && typeof environment?.SpeechSynthesisUtterance === 'function');
}

export function speakText(text, environment = globalThis, callbacks = {}) {
  if (!text || !speechSupported(environment)) return false;
  if (typeof environment?.electronAPI?.speak === 'function') {
    callbacks.onstart?.();
    Promise.resolve(environment.electronAPI.speak(text)).then(result => {
      if (result === false) callbacks.onerror?.({ error: 'native-tts-unavailable' });
      else callbacks.onend?.();
    }).catch(error => callbacks.onerror?.(error));
    return true;
  }
  const synthesis = environment.speechSynthesis;
  const voices = synthesis.getVoices?.() || [];
  synthesis.cancel();
  synthesis.resume?.();
  const utterance = new environment.SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  const englishVoices = voices.filter(voice => voice.lang?.toLowerCase().startsWith('en'));
  const femaleVoice = englishVoices.find(voice => /female|samantha|zira|karen|victoria|susan|hazel|moira|fiona|google uk english female|google us english female/i.test(`${voice.name} ${voice.voiceURI}`));
  utterance.voice = femaleVoice || englishVoices[0] || voices[0] || null;
  utterance.onstart = callbacks.onstart;
  utterance.onend = callbacks.onend;
  utterance.onerror = callbacks.onerror;
  synthesis.speak(utterance);
  return true;
}

export function speechVoiceCount(environment = globalThis) {
  if (typeof environment?.electronAPI?.speak === 'function') return 1;
  return speechSupported(environment) ? (environment.speechSynthesis.getVoices?.() || []).length : 0;
}

export function speechDiagnostics(environment = globalThis) {
  if (typeof environment?.electronAPI?.speak === 'function') return { supported: true, voices: 1, speaking: false, pending: false, paused: false, voiceNames: ['Linux native female TTS'] };
  if (!speechSupported(environment)) return { supported: false, voices: 0, speaking: false, pending: false, paused: false, voiceNames: [] };
  const synthesis = environment.speechSynthesis;
  const voices = synthesis.getVoices?.() || [];
  return { supported: true, voices: voices.length, speaking: Boolean(synthesis.speaking), pending: Boolean(synthesis.pending), paused: Boolean(synthesis.paused), voiceNames: voices.map(voice => `${voice.name} (${voice.lang})`) };
}
