/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class GameAudio {
  private context: AudioContext | null = null;
  private bgm: HTMLAudioElement | null = null;

  private init() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playBGM() {
    if (!this.bgm) {
      this.bgm = new Audio('bgm.mp3');
      this.bgm.loop = true;
      this.bgm.volume = 0.4;
      this.bgm.onerror = (e) => console.error("BGM failed to load:", e);
    }
    this.bgm.play().catch(e => console.log("BGM play prevented by browser policy. Interaction needed.", e));
  }

  stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }
  }

  playPass() {
    this.init();
    if (!this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.1);
  }

  playCrash() {
    this.init();
    if (!this.context) return;
    
    const now = this.context.currentTime;
    
    const playNote = (freq: number, startOffset: number, duration: number, volume: number = 0.1) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      
      gain.gain.setValueAtTime(volume, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      
      osc.connect(gain);
      gain.connect(this.context!.destination);
      
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    // Synthesized sad "fail" melody (descending)
    playNote(220, 0, 0.4, 0.15);    // A3
    playNote(207.65, 0.4, 0.4, 0.15); // G#3
    playNote(196, 0.8, 0.4, 0.15);    // G3
    playNote(185, 1.2, 1.0, 0.15);    // Gb3 (Extended sad end)
    
    // Sub-bass impact
    const subOsc = this.context.createOscillator();
    const subGain = this.context.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.linearRampToValueAtTime(0, now + 0.5);
    subOsc.connect(subGain);
    subGain.connect(this.context.destination);
    subOsc.start();
    subOsc.stop(now + 0.5);
  }

  playJump() {
    this.init();
    if (!this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.05, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.05);
  }
}

export const gameAudio = new GameAudio();
