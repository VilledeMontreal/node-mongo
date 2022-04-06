// ==========================================
// Application constants
// ==========================================
import { path as appRoot } from 'app-root-path';
import * as path from 'path';
import { IMongooseConfigs } from './mongooseConfigs';

/**
 * Library constants
 */
export class Constants {
  /**
   * The library root. When this library is used
   * as a dependency in a project, the "libRoot"
   * will be the path to the dependency folder,
   * inside the "node_modules".
   */
  public libRoot: string;

  /**
   * The app root. When this library is used
   * as a dependency in a project, the "appRoot"
   * will be the path to the root project!
   */
  public appRoot: string;

  constructor() {
    // From the "dist/src/config" folder
    this.libRoot = path.normalize(__dirname + '/../../..');
    this.appRoot = appRoot;
  }

  /**
   * Base config to 'mock' a mongo server
   */
  get testsConfig(): IMongooseConfigs {
    return {
      applyUpdates: false,
      connectionString: 'mock',
      connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      },
      updater: {
        lockMaxAgeSeconds: 30,
        mongoSchemaUpdatesDirPath: '/dist/tests/testingMongoUpdates',
        appSchemaCollectionName: 'testAppSchema'
      },
      mockServer: {
        serverVersion: '4.0.16'
      }
    };
  }

  /**
   * Mongo constants
   */
  get mongo() {
    return {
      testing: {
        /**
         * The "connectionString" to use for a mock
         * Mongo server to be used instead of a real one.
         * This option is only available on the "development"
         * environment, or when tests are ran.
         */
        MOCK_CONNECTION_STRING: 'mock'
      },
      /**
       * The names of the Mongo collections used in
       * this application.
       */
      collectionNames: {
        /**
         * Special collection that stores informations about the
         * schema currently installed for the application.
         */
        APP_SCHEMA: 'appSchema'
      },
      /**
       * Mongo error codes
       */
      mongoErrorCodes: {
        /**
         * The code for a Mongo "duplicate key" error.
         */
        DUPLICATE_KEY: 11000
      },

      /**
       * Mongoose constants
       */
      mongoose: {
        /**
         *  Mongoose error codes
         */
        errorCodes: {
          /**
           * The code for a Mongoose "required" error.
           */
          REQUIRED_FIELD: 'required'
        },

        /**
         *  Mongoose error kinds
         */
        errorKinds: {
          OBJECT_ID: 'ObjectId'
        },

        /**
         *  Mongoose error names
         */
        errorNames: {
          CAST_ERROR: 'CastError'
        }
      }
    };
  }
}

export let constants: Constants = new Constants();
