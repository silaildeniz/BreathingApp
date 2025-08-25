// Local dosyalar için preloading'e gerek yok, sadece onLoad handler kullanılacak
// Image.prefetch() sadece URL'ler için çalışır, local require() dosyaları için değil

export const preloadMainBackground = async (): Promise<boolean> => {
  return true; // Local dosyalar için hemen true döndür
};

export const preloadSleepBackground = async (): Promise<boolean> => {
  return true; // Local dosyalar için hemen true döndür
}; 