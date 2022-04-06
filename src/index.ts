export * from './mongoUtils';
export * from './config/constants';
export { IMongooseConfigs } from './config/mongooseConfigs';
export * from './mongoClient';

// ==========================================
// We do not export the configs instance itself,
// only the "init()" method, so we can define
// which are the required parameters.
// ==========================================
export * from './config/init';
export * from './plugins/pagination';
// import { IPaginateOptions } from './plugins/pagination/specs/IPaginateOptions';
