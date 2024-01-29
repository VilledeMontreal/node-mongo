import { utils } from '@villedemontreal/general-utils';
import * as _ from 'lodash';
import { createLogger } from '../utils/logger';
import { constants } from './constants';

const logger = createLogger('mongooseConfigs');

export interface IMongooseConfigs {
  /**
   * The updater.mongoSchemaUpdatesDirPath
   * is a required config.
   */
  updater?: {
    /**
     * Name of the app schema collection name to use.
     * Useful when multiple components use the same database.
     */
    appSchemaCollectionName?: string;
    /**
     * The path where to find update files.
     */
    mongoSchemaUpdatesDirPath: string;

    lockMaxAgeSeconds?: number;
  };

  /**
   * @param applyUpdates Should the database be checked for missing
   * updates and have them applied if required?
   * Defaults to true.
   */
  applyUpdates?: boolean;

  /**
   * If no connectionString is provided, "mock" will be
   * used by default and a temporary Mongo server will
   * be used.
   */
  connectionString?: string;

  /**
   * The Mongoose connection options.
   */
  connectionOptions?: any;

  mockServer?: {
    /**
     *  @param mongoServerVersion the Mongo version to use.
     *
     * Pass null (or undefined) to use the default version
     * downloaded by mockServer.
     */
    serverVersion?: string;
  };
}

/**
 * Mongoose configs with default values.
 */
export class MongooseConfigs implements IMongooseConfigs {
  /**
   * @param applyUpdates Should the database be checked for missing
   * updates and have them applied if required?
   */
  public applyUpdates = true;

  /**
   * If no connectionString is provided, "mock" will be
   * used by default and a temporary Mongo server will
   * be used.
   */
  public connectionString = 'mock';

  public connectionOptions: any = {
    w: 1,
    wtimeout: 5000,
    auto_reconnect: true,
    reconnectTries: 604800,
    reconnectInterval: 1000,
    useNewUrlParser: true,
  };

  public updater: {
    lockMaxAgeSeconds: number;
    mongoSchemaUpdatesDirPath: string;
    appSchemaCollectionName: string;
  } = {
    appSchemaCollectionName: constants.mongo.collectionNames.APP_SCHEMA,
    lockMaxAgeSeconds: 60,

    /**
     * The path *relative* to the app root, of the directory
     * where the update files are.
     * Required!
     */
    mongoSchemaUpdatesDirPath: null,
  };

  public mockServer: { serverVersion: string } = {
    serverVersion: '5.0.8',
  };

  /**
   * Overrides default configurations using the ones passed
   * as parameters.
   */
  // tslint:disable-next-line:cyclomatic-complexity
  constructor(overridingConfigs: IMongooseConfigs) {
    // ==========================================
    // Required configs
    // ==========================================

    if (
      _.isNil(overridingConfigs) ||
      _.isNil(overridingConfigs.updater) ||
      utils.isBlank(overridingConfigs.updater.mongoSchemaUpdatesDirPath)
    ) {
      throw new Error(`The updater.mongoSchemaUpdatesDirPath config is required!`);
    }
    this.updater.mongoSchemaUpdatesDirPath = overridingConfigs.updater.mongoSchemaUpdatesDirPath;

    // ==========================================
    // Not required...
    // ==========================================

    if (!_.isNil(overridingConfigs.updater.lockMaxAgeSeconds)) {
      if (!utils.isIntegerValue(overridingConfigs.updater.lockMaxAgeSeconds, true, false)) {
        throw new Error(
          `The updater.lockMaxAgeSeconds config is not valid : ${overridingConfigs.updater.lockMaxAgeSeconds}`,
        );
      }
      this.updater.lockMaxAgeSeconds = Number(overridingConfigs.updater.lockMaxAgeSeconds);
    }

    if (!_.isNil(overridingConfigs.updater.appSchemaCollectionName)) {
      if (
        !_.isString(overridingConfigs.updater.appSchemaCollectionName) ||
        utils.isBlank(overridingConfigs.updater.appSchemaCollectionName)
      ) {
        throw new Error(
          `The appSchemaCollectionName config is not valid : ${overridingConfigs.updater.appSchemaCollectionName}`,
        );
      }
      this.updater.appSchemaCollectionName = overridingConfigs.updater.appSchemaCollectionName;
    }

    if (!_.isNil(overridingConfigs.applyUpdates)) {
      if (!_.isBoolean(overridingConfigs.applyUpdates)) {
        throw new Error(
          `The applyUpdates config must be a boolean: ${overridingConfigs.applyUpdates}`,
        );
      }
      this.applyUpdates = overridingConfigs.applyUpdates;
    }

    if (!_.isNil(overridingConfigs.connectionString)) {
      if (
        !_.isString(overridingConfigs.connectionString) ||
        utils.isBlank(overridingConfigs.connectionString)
      ) {
        throw new Error(
          `The connectionString config is not valid : ${overridingConfigs.connectionString}`,
        );
      }
      this.connectionString = overridingConfigs.connectionString;
    } else {
      logger.warning(
        `No "connectionString" config was provided: a *mocked* Mongo server will be used!`,
      );
    }

    if (!_.isNil(overridingConfigs.connectionOptions)) {
      if (!_.isObject(overridingConfigs.connectionOptions)) {
        throw new Error(
          `The connectionOptions config is not valid : ${overridingConfigs.connectionString}`,
        );
      }
      this.connectionOptions = overridingConfigs.connectionOptions;
    }

    if (
      !_.isNil(overridingConfigs.mockServer) &&
      !_.isNil(overridingConfigs.mockServer.serverVersion)
    ) {
      if (
        !_.isString(overridingConfigs.mockServer.serverVersion) ||
        utils.isBlank(overridingConfigs.mockServer.serverVersion)
      ) {
        throw new Error(
          `The mockServer.serverVersion config is not valid : ${overridingConfigs.mockServer.serverVersion}`,
        );
      }
      this.mockServer.serverVersion = overridingConfigs.mockServer.serverVersion;
    }
  }
}
