// Web Speech API voice input with live transcript and multilingual support.
export class VoiceInput {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = !!SR;
    this.recognition = null;
    this.listening = false;
    this.onTranscript = null;
    this.onStateChange = null;
    this.onError = null;
    this._finalText = "";

    if (this.supported) {
      this.recognition = new SR();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = ""; // empty => browser default; we auto-detect via user language

      this.recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            this._finalText += res[0].transcript + " ";
          } else {
            interim += res[0].transcript;
          }
        }
        const full = (this._finalText + interim).trim();
        if (this.onTranscript) this.onTranscript(full);
      };

      this.recognition.onerror = (event) => {
        this.listening = false;
        if (this.onStateChange) this.onStateChange(false);
        const map = {
          "not-allowed": "Microphone permission denied. Please allow mic access.",
          "service-not-allowed": "Speech service unavailable in this browser.",
          "no-speech": "No speech detected. Try again.",
          "audio-capture": "No microphone found.",
        };
        const msg = map[event.error] || `Voice error: ${event.error}`;
        if (this.onError) this.onError(msg);
      };

      this.recognition.onend = () => {
        if (this.listening) {
          // Auto-restart while still in listening mode (continuous capture).
          try {
            this.recognition.start();
          } catch {
            this.listening = false;
            if (this.onStateChange) this.onStateChange(false);
          }
        } else if (this.onStateChange) {
          this.onStateChange(false);
        }
      };
    }
  }

  start(lang) {
    if (!this.supported) {
      if (this.onError) this.onError("Voice input is not supported in this browser.");
      return;
    }
    if (this.listening) return;
    this._finalText = "";
    if (lang) this.recognition.lang = lang;
    try {
      this.recognition.start();
      this.listening = true;
      if (this.onStateChange) this.onStateChange(true);
    } catch (err) {
      if (this.onError) this.onError("Could not start microphone.");
    }
  }

  stop() {
    if (!this.supported || !this.listening) return;
    this.listening = false;
    try {
      this.recognition.stop();
    } catch {
      /* ignore */
    }
    if (this.onStateChange) this.onStateChange(false);
  }

  toggle(lang) {
    if (this.listening) this.stop();
    else this.start(lang);
  }
}
