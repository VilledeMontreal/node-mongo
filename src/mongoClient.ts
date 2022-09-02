import { defaultsDeep } from 'lodash';
import * as mongoose from 'mongoose';
import { constants } from './config/constants';
import { IMongooseConfigs, MongooseConfigs } from './config/mongooseConfigs';
import { IMongoUpdater, MongoUpdater } from './mongoUpdater';
import { mongoUtils } from './mongoUtils';
import { createLogger } from './utils/logger';

const logger = createLogger('mongoClient');

let mongooseConnection: mongoose.Connection;

async function doInitMongoose(
  mongooseConfigClean: MongooseConfigs,
  resolve: (value: mongoose.Connection) => void,
  reject: (reason?: any) => void
): Promise<void> {
  let connectionString = mongooseConfigClean.connectionString;

  // ==========================================
  // Mocked Mongo server?
  // ==========================================
  if (connectionString === constants.mongo.testing.MOCK_CONNECTION_STRING) {
    // ==========================================
    // Mock!
    // ==========================================
    const mongoServer = await mongoUtils.mockMongoose(
      null,
      mongooseConfigClean.mockServer.serverVersion
    );

    connectionString = mongoServer.getUri();
  }

  if (mongooseConnection) {
    await mongooseConnection.close();
    mongooseConnection = undefined;
  }

  // Updates Promise for mongoose, avoid warning log emit by mongoose
  (mongoose as any).Promise = global.Promise;
  const mongoOptions: mongoose.ConnectionOptions = defaultsDeep(
    mongooseConfigClean.connectionOptions,
    {
      promiseLibrary: global.Promise,
    }
  );

  // Creates the connection
  mongooseConnection = mongoose.createConnection(connectionString, mongoOptions);

  // Triggered if an error occured
  mongooseConnection.on('error', (err: any) => {
    mongooseConnection = null;
    reject(`Mongo Database: Error connecting to Mongo: ${err}`);
  });

  // Triggered when the connection is made.
  mongooseConnection.on('connected', () => {
    (async () => {
      // Check for schema updates once the connexion is made
      if (mongooseConfigClean.applyUpdates) {
        try {
          await checkForUpdates(mongooseConfigClean);
        } catch (err) {
          try {
            await mongooseConnection.close();
            mongooseConnection = undefined;
          } catch (err) {
            logger.warning(`Error closing connection to Mongo : ${err}`);
          }

          reject(`Error updating Mongo: ${err}`);
          return;
        }
      } else {
        logger.info(`Mongo updates skipped`);
      }

      // All good!
      resolve(mongooseConnection);
    })().catch((err) => {
      reject(err);
    });
  });
}

/**
 * This is the entry point to use this library to manage your
 * Mongoose connections.
 *
 * It *must* be called when the application starts, before any
 * connection is made to Mongo.
 *
 * @returns the Mongoose connection to Mongo.
 */
export async function initMongoose(mongooseConfig: IMongooseConfigs): Promise<mongoose.Connection> {
  // ==========================================
  // Uses the MongooseConfigs to make sure unspecified
  // configs have a default value.
  // ==========================================
  const mongooseConfigClean = new MongooseConfigs(mongooseConfig);

  return new Promise<mongoose.Connection>((resolve, reject) => {
    doInitMongoose(mongooseConfigClean, resolve, reject).catch((err) => {
      reject(`Error initializing Mongo: ${err}`);
    });
  });
}

/**
 * Uses the MongoUpdater to validate if updates are required
 * to run the application on the target Mongo database.
 */
async function checkForUpdates(mongooseConfig: IMongooseConfigs): Promise<void> {
  const connection = getMongooseConnection();
  const updater: IMongoUpdater = new MongoUpdater(
    connection.db,
    mongooseConfig.updater.mongoSchemaUpdatesDirPath,
    mongooseConfig.updater.lockMaxAgeSeconds,
    mongooseConfig.updater.appSchemaCollectionName
  );
  await updater.checkInstallation();
  await updater.checkUpdates();
}

/**
 * Returns the Mongoose connection.
 *
 * Will throw an error if Mongo haass not been initialized
 * using the "initMongo()" function.
 */
export function getMongooseConnection() {
  if (!mongooseConnection) {
    throw new Error("Mongo is not initialized! Please call the 'initMongo()' method first...");
  }

  return mongooseConnection;
}
