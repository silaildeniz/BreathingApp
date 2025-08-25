import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

let currentSound: Audio.Sound | null = null;

const commandToFile: Record<string, number> = {
  'inhale': require('../../assets/sounds/inhale.mp3'),
  'exhale': require('../../assets/sounds/exhale.mp3'),
  'hold': require('../../assets/sounds/hold.mp3'),
  'inhale_left': require('../../assets/sounds/inhale_left.mp3'),
  'inhale_right': require('../../assets/sounds/inhale_right.mp3'),
  'exhale_left': require('../../assets/sounds/exhale_left.mp3'),
  'exhale_right': require('../../assets/sounds/exhale_right.mp3'),
  'start': require('../../assets/sounds/start.mp3'),
  'finish': require('../../assets/sounds/finish.mp3'),
  'cycle_complete': require('../../assets/sounds/cycle_complete.mp3'),
  'cool': require('../../assets/sounds/cool.mp3'),
  'motivation1': require('../../assets/sounds/motivation1.mp3'),
  'motivation2': require('../../assets/sounds/motivation2.mp3'),
  'motivation3': require('../../assets/sounds/motivation3.mp3'),
  'motivation4': require('../../assets/sounds/motivation4.mp3'),
  'motivation5': require('../../assets/sounds/motivation5.mp3'),
  'motivation7': require('../../assets/sounds/motivation7.mp3'),
  'motivation8': require('../../assets/sounds/motivation8.mp3'),
  'motivation10': require('../../assets/sounds/motivation10.mp3'),
};

export async function stopVoice() {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    } catch (e) {
      // Hata olursa sessiz geç
    }
  }
}

export async function playVoiceCommand(command: string) {
  try {
    const soundPref = await AsyncStorage.getItem('sound_enabled');
    if (soundPref === 'false') return;
    // Önceki sesi durdur
    await stopVoice();
    
    const file = commandToFile[command];
    if (typeof file === 'undefined') return;
    const { sound } = await Audio.Sound.createAsync(file as unknown as number);
    currentSound = sound;
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        currentSound = null;
      }
    });
  } catch (e) {
    // Hata olursa sessiz geç
  }
}

const availableMotivations = [
  'motivation1',
  'motivation2',
  'motivation3',
  'motivation4',
  'motivation5',
  'motivation7',
  'motivation8',
  'motivation10',
];

export async function playRandomMotivation() {
  const soundPref = await AsyncStorage.getItem('sound_enabled');
  if (soundPref === 'false') return;
  const random = availableMotivations[Math.floor(Math.random() * availableMotivations.length)];
  await playVoiceCommand(random);
} 