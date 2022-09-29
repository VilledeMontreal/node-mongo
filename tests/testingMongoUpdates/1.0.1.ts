import * as MongoDb from 'mongodb';

/**
 * TEST update - version 1.0.1
 */
export default async function update(db: MongoDb.Db): Promise<void> {
  // ==========================================
  // Adding extra indexes on the "test" collection.
  // ==========================================
  const testUserCollection: MongoDb.Collection = db.collection('test');

  await testUserCollection.createIndexes([
    {
      key: {
        firstName: 1,
        lastName: 1,
      },
      name: 'firstName_lastName',
    },
  ]);
}
