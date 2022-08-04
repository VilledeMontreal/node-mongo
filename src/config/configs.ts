import { ILogger } from '@villedemontreal/logger';

/**
 * Lib configs
 */
export class Configs {
  private _loggerCreator: (name: string) => ILogger;

  /**
   * The Logger creator
   */
  get loggerCreator(): (name: string) => ILogger {
    if (!this._loggerCreator) {
      throw new Error(`The Logger Creator HAS to be set as a configuration`);
    }
    return this._loggerCreator;
  }

  /**
   * Sets the Logger creator.
   */
  public setLoggerCreator(loggerCreator: (name: string) => ILogger) {
    this._loggerCreator = loggerCreator;
  }
}

export const configs: Configs = new Configs();
