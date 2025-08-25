import { Alert, AlertButton } from 'react-native';
import { logError, logWarn, logInfo } from './logger';
import { analyzeNetworkError, NetworkErrorInfo } from './networkUtils';
import { retryWithBackoff } from './networkUtils';

export interface ErrorAction {
  title: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface ErrorConfig {
  title?: string;
  message?: string;
  actions?: ErrorAction[];
  showAlert?: boolean;
  logError?: boolean;
  retryable?: boolean;
  fallback?: () => Promise<any>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly context: any;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    userMessage?: string,
    retryable: boolean = false,
    context?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage || message;
    this.retryable = retryable;
    this.context = context;
  }
}

// Error handler sınıfı
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCount: Map<string, number> = new Map();
  private readonly maxErrorsPerMinute = 5;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Ana error handling fonksiyonu
  async handleError(
    error: any,
    context: string,
    config: ErrorConfig = {}
  ): Promise<void> {
    const errorInfo = this.analyzeError(error);
    const errorKey = `${context}:${errorInfo.errorType}`;
    
    // Error rate limiting
    if (this.shouldThrottleError(errorKey)) {
      logWarn('Error throttled due to rate limiting', { errorKey, context });
      return;
    }

    // Error logging
    if (config.logError !== false) {
      this.logError(error, context, errorInfo);
    }

    // Network error handling
    if (errorInfo.isNetworkError) {
      await this.handleNetworkError(error, context, config);
      return;
    }

    // App error handling
    if (error instanceof AppError) {
      await this.handleAppError(error, context, config);
      return;
    }

    // Generic error handling
    await this.handleGenericError(error, context, config);
  }

  // Error analizi
  private analyzeError(error: any): NetworkErrorInfo {
    if (error instanceof AppError) {
      return {
        isNetworkError: false,
        errorType: 'unknown',
        retryable: error.retryable,
        userMessage: error.userMessage
      };
    }

    return analyzeNetworkError(error);
  }

  // Network error handling
  private async handleNetworkError(
    error: any,
    context: string,
    config: ErrorConfig
  ): Promise<void> {
    const errorInfo = analyzeNetworkError(error);
    
    if (config.retryable && errorInfo.retryable) {
      await this.handleRetryableError(error, context, config);
    } else {
      await this.showErrorAlert({
        title: config.title || 'Bağlantı Hatası',
        message: config.message || errorInfo.userMessage,
        actions: config.actions || [
          { title: 'Tamam', onPress: () => {} }
        ]
      });
    }
  }

  // App error handling
  private async handleAppError(
    error: AppError,
    context: string,
    config: ErrorConfig
  ): Promise<void> {
    if (error.retryable && config.retryable) {
      await this.handleRetryableError(error, context, config);
    } else {
      await this.showErrorAlert({
        title: config.title || 'Hata',
        message: config.message || error.userMessage,
        actions: config.actions || [
          { title: 'Tamam', onPress: () => {} }
        ]
      });
    }
  }

  // Generic error handling
  private async handleGenericError(
    error: any,
    context: string,
    config: ErrorConfig
  ): Promise<void> {
    const message = config.message || 
      (error?.message || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    
    await this.showErrorAlert({
      title: config.title || 'Hata',
      message,
      actions: config.actions || [
        { title: 'Tamam', onPress: () => {} }
      ]
    });
  }

  // Retryable error handling
  private async handleRetryableError(
    error: any,
    context: string,
    config: ErrorConfig
  ): Promise<void> {
    const retryAction = async () => {
      try {
        if (config.fallback) {
          await retryWithBackoff(config.fallback, 3, 1000);
        }
      } catch (retryError) {
        logError('Retry failed', { context, retryError });
        await this.showErrorAlert({
          title: 'Tekrar Deneme Başarısız',
          message: 'İşlem tekrar denendi ancak başarısız oldu.',
          actions: [
            { title: 'Tamam', onPress: () => {} }
          ]
        });
      }
    };

    await this.showErrorAlert({
      title: config.title || 'Bağlantı Hatası',
      message: config.message || 'İşlem başarısız oldu. Tekrar denemek ister misiniz?',
      actions: [
        { title: 'Tekrar Dene', onPress: retryAction },
        { title: 'İptal', onPress: () => {}, style: 'cancel' }
      ]
    });
  }

  // Error alert gösterme
  private async showErrorAlert(config: {
    title: string;
    message: string;
    actions: ErrorAction[];
  }): Promise<void> {
    const alertButtons: AlertButton[] = config.actions.map(action => ({
      text: action.title,
      onPress: action.onPress,
      style: action.style || 'default'
    }));

    Alert.alert(config.title, config.message, alertButtons);
  }

  // Error logging
  private logError(error: any, context: string, errorInfo: NetworkErrorInfo): void {
    const logData = {
      context,
      errorType: errorInfo.errorType,
      retryable: errorInfo.retryable,
      userMessage: errorInfo.userMessage,
      originalError: error
    };

    if (errorInfo.isNetworkError) {
      logWarn('Network error occurred', logData);
    } else {
      logError('Application error occurred', logData);
    }
  }

  // Error rate limiting
  private shouldThrottleError(errorKey: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Eski hataları temizle
    this.errorCount.forEach((timestamp, key) => {
      if (timestamp < oneMinuteAgo) {
        this.errorCount.delete(key);
      }
    });

    // Mevcut hata sayısını kontrol et
    const currentCount = this.errorCount.get(errorKey) || 0;
    if (currentCount >= this.maxErrorsPerMinute) {
      return true;
    }

    // Hata sayısını artır
    this.errorCount.set(errorKey, now);
    return false;
  }

  // Async operation wrapper
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    config: ErrorConfig = {}
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      await ErrorHandler.getInstance().handleError(error, context, config);
      return null;
    }
  }

  // Retry wrapper
  static async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3,
    config: ErrorConfig = {}
  ): Promise<T | null> {
    try {
      return await retryWithBackoff(operation, maxRetries, 1000);
    } catch (error) {
      await ErrorHandler.getInstance().handleError(error, context, {
        ...config,
        retryable: false // Retry zaten denendi
      });
      return null;
    }
  }
}

// Convenience functions
export const handleError = (error: any, context: string, config?: ErrorConfig) => 
  ErrorHandler.getInstance().handleError(error, context, config);

export const withErrorHandling = <T>(
  operation: () => Promise<T>,
  context: string,
  config?: ErrorConfig
) => ErrorHandler.withErrorHandling(operation, context, config);

export const withRetry = <T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries?: number,
  config?: ErrorConfig
) => ErrorHandler.withRetry(operation, context, maxRetries, config); 