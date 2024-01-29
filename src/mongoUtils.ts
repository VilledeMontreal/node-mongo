// ==========================================
// Mongo utilities
// ==========================================
import {
  ApiErrorAndInfo,
  createError,
  createInvalidParameterError,
  createNotFoundError,
  createServerError,
  globalConstants,
  IApiError,
  utils,
} from '@villedemontreal/general-utils';
import { LogLevel } from '@villedemontreal/logger';
import * as fs from 'fs-extra';
import * as HttpStatusCodes from 'http-status-codes';
import * as _ from 'lodash';
import * as mocha from 'mocha';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server-core';
import * as mongoose from 'mongoose';
import { constants } from './config/constants';

/**
 * Mongo utilities
 */
export class MongoUtils {
  private mongoMemServer: MongoMemoryServer | MongoMemoryReplSet;
  private useReplSet = false;

  private mockgosseMockedFlag = 'mocked';

  /**
   * Mocks the Mongo databases created through Mongoose.
   *
   * IMPORTANT!!
   * For the "mochaInstance" parameter to be the proper
   * one, this function must be called from a *regular function* in a
   * test file, not from an *arrow function*! For more informations,
   * see : https://github.com/mochajs/mocha/issues/2018
   *
   * Note that, currently, once this mocking is in place,
   * it can't be removed. You should only call this function
   * during testing!
   *
   * If Mongoose is already mocked, the function does nothing.
   *
   * @param mocha from a Mocha test file, pass "this" as the value
   * for this parameter or "null" from elsewhere.
   *
   * @param mongoServerVersion the Mongo version to use.
   * Pass null (or undefined) to use the default version
   * downloaded by mongodb-memory-server.
   */
  public async mockMongoose(
    mochaInstance: mocha.Context,
    mongoServerVersion: string,
    useReplSet = false,
  ): Promise<MongoMemoryServer | MongoMemoryReplSet> {
    // ==========================================
    // We only mock the database if it's
    // not already so.
    // ==========================================
    if (!this.mongoMemServer) {
      // this.useReplSet = useReplSet;
      // ==========================================
      // Path to download the mocked Mongo server to.
      // We make sure this folder is wihtin the application
      // so when the application is mounted in a Docker
      // container, the server will not be downloaded
      // over and over.
      // ==========================================
      const downloadDirPath = constants.appRoot + '/temp/mockServer';
      if (!fs.existsSync(downloadDirPath)) {
        fs.mkdirsSync(downloadDirPath);
      }

      // ==========================================
      // Data directory
      // ==========================================
      const dataRootPath = downloadDirPath + '/data';
      if (!fs.existsSync(dataRootPath)) {
        fs.mkdirsSync(dataRootPath);
      } else {
        await utils.clearDir(dataRootPath);
      }
      const dataPath = `${dataRootPath}/${Date.now()}`;
      fs.mkdirsSync(dataPath);

      // ==========================================
      // Increases the Mocha timeout to allow more time to
      // download the test server, if required.
      // ==========================================
      if (mochaInstance) {
        if (!mochaInstance.timeout || !_.isFunction(mochaInstance.timeout)) {
          throw new Error(
            `The "mocha" parameter passed to the "mockMongoose(...)" method ` +
              `doesn't seems to be of the correct type. Make sure the function in which you ` +
              `call "mockMongoose(...)" is itself a *regular* function, not an *arrow* function. ` +
              `Have a look at https://github.com/mochajs/mocha/issues/2018 for more infos.`,
          );
        }

        mochaInstance.timeout(120000);
      }

      // Voir https://www.npmjs.com/package/mongodb-memory-server pour les options
      const memoryServerOption: any = {
        instance: {
          dbPath: dataPath, // by default create in temp directory,
        },

        binary: {
          version: mongoServerVersion ? mongoServerVersion : 'latest', // by default 'latest'
          downloadDir: downloadDirPath, // by default node_modules/.cache/mongodb-memory-server/mongodb-binaries
        },
        debug: false,
      };

      if (useReplSet) {
        const replSetOptions: any = {
          ...memoryServerOption,
          replSet: { count: 3 },
        };
        this.mongoMemServer = await MongoMemoryReplSet.create(replSetOptions);
      } else {
        // Create mock
        this.mongoMemServer = await MongoMemoryServer.create(memoryServerOption);
      }
    }
    return this.mongoMemServer;
  }

  /**
   * Drop all mocked Mongo databases.
   *
   */
  public async dropMockedDatabases(): Promise<void> {
    if (this.mongoMemServer) {
      await mongoose.disconnect();
      await this.mongoMemServer.stop();
      this.mongoMemServer = null;
    }
  }

