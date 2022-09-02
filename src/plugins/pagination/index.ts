import { IPaginateOptions } from './specs/IPaginateOptions';

function paginate(
  q: any,
  options: IPaginateOptions,
  callback: (error: Error, result: any) => void
) {
  const optionsClean = PaginateBuilder.getOptions((paginate as any).options, options);

  const query = q || {};
  const promises = PaginateBuilder.executeQueries(this, query, optionsClean);

  return PaginateBuilder.processResult(promises, optionsClean, callback);
}

/**
 * @param {Schema} schema
 */

export function mongoosePaginate(schema: any) {
  schema.statics.paginate = paginate;
}

export class PaginateBuilder {
  private static readonly defaultOptions = Object.freeze({
    lean: false,
    leanWithId: true,
    limit: 10,
    offset: 0,
  });

  public static getOptions(...options: IPaginateOptions[]): IPaginateOptions {
    return Object.assign({}, PaginateBuilder.defaultOptions, ...options);
  }

  public static executeQueries(
    model: any,
    query: any,
    options: IPaginateOptions
  ): [Promise<any[]>, Promise<number>] {
    const { select, sort, populate, lean, leanWithId, limit, offset } = options;
    let itemsQuery: any;

    if (leanWithId) {
      // only to prevent "'leanWithId' is declared but its value is never read"
    }

    if (limit > 0) {
      itemsQuery = model.find(query).select(select).sort(sort).skip(offset).limit(limit).lean(lean);

      if (populate) {
        [].concat(populate).forEach((item) => itemsQuery.populate(item));
      }
    }

    return [
      itemsQuery && limit > 0 ? itemsQuery.exec() : Promise.resolve([]),
      model.countDocuments(query).exec(),
    ];
  }

  public static processResult(
    promises: any[],
    options: IPaginateOptions,
    callback: (error: Error, result: any) => void
  ): Promise<any> {
    const { lean, leanWithId, limit, offset } = options;
    return new Promise((resolve, reject) => {
      Promise.all(promises).then(
        (data) => {
          const items = data[0] as any[];
          const count = data[1] as number;
          const result: any = { paging: { limit, offset, totalCount: count } };

          if (lean && leanWithId) {
            result.items = items.map((doc: any) => {
              doc.id = String(doc._id);
              delete doc._id;
              delete doc.__v;
              return doc;
            });
          } else {
            result.items = items;
          }

          if (typeof callback === 'function') {
            return callback(null, result);
          }

          resolve(result);
        },
        (error) => {
          if (typeof callback === 'function') {
            return callback(error, null);
          }
          reject(error);
        }
      );
    });
  }
}
