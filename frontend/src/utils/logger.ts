// Production-safe logging utility
export const logger = {
  debug: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.log(`🔍 [DEBUG] ${message}`, data);
    }
  },
  
  info: (message: string, data?: unknown) => {
    console.log(`ℹ️ [INFO] ${message}`, data);
  },
  
  warn: (message: string, data?: unknown) => {
    console.warn(`⚠️ [WARN] ${message}`, data);
  },
  
  error: (message: string, error?: unknown) => {
    console.error(`❌ [ERROR] ${message}`, error);
    
    // In production, you might want to send errors to a logging service
    if (!import.meta.env.DEV && error instanceof Error) {
      // Example: Send to error tracking service
      // errorTrackingService.captureException(error, { extra: { message } });
    }
  },
  
  group: (label: string) => {
    if (import.meta.env.DEV) {
      console.group(label);
    }
  },
  
  groupEnd: () => {
    if (import.meta.env.DEV) {
      console.groupEnd();
    }
  },
  
  employeeError: (context: string, userId: string, error: unknown, additionalData?: unknown) => {
    const errorMessage = `Employee data error in ${context} for user_id: ${userId}`;
    console.error(errorMessage, {
      error,
      userId,
      context,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
    
    // Track employee-specific errors separately
    if (!import.meta.env.DEV) {
      // In production, send to monitoring service with specific tags
      // errorTrackingService.captureException(error, {
      //   tags: { category: 'employee_data', context },
      //   extra: { userId, additionalData }
      // });
    }
  }
};

export default logger;
