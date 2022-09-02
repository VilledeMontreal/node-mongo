import * as MongoDb from 'mongodb';

/**
 * TEST update - version 1.0.0
 */
export default async function update(db: MongoDb.Db): Promise<void> {
  // ==========================================
  // Creating the "test" collection.
  // ==========================================
  const testCollection: MongoDb.Collection = await db.createCollection('test');

  // ==========================================
  // Creating indexes for the "test" collection.
  //
  // @see https://docs.mongodb.com/manual/reference/command/createIndexes/
  // ==========================================
  await testCollection.createIndexes([
    {
      key: {
        email: 1,
      },
      name: 'email_1',
      unique: true,
    },
  ]);
}
