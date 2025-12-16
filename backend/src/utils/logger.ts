/**
 * Simple structured logger for agentic decision tracing
 * Logs each layer's input/output for debuggability
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  layer: string;
  message: string;
  data?: unknown;
}

class Logger {
  private logs: LogEntry[] = [];

  private log(level: LogLevel, layer: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      layer,
      message,
      data,
    };
    this.logs.push(entry);

    const prefix = `[${entry.timestamp}] [${level}] [${layer}]`;
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';

    switch (level) {
      case 'DEBUG':
        console.debug(`${prefix} ${message}${dataStr}`);
        break;
      case 'INFO':
        console.info(`${prefix} ${message}${dataStr}`);
        break;
      case 'WARN':
        console.warn(`${prefix} ${message}${dataStr}`);
        break;
      case 'ERROR':
        console.error(`${prefix} ${message}${dataStr}`);
        break;
    }
  }

  debug(layer: string, message: string, data?: unknown): void {
    this.log('DEBUG', layer, message, data);
  }

  info(layer: string, message: string, data?: unknown): void {
    this.log('INFO', layer, message, data);
  }

  warn(layer: string, message: string, data?: unknown): void {
    this.log('WARN', layer, message, data);
  }

  error(layer: string, message: string, data?: unknown): void {
    this.log('ERROR', layer, message, data);
  }

  // Get all logs for debugging
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Clear logs
  clear(): void {
    this.logs = [];
  }

  // Layer-specific convenience methods
  classifier(message: string, data?: unknown): void {
    this.info('LAYER-0:CLASSIFIER', message, data);
  }

  context(message: string, data?: unknown): void {
    this.info('LAYER-1:CONTEXT', message, data);
  }

  webSearch(message: string, data?: unknown): void {
    this.info('LAYER-2:WEB_SEARCH', message, data);
  }

  recommender(message: string, data?: unknown): void {
    this.info('LAYER-3:RECOMMENDER', message, data);
  }

  validator(message: string, data?: unknown): void {
    this.info('LAYER-4:VALIDATOR', message, data);
  }
}

// Singleton instance
export const logger = new Logger();
