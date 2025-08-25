import { logInfo, logWarn, logError } from './logger';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  lastChecked: string;
}

export interface NetworkErrorInfo {
  isNetworkError: boolean;
  errorType: 'network' | 'firebase' | 'timeout' | 'unknown';
  retryable: boolean;
  userMessage: string;
}

// Network hatası mı kontrol et - geliştirilmiş versiyon
export const analyzeNetworkError = (error: any): NetworkErrorInfo => {
  if (!error) {
    return {
      isNetworkError: false,
      errorType: 'unknown',
      retryable: false,
      userMessage: 'Bilinmeyen hata'
    };
  }
  
  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  const lowerMessage = errorMessage.toLowerCase();
  
  // Firebase/Firestore hataları
  if (lowerMessage.includes('firebase') || lowerMessage.includes('firestore') || 
      errorCode.includes('firebase') || errorCode.includes('firestore')) {
    return {
      isNetworkError: true,
      errorType: 'firebase',
      retryable: true,
      userMessage: 'Sunucu bağlantı sorunu. Lütfen tekrar deneyin.'
    };
  }
  
  // Network timeout hataları
  if (lowerMessage.includes('timeout') || errorCode.includes('timeout')) {
    return {
      isNetworkError: true,
      errorType: 'timeout',
      retryable: true,
      userMessage: 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.'
    };
  }
  
  // Genel network hataları
  const networkKeywords = [
    'network', 'connection', 'offline', 'no internet', 
    'fetch failed', 'network request failed', 'unreachable'
  ];
  
  if (networkKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return {
      isNetworkError: true,
      errorType: 'network',
      retryable: true,
      userMessage: 'İnternet bağlantısı yok. Çevrimdışı moda geçiliyor.'
    };
  }
  
  // Diğer hatalar
  return {
    isNetworkError: false,
    errorType: 'unknown',
    retryable: false,
    userMessage: 'Bir hata oluştu. Lütfen tekrar deneyin.'
  };
};

// Basit network durumu kontrolü - geliştirilmiş
export const checkNetworkStatus = async (): Promise<NetworkStatus> => {
  try {
    const startTime = Date.now();
    
    // Timeout ile fetch testi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout
    
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    logInfo('Network check successful', { responseTime });
    
    return {
      isConnected: true,
      isInternetReachable: true,
      type: responseTime < 1000 ? 'fast' : 'slow',
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    const errorInfo = analyzeNetworkError(error);
    logWarn('Network check failed', { error: errorInfo });
    
    return {
      isConnected: false,
      isInternetReachable: false,
      type: null,
      lastChecked: new Date().toISOString()
    };
  }
};

// Retry mekanizması
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorInfo = analyzeNetworkError(error);
      
      if (!errorInfo.retryable || attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      logWarn(`Retry attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms`, { error: errorInfo });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}; 