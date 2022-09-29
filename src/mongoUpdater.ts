import { Timer, utils } from '@villedemontreal/general-utils';
import * as fs from 'fs';
import { isFunction } from 'lodash';
import * as MongoDb from 'mongodb';
import * as semver from 'semver';
import { constants as mongodbConstants } from './config/constants';
import { createLogger } from './utils/logger';

const logger = createLogger('MongoUpdater');

/**
 * Mongo updater
 * Manages the updates of the mongo schemas
 */
export interface IMongoUpdater {
  /**
   * Validates that the application has been installed.
   * This involves creating a special "appSchema" collection
   * and document to track the application version and being able
   * to update its schemas and documents...
   */
  checkInstallation(): Promise<void>;

  /**
   * Checks if the application needs update or not. Installs the updates
   * if so.
   */
  checkUpdates(): Promise<void>;

  /**
   * Locks the appSchema document.
   *
   * @returns true if the lock has been acquired succesfully
   * or false if the document was already locked.
   */
  lockAppSchemaDocument(): Promise<boolean>;

  /**
   * Unlocks the appSchema document.
   *
   * @returns true if the lock has been removed succesfully
   * or false if the document was not locked.
   */
  unlockAppSchemaDocument(): Promise<boolean>;

  /**
   * Updates the app schema version stored in mongo database
   */
  updateAppSchemaVersion(currentVersion: string, newVersion: string): Promise<void>;

  /**
   * Installs the appSchema collection.
   */
  installAppSchemaCollection(): Promise<any>;

  /**
   * Gets a list of available app schema update files.
   */
  getAppSchemaUpdateFiles(currentVersion: string, newVersion: string): Promise<string[]>;

  /**
   * Updates the app schema
   */
  applyAppSchemaUpdates(currentVersion: string, newVersion: string): Promise<any>;

  /**
   * Gets the appSchema collection
   */
  getAppSchemaCollection(): Promise<MongoDb.Collection>;

  /**
   * Gets the current version from the appSchema document.
   */
  getAppSchemaVersion(): Promise<string>;
}

export interface ISchemeInfo {
  version: string;
  lock: boolean;
  lockTimestamp: number;
}

export class MongoUpdater implements IMongoUpdater {
  constructor(
    private mongoDb: MongoDb.Db,
    /**
     * The *relative* path to the directory where the
     * update files are.
     */
    private mongoSchemaUpdatesDirPath: string,
    private lockMaxAgeSeconds: number,
    private appSchemaCollectionName: string
  ) {}

  public async installAppSchemaCollection(): Promise<any> {
    try {
      // Installing the "appSchema" collection.
      // tslint:disable-next-line: prefer-template
      logger.info(' > Installing the "' + this.appSchemaCollectionName + '" collection.');
      const collection: MongoDb.Collection = await this.mongoDb.createCollection(
        this.appSchemaCollectionName
      );

      // ==========================================
      // Makes sure only one appSchema document exists.
      // ==========================================
      await collection.createIndexes([
        {
          key: {
            name: 1,
          },
          name: 'name_1',
          unique: true,
        },
      ]);

      // ==========================================
      // Inserts the first version of the AppSchema document
      // ==========================================
      await collection.insertOne({
        name: 'singleton', // do not change!
        version: '0.0.0',
        lock: false,
        lockTimestamp: 0,
      } as ISchemeInfo);
    } catch (err) {
      // ==========================================
      // Maybe the error occured because another app
      // was also trying to create the collection?
      // ==========================================
      const maxWaitMilliseconds = 10 * 1000;
      const start = new Timer();
      while (start.getMillisecondsElapsed() < maxWaitMilliseconds) {
        await utils.sleep(1000);

        const appSchemaCollection: MongoDb.Collection = await this.getAppSchemaCollection();
        if (!appSchemaCollection) {
          continue;
        }

        const document = await appSchemaCollection.findOne({});
        if (!document) {
          continue;
        }

        // ==========================================
        // We ignore the error!
        // ==========================================
        return;
      }

      // ==========================================
      // Throws the error...
      // ==========================================
      throw err;
    }
  }

