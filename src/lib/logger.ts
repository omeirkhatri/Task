/**
 * Centralized logging utility
 * 
 * In development: logs to console
 * In production: only errors are logged, others are suppressed
 * Future: Can be extended to send errors to error tracking service (e.g., Sentry)
 */

const isDevelopment = import.meta.env.DEV;

type LogLevel = "log" | "warn" | "error" | "debug";

interface LogOptions {
  /**
   * Whether to always log, even in production
   * Useful for critical errors that need to be visible
   */
  always?: boolean;
  /**
   * Additional context to include in the log
   */
  context?: string;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const prefix = options?.context ? `[${options.context}]` : "";
    return prefix ? `${prefix} ${message}` : message;
  }

  /**
   * Log informational messages (only in development)
   */
  log(message: string, ...args: unknown[]): void {
    if (isDevelopment) {
      console.log(this.formatMessage("log", message), ...args);
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, ...args: unknown[]): void {
    if (isDevelopment) {
      console.debug(this.formatMessage("debug", message), ...args);
    }
  }

  /**
   * Log warning messages (only in development)
   */
  warn(message: string, ...args: unknown[]): void {
    if (isDevelopment) {
      console.warn(this.formatMessage("warn", message), ...args);
    }
  }

  /**
   * Log error messages (always logged, even in production)
   * In production, these should be sent to an error tracking service
   */
  error(message: string, error?: unknown, options?: LogOptions): void {
    const formattedMessage = this.formatMessage("error", message, options);
    
    if (error instanceof Error) {
      console.error(formattedMessage, error);
      // TODO: In production, send to error tracking service (e.g., Sentry)
      // if (!isDevelopment) {
      //   errorTrackingService.captureException(error, { extra: { message } });
      // }
    } else if (error !== undefined) {
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }
  }
}

export const logger = new Logger();

