import { ILogger } from '@villedemontreal/logger';
import * as os from 'os';
import * as path from 'path';

/**
 * Lib configs
 */
export class Configs {
  public isWindows: boolean;
  public libRoot: string;
  private _loggerCreator: (name: string) => ILogger;

  constructor() {
    this.libRoot = path.normalize(__dirname + '/../../..');
    this.isWindows = os.platform() === 'win32';
  }

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
