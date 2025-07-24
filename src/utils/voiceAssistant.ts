import * as Speech from 'expo-speech';

export interface VoiceSettings {
  language: 'tr-TR' | 'en-US';
  pitch: number;
  rate: number;
  voice: 'male' | 'female';
}

export class VoiceAssistant {
  private settings: VoiceSettings;
  private isEnabled: boolean = true;

  constructor(settings: VoiceSettings = {
    language: 'tr-TR',
    pitch: 0.1,  // Erkek sesi için çok düşük ton
    rate: 1.1,   // Biraz hızlandırılmış konuşma
    voice: 'male'
  }) {
    this.settings = settings;
  }

  speakBreathingCommand(command: string) {
    if (!this.isEnabled) return;
    Speech.stop();
    
    const commands: Record<string, string> = {
      'inhale': 'Nefes alın',
      'hold': 'Nefesinizi tutun',
      'exhale': 'Nefes verin',
      'start': 'Egzersiz başlıyor',
      'complete': 'Egzersiz tamamlandı',
      'cycle': 'Döngü tamamlandı',
      'relax': 'Rahatlayın ve sakinleşin',
      'focus': 'Odaklanın ve nefesinize konsantre olun',
      'deep': 'Derin nefes alın',
      'slow': 'Yavaş ve kontrollü nefes alın',
      'right-nostril': 'Sağ burun deliğinden nefes alın',
      'left-nostril': 'Sol burun deliğinden nefes alın',
      'alternate': 'Alternatif burun nefesi yapın'
    };
    
    const text = commands[command] || command;
    Speech.speak(text, {
      language: this.settings.language,
      pitch: this.settings.pitch,
      rate: this.settings.rate
    });
  }

  speakMotivation() {
    if (!this.isEnabled) return;
    const motivations = [
      'Harika gidiyorsun!',
      'Mükemmel nefes alıyorsun',
      'Çok iyi odaklanıyorsun',
      'Sakinleşmeye devam et',
      'Nefesin gücünü hissediyor musun?',
      'Kendini rahat hisset',
      'Her nefesle daha da sakinleşiyorsun',
      'Odaklanmaya devam et',
      'Bu harika bir egzersiz',
      'Kendini yenilenmiş hissediyor musun?'
    ];
    const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
    Speech.speak(randomMotivation, {
      language: this.settings.language,
      pitch: this.settings.pitch,
      rate: this.settings.rate
    });
  }

  speakExerciseStart(techniqueName: string) {
    if (!this.isEnabled) return;
    Speech.stop();
    const message = `${techniqueName} egzersizi başlıyor. Rahat bir pozisyon alın ve nefesinize odaklanın.`;
    Speech.speak(message, {
      language: this.settings.language,
      pitch: this.settings.pitch,
      rate: this.settings.rate
    });
  }

  speakExerciseComplete() {
    if (!this.isEnabled) return;
    
    // Önce mevcut sesi durdur
    Speech.stop();
    
    // Daha uzun bekleme süresi
    setTimeout(() => {
      // Rastgele motivasyon cümlesi
      const motivations = [
        'Harika gidiyorsun!',
        'Mükemmel nefes alıyorsun',
        'Çok iyi odaklanıyorsun',
        'Sakinleşmeye devam et',
        'Nefesin gücünü hissediyor musun?',
        'Kendini rahat hisset',
        'Her nefesle daha da sakinleşiyorsun',
        'Odaklanmaya devam et',
        'Bu harika bir egzersiz',
        'Kendini yenilenmiş hissediyor musun?'
      ];
      const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
      
      const message = `Döngü tamamlandı. ${randomMotivation}`;
      Speech.speak(message, {
        language: this.settings.language,
        pitch: this.settings.pitch,
        rate: this.settings.rate
      });
    }, 500);
  }

  speakCycleInfo(currentCycle: number, totalCycles: number) {
    if (!this.isEnabled) return;
    Speech.stop();
    const message = `Döngü ${currentCycle} tamamlandı. ${totalCycles - currentCycle} döngü kaldı.`;
    Speech.speak(message, {
      language: this.settings.language,
      pitch: this.settings.pitch,
      rate: this.settings.rate
    });
  }

  speakCountdown(seconds: number) {
    if (!this.isEnabled) return;
    Speech.stop();
    const countdownText = seconds.toString();
    Speech.speak(countdownText, {
      language: this.settings.language,
      pitch: this.settings.pitch,
      rate: 0.9
    });
  }

  toggleVoiceAssistant() {
    this.isEnabled = !this.isEnabled;
    const status = this.isEnabled ? 'açık' : 'kapalı';
    Speech.speak(`Sesli asistan ${status}`, {
      language: this.settings.language,
      pitch: this.settings.pitch,
      rate: this.settings.rate
    });
  }

  updateSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  stop() {
    Speech.stop();
  }

  isVoiceEnabled(): boolean {
    return this.isEnabled;
  }
}

export const voiceAssistant = new VoiceAssistant();
export const speakCommand = (command: string) => voiceAssistant.speakBreathingCommand(command);
export const speakMotivation = () => voiceAssistant.speakMotivation();
export const speakStart = (technique?: string) => {
  if (technique) {
    voiceAssistant.speakExerciseStart(technique);
  } else {
    voiceAssistant.speakBreathingCommand('start');
  }
};
export const speakComplete = () => voiceAssistant.speakExerciseComplete();
export const speakCycle = (current: number, total: number) => voiceAssistant.speakCycleInfo(current, total);
export const speakCountdown = (seconds: number) => voiceAssistant.speakCountdown(seconds);
export const toggleVoice = () => voiceAssistant.toggleVoiceAssistant();
export const stopVoice = () => voiceAssistant.stop(); 