import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Audio } from 'expo-av';
import { standardTextStyles } from '../constants/typography';
import { triggerHapticFeedback, HapticType } from '../utils/hapticFeedback';

const { width } = Dimensions.get('window');

type SleepMusicScreenNavigationProp = StackNavigationProp<any, 'SleepMusic'>;

interface MusicItem {
  id: number;
  title: string;
  image: any;
  isPlaying: boolean;
  isLooping: boolean;
}

export default function SleepMusicScreen() {
  const navigation = useNavigation<SleepMusicScreenNavigationProp>();
  
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<number | null>(null);
  const [preloadedSounds, setPreloadedSounds] = useState<{[key: number]: Audio.Sound}>({});
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  
  const musicFiles = {
    1: require('../../assets/music/rain.mp3'),
    2: require('../../assets/music/ocean.mp3'),
    3: require('../../assets/music/forest.mp3'),
    4: require('../../assets/music/cricket.mp3'),
    5: require('../../assets/music/fireplace.mp3'),
    6: require('../../assets/music/piano.mp3'),
    7: require('../../assets/music/heavyrain.mp3'),
    8: require('../../assets/music/wind.mp3'),
  };
  
  const [musicList, setMusicList] = useState<MusicItem[]>([
    { id: 1, title: 'Yağmur Sesi', image: require('../../assets/music/rain.jpg'), isPlaying: false, isLooping: true },
    { id: 2, title: 'Okyanus Dalgaları', image: require('../../assets/music/ocean.jpg'), isPlaying: false, isLooping: true },
    { id: 3, title: 'Orman Sesleri', image: require('../../assets/music/forest.jpg'), isPlaying: false, isLooping: true },
    { id: 4, title: 'Cırcır Böceği', image: require('../../assets/music/cricket.jpg'), isPlaying: false, isLooping: true },
    { id: 5, title: 'Şömine Ateşi', image: require('../../assets/music/fireplace.jpg'), isPlaying: false, isLooping: true },
    { id: 6, title: 'Piyano Melodisi', image: require('../../assets/music/piano.jpg'), isPlaying: false, isLooping: true },
    { id: 7, title: 'Sağanak Yağmur', image: require('../../assets/music/heavyrain.jpg'), isPlaying: false, isLooping: true },
    { id: 8, title: 'Rüzgar Sesi', image: require('../../assets/music/wind.jpg'), isPlaying: false, isLooping: true },
  ]);

  const preloadBackground = async () => {
    // Local dosyalar için preloading'e gerek yok, sadece onLoad handler kullanılacak
    setBackgroundLoaded(true);
  };

  const preloadSounds = async () => {
    try {
      const sounds: {[key: number]: Audio.Sound} = {};
      for (const [id, file] of Object.entries(musicFiles)) {
        const { sound } = await Audio.Sound.createAsync(file, {
          isLooping: true,
          shouldPlay: false,
        });
        sounds[Number(id)] = sound;
      }
      setPreloadedSounds(sounds);
    } catch (error) {
      console.log('Error preloading sounds:', error);
    }
  };

  const stopCurrentMusic = async () => {
    if (currentSound) {
      try {
        await currentSound.stopAsync();
      } catch (error) {
        console.log('Error stopping music:', error);
      }
      setCurrentSound(null);
    }
  };

  const handleMusicToggle = async (id: number) => {
    triggerHapticFeedback(HapticType.MEDIUM);
    
    try {
      // Eğer aynı müzik çalıyorsa, durdur
      if (currentlyPlayingId === id) {
        await stopCurrentMusic();
        setCurrentlyPlayingId(null);
        setMusicList(prevList => 
          prevList.map(music => ({
            ...music,
            isPlaying: false
          }))
        );
        return;
      }
      
      // Önceki müziği durdur ve state'i güncelle
      await stopCurrentMusic();
      setCurrentlyPlayingId(null);
      setMusicList(prevList => 
        prevList.map(music => ({
          ...music,
          isPlaying: false
        }))
      );
      
      // Yeni müziği çal (önceden yüklenmiş sesi kullan)
      const preloadedSound = preloadedSounds[id];
      if (preloadedSound) {
        await preloadedSound.playAsync();
        setCurrentSound(preloadedSound);
        setCurrentlyPlayingId(id);
        
        setMusicList(prevList => 
          prevList.map(music => ({
            ...music,
            isPlaying: music.id === id
          }))
        );
      }
    } catch (error) {
      console.log('Error playing music:', error);
    }
  };

  const handleLoopToggle = (id: number) => {
    triggerHapticFeedback(HapticType.LIGHT);
    
    setMusicList(prevList => 
      prevList.map(music => ({
        ...music,
        isLooping: music.id === id ? !music.isLooping : music.isLooping
      }))
    );
  };

  // Optimized useEffect - Consolidate all initialization and cleanup
  useEffect(() => {
    const preloadAll = async () => {
      await preloadBackground();
      await preloadSounds();
    };
    
    preloadAll();
    
    // Cleanup function - Component unmount olduğunda
    return () => {
      // Stop current music
      stopCurrentMusic();
      
      // Unload all preloaded sounds
      Object.values(preloadedSounds).forEach(async (sound) => {
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.log('Error unloading sound:', error);
        }
      });
    };
  }, []); // Empty dependency array - only run once



  return (
                 <ImageBackground 
        source={require('../../assets/backgrounds/sleep-background.jpg')} 
        style={styles.backgroundImage} 
        resizeMode="cover"
        onLoad={() => setBackgroundLoaded(true)}
      >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                 {/* Header */}
         <View style={styles.header}>
           <Text style={[styles.headerTitle, { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Gece Melodileri</Text>
         </View>

        {/* Description */}
        <Text style={[styles.description, { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>
          Sakinleştirici müziklerle rahat bir uyku deneyimi yaşayın. 
          
        </Text>

        {/* Music Grid */}
        <View style={styles.musicGrid}>
          {musicList.map((music) => (
            <View key={music.id} style={styles.musicCard}>
                             <View style={styles.musicImageContainer}>
                 <Image 
                   source={music.image}
                   style={styles.musicImage}
                   resizeMode="cover"
                 />
                
                                 {/* Play/Stop Button */}
                 <TouchableOpacity 
                   style={styles.playButton}
                   onPress={() => handleMusicToggle(music.id)}
                 >
                   <Text style={styles.playButtonText}>
                     {music.isPlaying ? '⏸️' : '▶️'}
                   </Text>
                 </TouchableOpacity>
                
                                 {/* Loop Icon */}
                 <TouchableOpacity 
                   style={[styles.loopIcon, music.isLooping && styles.loopIconActive]}
                   onPress={() => handleLoopToggle(music.id)}
                 >
                   <Text style={[styles.loopIconText, music.isLooping && styles.loopIconTextActive]}>🔁</Text>
                 </TouchableOpacity>
              </View>
              
              <Text style={[styles.musicTitle, { textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>{music.title}</Text>
            </View>
          ))}
        </View>

       
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  container: {
    flex: 1,
    paddingTop: 120,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  headerTitle: {
    ...standardTextStyles.sectionTitle,
    color: '#F5F5DC',
    fontWeight: '700',
    fontSize: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  description: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  musicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  musicCard: {
    width: (width - 60) / 2, // 2 sütun, margin dahil
    marginBottom: 20,
    alignItems: 'center',
  },
  musicImageContainer: {
    width: 160,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  musicImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  musicEmoji: {
    fontSize: 48,
  },
  playButton: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  playButtonText: {
    fontSize: 18,
    color: '#333',
  },
  loopIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loopIconActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderColor: 'rgba(76, 175, 80, 0.9)',
  },
  loopIconText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  loopIconTextActive: {
    color: '#FFFFFF',
  },
  musicTitle: {
    ...standardTextStyles.bodyMedium,
    color: '#F5F5DC',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoSection: {
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  infoTitle: {
    ...standardTextStyles.cardTitle,
    color: '#F5F5DC',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoText: {
    ...standardTextStyles.bodySmall,
    color: '#F5F5DC',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
}); 