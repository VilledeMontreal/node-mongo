import { configs } from '../config/configs';
import { getTestingLoggerCreator } from '../utils/logger';

/**
 * Call this when your need to set
 * *Testing* configurations to the current
 * library, without the need for a calling code
 * to do so.
 *
 */
export function setTestingConfigurations(): void {
  configs.setLoggerCreator(getTestingLoggerCreator());
}
