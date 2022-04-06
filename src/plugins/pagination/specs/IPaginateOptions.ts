export interface IPaginateOptions {
  /**
   * Fields to return (by default returns all fields)
   * http://mongoosejs.com/docs/api.html#query_Query-select
   * @type {string}
   * @memberof IPaginateOptions
   */
  select?: string;
  /**
   * Sort order
   * http://mongoosejs.com/docs/api.html#query_Query-sort
   * @type {*}
   * @memberof IPaginateOptions
   */
  sort?: any;
  /**
   * Paths which should be populated with other documents.
   * http://mongoosejs.com/docs/api.html#query_Query-populate
   * @type {string}
   * @memberof IPaginateOptions
   */
  populate?: string;
  /**
   * Should return plain javascript objects instead of Mongoose documents?
   * default false
   * @type {boolean}
   * @memberof IPaginateOptions
   */
  lean?: boolean;
  /**
   * If lean and leanWithId are true, adds id field with string representation of _id to every document
   * default true
   * @type {boolean}
   * @memberof IPaginateOptions
   */
  leanWithId?: boolean;
  /**
   * Use offset to set skip position
   * default 0
   * @type {number}
   * @memberof IPaginateOptions
   */
  offset?: number;
  /**
   * limit the items returned
   * default 10
   * @type {number}
   * @memberof IPaginateOptions
   */
  limit?: number;
}