  public async updateAppSchemaVersion(currentVersion: string, newVersion: string): Promise<void> {
    const appSchemaCollection: MongoDb.Collection = await this.getAppSchemaCollection();

    await appSchemaCollection.updateOne({}, { $set: { version: newVersion } });
    // tslint:disable-next-line: prefer-template
    logger.info(
      ' > MongoDB App Schema updagred from version ' + currentVersion + ' to version ' + newVersion
    );
  }

  public async getAppSchemaUpdateFiles(
    currentAppSchemaVersion: string,
    targetAppSchemaVersion: string
  ): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(this.getAppSchemaFilesDirPath(), (err, files) => {
        if (err) {
          return reject(err);
        }

        let filesClean = files;

        try {
          filesClean = filesClean
            .filter((name) => {
              return name.match(/\.js$/) !== null;
            })
            .map((name) => {
              return name.split('.js')[0];
            })
            .filter((updateFileVersion) => {
              if (
                semver.gt(updateFileVersion, currentAppSchemaVersion) &&
                semver.lte(updateFileVersion, targetAppSchemaVersion)
              ) {
                return true;
              }
              return false;
            });
        } catch (err2) {
          return reject(err2);
        }
        return resolve(filesClean.sort(semver.compare));
      });
    });
  }

  public async applyAppSchemaUpdates(currentVersion: string, newVersion: string): Promise<void> {
    const updateFileNames: string[] = await this.getAppSchemaUpdateFiles(
      currentVersion,
      newVersion
    );
    if (updateFileNames.length > 0) {
      for (const updateFileName of updateFileNames) {
        logger.info(' > Pending app schema update: ' + updateFileName);

        // tslint:disable-next-line: prefer-template
        const updateFilePath = this.getAppSchemaFilesDirPath() + '/' + updateFileName;
        let updateFunction: (db: MongoDb.Db) => Promise<void>;
        try {
          updateFunction = require(updateFilePath).default;
        } catch (e) {
          return Promise.reject(e);
        }

        if (!isFunction(updateFunction)) {
          return Promise.reject(
            'The default export for an app schema update file must be a function! Was not for file : ' +
              updateFilePath
          );
        }

        await updateFunction(this.mongoDb);
      }
      logger.info('All app schema updates done');
    }
  }

  public async getAppSchemaCollection(): Promise<MongoDb.Collection> {
    return this.mongoDb.collection(this.appSchemaCollectionName);
  }

  public async getAppSchemaVersion(): Promise<string> {
    const appSchemaCollection: MongoDb.Collection = await this.getAppSchemaCollection();

    const documents: any[] = await appSchemaCollection.find().toArray();
    if (documents.length > 0) {
      return documents[0].version;
    }

    return '0.0.0';
  }

  /**
   * Tries to get the lock to modify Mongo's schemas.
   *
   * If a lock already exists, checks if it is too old.
   * If too old, will create a new one... This is to prevents
   * situations where a lock would have been taken by an app
   * but that app *crashed* while the lock was on. We don't want
   * suck lock to be active forever...
   *
   */
  public async lockAppSchemaDocument(): Promise<boolean> {
    const appSchemaCollection: MongoDb.Collection = await this.getAppSchemaCollection();

    let document = await appSchemaCollection.findOneAndUpdate(
      { lock: false },
      {
        $set: {
          lock: true,
          lockTimestamp: new Date().getTime(),
        },
      }
    );

    if (document.value !== null) {
      logger.info(` > Succesfully locked the ${this.appSchemaCollectionName} document`);
      return true;
    }

    const existingLock = await appSchemaCollection.findOne({ lock: true });
    if (existingLock === null) {
      // try again!
      return this.lockAppSchemaDocument();
    }

    // ==========================================
    // Checks the existing lock's timestamp
    // ==========================================
    const lockTimestamp = (existingLock as any).lockTimestamp;
    const nowTimestamp = new Date().getTime();
    const lockAgeMilliSeconds = nowTimestamp - lockTimestamp;

    // ==========================================
    // Lock is too old! We overwrite it....
    // ==========================================
    if (lockAgeMilliSeconds > this.lockMaxAgeSeconds * 1000) {
      document = await appSchemaCollection.findOneAndUpdate(
        { lockTimestamp },
        {
          $set: {
            lock: true,
            lockTimestamp: new Date().getTime(),
          },
        }
      );

      // ==========================================
      // *Just* taken by another app!
      // ==========================================
      if (document.value === null) {
        return false;
      }

      return true;
    }

    // ==========================================
    // The existing lock is still valid...
    // We can't get it.
    // ==========================================
    return false;
  }

  public async unlockAppSchemaDocument(): Promise<boolean> {
    const appSchemaCollection: MongoDb.Collection = await this.getAppSchemaCollection();

    const document = await appSchemaCollection.findOneAndUpdate(
      { lock: true },
      {
        $set: {
          lock: false,
          lockTimestamp: 0,
        },
      }
    );

    if (document.value !== null) {
      logger.info(` > Succesfully unlocked the ${this.appSchemaCollectionName} document`);
      return true;
    }

    logger.info(`> The ${this.appSchemaCollectionName} document was not locked`);
    return false;
  }

  public async checkInstallation(): Promise<void> {
    logger.info(
      `Validating that the "${this.appSchemaCollectionName}" collection required by the application has been installed.`
    );
    const collections: any[] = await this.mongoDb
      .listCollections({ name: this.appSchemaCollectionName })
      .toArray();

    if (collections.length === 0) {
      logger.info(
        ` > The "${this.appSchemaCollectionName}" collection was not found... Starting a new installation.`
      );
      await this.installAppSchemaCollection();
    } else {
      logger.info(
        ` > The "${this.appSchemaCollectionName}" collection was found. No installation required.`
      );
    }
  }

  public checkUpdates = async (): Promise<void> => {
    logger.info('Checking for db app schema updates:');

    let lockAcquired = false;
    let currentAppSchemaVersion: string | undefined;
    const targetVersion: string = this.findMongoAppSchemaTargetVersion();
    try {
      while (!lockAcquired) {
        // ==========================================
        // Checks if the appSchema version has to be
        // updated.
        // ==========================================
        currentAppSchemaVersion = await this.getAppSchemaVersion();
        if (semver.gte(currentAppSchemaVersion, targetVersion)) {
          // tslint:disable-next-line: prefer-template
          logger.info(
            ' > Current database app schema is up to date : ' + currentAppSchemaVersion + ').'
          );
          return;
        }

        // ==========================================
        // Tries to get the lock. Will do this as long
        // as the lock can't be acquired (ie : it is
        // released or is too old) or as long as the appSchema
        // version still is not up to date.
        // ==========================================
        lockAcquired = await this.lockAppSchemaDocument();
        if (!lockAcquired) {
          const wait = 1000;
          logger.warning(
            `The lock can't be acquired. The maximum age it can be before being considered ` +
              `to be too old is ${this.lockMaxAgeSeconds} seconds. Waiting for ${wait} milliseconds...`
          );
          await utils.sleep(wait);
        } else {
          logger.info(` > Lock acquired.`);
        }
      }
      if (lockAcquired && currentAppSchemaVersion) {
        logger.info(` > Applying some required updates...`);
        await this.applyAppSchemaUpdates(currentAppSchemaVersion, targetVersion);
        await this.updateAppSchemaVersion(currentAppSchemaVersion, targetVersion);
      }
    } finally {
      if (lockAcquired) {
        await this.unlockAppSchemaDocument();
      }
    }
  };

  protected getAppSchemaFilesDirPath(): string {
    return mongodbConstants.appRoot + this.mongoSchemaUpdatesDirPath;
  }

  /**
   * Finds the latest Mongo update file version.
   */
  protected findMongoAppSchemaTargetVersion(): string {
    let targetVersion = '0.0.0';

    fs.readdirSync(this.getAppSchemaFilesDirPath()).forEach((fileName) => {
      if (fileName.endsWith('.js')) {
        const version = fileName.split('.js')[0];
        if (semver.gt(version, targetVersion)) {
          targetVersion = version;
        }
      }
    });

    return targetVersion;
  }
}
