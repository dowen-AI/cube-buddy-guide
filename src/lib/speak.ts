// Read an instruction out loud with the browser's own voice. Does nothing on
// browsers without speech support.
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export const speak = (text: string) => {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/—/g, ', '));
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    // some browsers block speech until the first tap: the Listen button still works after one
  }
};

export const stopSpeaking = () => {
  if (canSpeak()) try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
};
