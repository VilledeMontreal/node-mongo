import { assert } from 'chai';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server-core';
import { MongoUtils } from './mongoUtils';

describe('MongoUtils - #mockMongoose', () => {
  /*
    It is mandatory to create a new instance of MongoUtils to test the function mockMongoose as the singleton will keep its parameters instanced if used again. The parameter mongoMemServer, if instanciated by a first call, 
    won't be changed on a second one, as if the memory server is already mocked, nothing happens.
  */
  it('should return a mongo memory server', async function() {
    const mongoUtils = new MongoUtils();
    const memServ = await mongoUtils.mockMongoose(this, null, false);
    assert.isDefined(memServ);
    assert.instanceOf(memServ, MongoMemoryServer);
  });

  it('should return a mongo memory replica set', async function() {
    const mongoUtils = new MongoUtils();
    const memServ = await mongoUtils.mockMongoose(this, null, true);
    assert.isDefined(memServ);
    assert.instanceOf(memServ, MongoMemoryReplSet);
  });
});
