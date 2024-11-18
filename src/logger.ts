export type ILoggerMetadata = Record<string, unknown>;

export interface ILogger {
  info?(method: string, message: string, metadata?: ILoggerMetadata): void;
  error?(method: string, err: Error | string, metadata?: ILoggerMetadata): void;
}
