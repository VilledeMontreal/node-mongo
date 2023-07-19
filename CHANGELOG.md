# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [7.1.1]
- Dependencies updates

## [7.0.2]

- Change Mongo mock server to use version 5.0.8 by default in order to test the new 5.x release
- move scripting lib to devDependencies
- use scripting lib
- remove tslint and prettier
- add nyc for code coverage
- restore eslint constraints that had been disabled
- remove promiseLibrary config option since it is marked as deprecated by Mongo
- upgrade mongodb, mongoose and mongodb-memory-server-core

## [7.0.0-beta]

### Changed

- **breaking changes** The version of the Mongoose dependency changed from 5.13.x to 6.5.x. You can look at the [5 to 6 migration guide](https://mongoosejs.com/docs/migrating_to_6.html#mongodb-driver-40) for more information on this change.
- **breaking changes** The version of the MongoDb driver dependency changed from 3.6.12 to 4.8.1. You can look at the [MongoDb Node Driver 4.0 Migration guide](https://github.com/mongodb/node-mongodb-native/blob/4.0/docs/CHANGES_4.0.0.md) for more information about this change.

- **breaking changes** The version of Typescript has changed from 3.9.5 to 4.7.4

- Tslint was replaced by Eslint

## [6.4.0] - 2021-07-20

### Added

Added replica set feature when mocking a mongodb connection for unit tests.

## [6.3.0] - 2021-07-16

### Changed

Now use mongodb-memory-server-core instead of mongodb-memory-server to prevent downloading of mongo during `npm install`

Upgrade from mongodb-memory-server version 6 to 7

## [6.0.0] - 2019-03-26

### Added

- Replace deprecated mockgoose by [mongodb-memory-server](https://www.npmjs.com/package/mongodb-memory-server)

### Changed

- **breaking changes** mongoUtils.getMockedServerPort is now `async`
- update mongoose to 5.4.20
- **breaking changes** Rename mockgoose to mockServer in IMongooseConfigs

### Removed

- **breaking changes** mongoUtils.dropMockedDatabases. Functionality offered by mockgoose. It's not available in mongodb-memory-server

## [5.0.1] - 2019-02-27

### Changed

- Bug fix pagination caused by deprecated mongoose functions
- Bug fix migration caused by deprecated mongoose functions

## [5.0.0] - 2019-02-27

### Added

- **breaking change** Migration de mongodb 2.233 => 3.1.13 - see [mongo upgrade guide](http://mongodb.github.io/node-mongodb-native/3.1/upgrade-migration/main/)
- Migration de mongoose 4.12.5 => 5.4.12 see [deprecation warnings ](https://github.com/Automattic/mongoose/wiki/5.0-Deprecation-Warnings)
