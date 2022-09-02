// Ok for test files :
// tslint:disable:max-func-body-length
// tslint:disable:no-string-literal

import { Timer } from '@villedemontreal/general-utils';
import { assert } from 'chai';
import * as MongoDb from 'mongodb';
import * as sinon from 'sinon';
import { constants as mongodbConstants } from './config/constants';
import { IMongooseConfigs } from './config/mongooseConfigs';
import { initMongoose } from './mongoClient';
import { IMongoUpdater, MongoUpdater } from './mongoUpdater';
import { mongoUtils } from './mongoUtils';
import { setTestingConfigurations } from './utils/testingConfigurations';

let mongoDb: MongoDb.Db;
let mongoUpdater: IMongoUpdater;

setTestingConfigurations();

// ==========================================
// Mongo Updater
// ==========================================
describe('Mongo Updater', () => {
  // A regular function is *required* to get the proper
  // "this" value for "MongoUtils.mockMongoose(...)"
  const testconfig: IMongooseConfigs = mongodbConstants.testsConfig;

  before(async function () {
    // Makes sure Mongoose is mocked, but not in Jenkins as we will start a dedicated mongodb container.
    await mongoUtils.mockMongoose(this, testconfig.mockServer.serverVersion);
    const connection = await initMongoose(testconfig);

    assert.isOk(connection);
    mongoDb = connection.db;

    // Creates the Updater directly.
    mongoUpdater = new MongoUpdater(
      mongoDb,
      testconfig.updater.mongoSchemaUpdatesDirPath,
      testconfig.updater.lockMaxAgeSeconds,
      testconfig.updater.appSchemaCollectionName
    );
  });

  after(async () => {
    // ==========================================
    // Drops the mocked databases
    // ==========================================
    await mongoDb.dropDatabase();
  });

  describe('getSchemaVersion', () => {
    it('should contain schema version 0.0.0', async () => {
      const version: string = await mongoUpdater.getAppSchemaVersion();
      assert.strictEqual(version, '0.0.0');
    });
  });

  describe('checkInstall', () => {
    let installAppSchemaCollectionSpy: sinon.SinonSpy;

    beforeEach(async () => {
      installAppSchemaCollectionSpy = sinon.spy(mongoUpdater, 'installAppSchemaCollection');
    });

    afterEach(async () => {
      installAppSchemaCollectionSpy.restore();
    });

    it('should not contains app schema collection', async () => {
      const collections: any[] = await mongoDb
        .listCollections({ name: testconfig.updater.appSchemaCollectionName })
        .toArray();
      assert.strictEqual(collections.length, 0);
    });

    it('should call installAppSchemaCollection to create schema collection', async () => {
      await mongoUpdater.checkInstallation();

      assert.strictEqual(installAppSchemaCollectionSpy.callCount, 1);

      const collections: any[] = await mongoDb
        .listCollections({ name: testconfig.updater.appSchemaCollectionName })
        .toArray();
      assert.strictEqual(collections.length, 1);
    });

    it('should not call installAppSchemaCollection again', async () => {
      await mongoUpdater.checkInstallation();
      assert.strictEqual(installAppSchemaCollectionSpy.callCount, 0);
    });

    it('should contain schema version 0.0.0', async () => {
      await mongoUpdater.checkInstallation();

      const collections: any[] = await mongoDb
        .listCollections({ name: testconfig.updater.appSchemaCollectionName })
        .toArray();
      assert.strictEqual(collections.length, 1);
      assert.strictEqual(collections[0].name, testconfig.updater.appSchemaCollectionName);

      const schema: MongoDb.Collection = mongoDb.collection(
        testconfig.updater.appSchemaCollectionName
      );
      const schemaDb: any[] = await schema.find().toArray();
      assert.strictEqual(schemaDb[0].version, '0.0.0');
    });
  });

  describe('getSchemaVersion', () => {
    it('should contain schema version 0.0.0', async () => {
      const version: string = await mongoUpdater.getAppSchemaVersion();
      assert.strictEqual(version, '0.0.0');
    });
  });

  describe('lock', () => {
    it('lock should be equal to false', async () => {
      const schema: MongoDb.Collection = mongoDb.collection(
        testconfig.updater.appSchemaCollectionName
      );
      const schemaDb: any[] = await schema.find().toArray();
      assert.strictEqual(schemaDb[0].lock, false);
    });

    it('should success to lock', async () => {
      const isLocked: boolean = await mongoUpdater.lockAppSchemaDocument();
      assert.strictEqual(isLocked, true);
    });

    it('lock should be equal to true', async () => {
      const schema: MongoDb.Collection = mongoDb.collection(
        testconfig.updater.appSchemaCollectionName
      );
      const schemaDb: any[] = await schema.find().toArray();
      assert.strictEqual(schemaDb[0].lock, true);
    });

    it('should fail to lock again', async () => {
      const isLocked: boolean = await mongoUpdater.lockAppSchemaDocument();
      assert.strictEqual(isLocked, false);
    });
  });

  describe('unlock', () => {
    it('lock should be equal to true', async () => {
      const schema: MongoDb.Collection = mongoDb.collection(
        testconfig.updater.appSchemaCollectionName
      );
      const schemaDb: any[] = await schema.find().toArray();
      assert.strictEqual(schemaDb[0].lock, true);
    });

    it('should success to unlock', async () => {
      const isUnlocked: boolean = await mongoUpdater.unlockAppSchemaDocument();
      assert.strictEqual(isUnlocked, true);
    });

    it('lock should be equal to false', async () => {
      const schema: MongoDb.Collection = mongoDb.collection(
        testconfig.updater.appSchemaCollectionName
      );
      const schemaDb: any[] = await schema.find().toArray();
      assert.strictEqual(schemaDb[0].lock, false);
    });

    it('should fail to unlock again', async () => {
      const isUnlocked: boolean = await mongoUpdater.unlockAppSchemaDocument();
      assert.strictEqual(isUnlocked, false);

      const schema: MongoDb.Collection = mongoDb.collection(
        testconfig.updater.appSchemaCollectionName
      );
      const schemaDb: any[] = await schema.find().toArray();
      assert.strictEqual(schemaDb[0].lock, false);
    });
  });

  describe('updateSchemaVersion', () => {
    it('should contain schema version 0.0.0', async () => {
      const version: string = await mongoUpdater.getAppSchemaVersion();
      assert.strictEqual(version, '0.0.0');
    });

    it('should success to update the schema version to 6.5.4', async () => {
      await mongoUpdater.updateAppSchemaVersion('0.0.0', '6.5.4');

      const version: string = await mongoUpdater.getAppSchemaVersion();
      assert.strictEqual(version, '6.5.4');
    });

    it('should success to update the schema version to 0.0.0', async () => {
      await mongoUpdater.updateAppSchemaVersion('6.5.4', '0.0.0');

      const version: string = await mongoUpdater.getAppSchemaVersion();
      assert.strictEqual(version, '0.0.0');
    });
  });

  describe('checkUpdate', () => {
    let lockSpy: sinon.SinonSpy;
    let applyUpdateSchemasSpy: sinon.SinonSpy;
    let updateSchemaVersionSpy: sinon.SinonSpy;
    let unlockSpy: sinon.SinonSpy;
    beforeEach(async () => {
      lockSpy = sinon.spy(mongoUpdater, 'lockAppSchemaDocument');
      applyUpdateSchemasSpy = sinon.spy(mongoUpdater, 'applyAppSchemaUpdates');
      updateSchemaVersionSpy = sinon.spy(mongoUpdater, 'updateAppSchemaVersion');
      unlockSpy = sinon.spy(mongoUpdater, 'unlockAppSchemaDocument');
    });
    afterEach(async () => {
      await mongoDb.dropCollection('test');
      lockSpy.restore();
      applyUpdateSchemasSpy.restore();
      updateSchemaVersionSpy.restore();
      unlockSpy.restore();
    });

    it('should work when not already locked', async () => {
      const timer = new Timer();
      await mongoUpdater.checkUpdates();
      const elapsed = timer.getMillisecondsElapsed();

      assert.isTrue(elapsed < 2000);

      assert.strictEqual(lockSpy.callCount, 1);
      assert.strictEqual(applyUpdateSchemasSpy.callCount, 1);
      assert.strictEqual(updateSchemaVersionSpy.callCount, 1);
      assert.strictEqual(unlockSpy.callCount, 1);
    });

    // ==========================================
    // A regular function is *required* to get the proper
    // "this" value to call ".timeout(...)"
    // ==========================================
    it('should wait when is already locked and should delete a lock that is too old', async function () {
      this.timeout(5000);

      // Resets version to 0.0.0
      await mongoUpdater.updateAppSchemaVersion('X.X.X', '0.0.0');

      // ==========================================
      // Temporarly changes the lock max age.
      // ==========================================
      const lockMaxAgeSecondsBackup = testconfig.updater.lockMaxAgeSeconds;
      mongoUpdater['lockMaxAgeSeconds'] = 3;
      assert.strictEqual(mongoUpdater['lockMaxAgeSeconds'], 3);

      try {
        const isLocked: boolean = await mongoUpdater.lockAppSchemaDocument();
        assert.strictEqual(isLocked, true);

        const timer = new Timer();
        await mongoUpdater.checkUpdates();
        const elapsed = timer.getMillisecondsElapsed();

        assert.isTrue(elapsed > 3000);
      } finally {
        mongoUpdater['lockMaxAgeSeconds'] = lockMaxAgeSecondsBackup;
      }
    });
  });

  describe('getUpdateFiles', () => {
    it('should not contain files for version between 0.0.0 and 0.0.0', async () => {
      const files: string[] = await mongoUpdater.getAppSchemaUpdateFiles('0.0.0', '0.0.0');
      assert.strictEqual(files.length, 0);
    });

    it('should not contain files for version between 1.0.0 and 1.0.0', async () => {
      const files: string[] = await mongoUpdater.getAppSchemaUpdateFiles('1.0.0', '1.0.0');
      assert.strictEqual(files.length, 0);
    });

    it('should contain one file for version between 0.0.0 and 1.0.0', async () => {
      const files: string[] = await mongoUpdater.getAppSchemaUpdateFiles('0.0.0', '1.0.0');

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0], '1.0.0');
    });
  });

  describe('applyUpdateSchemas', () => {
    let getUpdateFilesSpy: sinon.SinonSpy;
    beforeEach(async () => {
      getUpdateFilesSpy = sinon.spy(mongoUpdater, 'getAppSchemaUpdateFiles');
    });
    afterEach(async () => {
      getUpdateFilesSpy.restore();
    });

    it('should call getUpdateFilesSpy one time', async () => {
      await mongoUpdater.applyAppSchemaUpdates('0.0.0', '1.0.0');
      assert.strictEqual(getUpdateFilesSpy.callCount, 1);
    });
  });
});
