/* Secure, environment-aware logger */

// Secure logging utility for production and development environments

interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /password/gi,
  /token/gi,
  /secret/gi,
  /key/gi,
  /auth/gi,
  /uid/gi,
  /email/gi,
  /phone/gi,
  /address/gi,
  /credit/gi,
  /card/gi,
  /ssn/gi,
  /social/gi,
  /security/gi
];

// Redact sensitive information from data
const redactSensitiveData = (data: any): any => {
  if (typeof data === 'string') {
    let redacted = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    return redacted;
  }
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(item => redactSensitiveData(item));
    }
    
    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      const redactedKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key)) 
        ? '[REDACTED_KEY]' 
        : key;
      redacted[redactedKey] = redactSensitiveData(value);
    }
    return redacted;
  }
  
  return data;
};

// Safe stringify with sensitive data redaction
const safeStringify = (data: any): string => {
  try {
    const redactedData = redactSensitiveData(data);
    return JSON.stringify(redactedData, null, 2);
  } catch (error) {
    return '[Unable to stringify data]';
  }
};

// Logger class
class Logger {
  private static instance: Logger;
  
  private constructor() {}
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  // Debug logging - only in development
  debug(message: string, data?: any): void {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, data ? safeStringify(data) : '');
    }
  }
  
  // Info logging - both environments
  info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data ? safeStringify(data) : '');
  }
  
  // Warning logging - both environments
  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data ? safeStringify(data) : '');
  }
  
  // Error logging - both environments, but with different detail levels
  error(message: string, error?: any, context?: any): void {
    if (isProduction) {
      // In production, only log safe error information
      console.error(`[ERROR] ${message}`);
      if (error && error.message) {
        console.error(`[ERROR] Message: ${error.message}`);
      }
      if (error && error.code) {
        console.error(`[ERROR] Code: ${error.code}`);
      }
    } else {
      // In development, log full error details
      console.error(`[ERROR] ${message}`, error);
      if (context) {
        console.error(`[ERROR] Context:`, safeStringify(context));
      }
    }
  }
  
  // Critical error logging - always logged with minimal details
  critical(message: string, error?: any): void {
    console.error(`[CRITICAL] ${message}`);
    if (error && error.message) {
      console.error(`[CRITICAL] Error: ${error.message}`);
    }
  }
  
  // Performance logging
  performance(operation: string, duration: number): void {
    if (isDevelopment) {
      console.log(`[PERF] ${operation}: ${duration}ms`);
    }
  }
  
  // User action logging (without sensitive data)
  userAction(action: string, details?: any): void {
    const safeDetails = details ? redactSensitiveData(details) : undefined;
    this.info(`User Action: ${action}`, safeDetails);
  }
  
  // API call logging (without sensitive data)
  apiCall(endpoint: string, method: string, status?: number, duration?: number): void {
    const logData = {
      endpoint: endpoint.replace(/\/[^\/]+\/[^\/]+$/, '/[USER_ID]/[DOC_ID]'), // Redact user IDs
      method,
      status,
      duration: duration ? `${duration}ms` : undefined
    };
    
    if (status && status >= 400) {
      this.error(`API Call Failed`, undefined, logData);
    } else {
      this.info(`API Call`, logData);
    }
  }
  
  // Assessment logging (without personal data)
  assessment(assessmentType: string, questionCount: number, hasHealthConditions: boolean): void {
    this.info(`Assessment Completed`, {
      type: assessmentType,
      questionCount,
      hasHealthConditions,
      timestamp: new Date().toISOString()
    });
  }
  
  // Exercise completion logging (without personal data)
  exerciseCompletion(technique: string, duration: number, isPremium: boolean): void {
    this.info(`Exercise Completed`, {
      technique,
      duration: `${duration} minutes`,
      isPremium,
      timestamp: new Date().toISOString()
    });
  }
  
  // Program progress logging (without personal data)
  programProgress(programType: string, currentDay: number, totalDays: number, completedDays: number): void {
    this.info(`Program Progress`, {
      type: programType,
      currentDay,
      totalDays,
      completedDays,
      progress: `${Math.round((completedDays / totalDays) * 100)}%`,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export individual logging functions for convenience
export const logDebug = (message: string, data?: any) => logger.debug(message, data);
export const logInfo = (message: string, data?: any) => logger.info(message, data);
export const logWarn = (message: string, data?: any) => logger.warn(message, data);
export const logError = (message: string, error?: any, context?: any) => logger.error(message, error, context);
export const logCritical = (message: string, error?: any) => logger.critical(message, error);
export const logPerformance = (operation: string, duration: number) => logger.performance(operation, duration);
export const logUserAction = (action: string, details?: any) => logger.userAction(action, details);
export const logApiCall = (endpoint: string, method: string, status?: number, duration?: number) => logger.apiCall(endpoint, method, status, duration);
export const logAssessment = (assessmentType: string, questionCount: number, hasHealthConditions: boolean) => logger.assessment(assessmentType, questionCount, hasHealthConditions);
export const logExerciseCompletion = (technique: string, duration: number, isPremium: boolean) => logger.exerciseCompletion(technique, duration, isPremium);
export const logProgramProgress = (programType: string, currentDay: number, totalDays: number, completedDays: number) => logger.programProgress(programType, currentDay, totalDays, completedDays); 