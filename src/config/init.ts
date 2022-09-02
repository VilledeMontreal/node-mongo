import { ILogger } from '@villedemontreal/logger';
import { configs } from './configs';

let libIsInitialized = false;
/**
 * Inits the library.
 */
export function init(loggerCreator: (name: string) => ILogger): void {
  if (!loggerCreator) {
    throw new Error(`The Logger Creator is required.`);
  }

  configs.setLoggerCreator(loggerCreator);

  libIsInitialized = true;
}

/**
 * checks if the library has been initialized.
 */
export function isInited(): boolean {
  return libIsInitialized;
}