  public async getMockedServerPort(): Promise<number> {
    const mongooseConnection = mongoose[this.mockgosseMockedFlag];
    if (mongooseConnection && this.mongoMemServer && !this.useReplSet) {
      return (this.mongoMemServer as MongoMemoryServer).instanceInfo.port;
    }
    if (mongooseConnection && this.mongoMemServer && this.useReplSet) {
      const servers = (this.mongoMemServer as MongoMemoryReplSet).servers;
      let port = null;
      for (const serv of servers) {
        if (serv.instanceInfo.instance.isInstancePrimary) {
          port = serv.instanceInfo.port;
          break;
        }
      }
      return port;
    }

    return null;
  }

  /**
   * Validates if an object is a Mongoose
   * error.
   */
  public isMongooseError(obj: any): boolean {
    if (_.isEmpty(obj)) {
      return false;
    }

    if (_.isEmpty(obj.errors) && 'kind' in obj && 'path' in obj && 'message' in obj) {
      return true;
    }

    Object.keys(obj.errors).forEach((errorKey) => {
      const errorObject = obj.errors[errorKey];

      if (!('kind' in errorObject) || !('path' in errorObject) || !('message' in errorObject)) {
        return false;
      }
      return true;
    });
    return true;
  }

  /**
   * Validates if an object is a plain
   * Mongo error.
   */
  public isPlainMongoError(errorObject: any): boolean {
    if (_.isEmpty(errorObject)) {
      return false;
    }

    if (
      !('code' in errorObject) ||
      !('name' in errorObject) ||
      !('errmsg' in errorObject) ||
      !('message' in errorObject)
    ) {
      return false;
    }
    return true;
  }

  /**
   * Creates an Api eror from an error thrown
   * by Mongoose.
   *
   * If the specified error is not a Mongo/Mongoose error, it
   * will be returned as is.
   *
   * @param error the Mongo/Mongoose error object
   * @param publicMessage a public message to be used in the
   * generated error. Fopr example : "The user is invalid".
   */
  public convertMongoOrMongooseErrorToApiError(
    err: any,
    publicMessage: string,
  ): ApiErrorAndInfo | any {
    if (!err) {
      return createServerError('Empty error object');
    }

    let errClean = err;

    // ==========================================
    // Plain Mongo error
    // ==========================================
    if (this.isPlainMongoError(errClean)) {
      // ==========================================
      // Duplicate key error?
      // We create an error with a "Conflit" http status
      // code.
      // ==========================================
      if (errClean.code === constants.mongo.mongoErrorCodes.DUPLICATE_KEY) {
        return createError(
          globalConstants.errors.apiGeneralErrors.codes.DUPLICATE_KEY,
          publicMessage,
        )
          .httpStatus(HttpStatusCodes.CONFLICT)
          .publicMessage(publicMessage)
          .logLevel(LogLevel.INFO)
          .logStackTrace(false)
          .build();
      }

      // ==========================================
      // Unmanaged Mongo error, we return it as is.
      // ==========================================
      return errClean;
    }
    if (this.isMongooseError(errClean)) {
      // ==========================================
      // Mongoose error
      // ==========================================
      if (_.isEmpty(errClean.errors)) {
        // ==========================================
        // Invalid id
        // ==========================================
        if (
          errClean.kind === constants.mongo.mongoose.errorKinds.OBJECT_ID &&
          errClean.name === constants.mongo.mongoose.errorNames.CAST_ERROR
        ) {
          throw createNotFoundError('Invalid ObjectId id', publicMessage);
        } else {
          const error = errClean;
          errClean = {
            errors: [error],
          };
        }
      }

      let errorDetails: IApiError[];
      if (errClean.errors && !_.isEmpty(errClean.errors)) {
        errorDetails = [];
        Object.keys(errClean.errors).forEach((errorKey) => {
          const errorMessage = errClean.errors[errorKey];

          const errorDetail: IApiError = {
            code: errorMessage.kind,
            target: errorMessage.path,
            message: errorMessage.message,
          };
          errorDetails.push(errorDetail);
        });
      }
      throw createInvalidParameterError(publicMessage, errorDetails);
    } else {
      // ==========================================
      // Not a Mongo or Mongoose error, we return it
      // as is.
      // ==========================================
      return errClean;
    }
  }

  /**
   * Converts a Mongoose Document to a plain Pojo.
   */
  public convertMongooseDocumentToPlainObject<T>(document: T & mongoose.Document): T {
    if (!document) {
      return document;
    }

    const pojo: T = document.toObject() as T;

    // ==========================================
    // Converts the "_id" property to "id"
    // ==========================================
    // tslint:disable-next-line:no-string-literal
    pojo['id'] = pojo['_id'].toString();
    // tslint:disable-next-line:no-string-literal
    delete pojo['_id'];

    // ==========================================
    // Removes the "__v"
    // ==========================================
    // tslint:disable-next-line:no-string-literal
    delete pojo['__v'];

    return pojo;
  }
}
export const mongoUtils: MongoUtils = new MongoUtils();
