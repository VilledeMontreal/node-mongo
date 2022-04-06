// Some way of using chai requires disabling this rule:
// tslint:disable:no-unused-expression

import { IPaginatedResult } from '@villedemontreal/general-utils';
import * as chai from 'chai';
import * as mongoose from 'mongoose';
import { constants } from '../../config/constants';
import { mongoUtils } from '../../mongoUtils';
import { mongoosePaginate } from './index';

const expect = chai.expect;

const authorSchema = new mongoose.Schema({ name: String });
const authorModel = mongoose.model('Author', authorSchema);

const bookSchema = new mongoose.Schema({
  title: String,
  date: Date,
  author: {
    type: String,
    ref: 'Author'
  }
});

bookSchema.plugin(mongoosePaginate);
const bookModel: any = mongoose.model('Book', bookSchema);

describe('plugin pagination', () => {
  before(async function() {
    this.timeout(120000);

    // Makes sure Mongoose is mocked, but not in Jenkins as we will start a dedicated mongodb container.
    const mockedDb = await mongoUtils.mockMongoose(this, constants.testsConfig.mockServer.serverVersion);
    const connString = mockedDb.getUri();
    await mongoose.connect(connString, { useNewUrlParser: true });
  });

  before(async function() {
    this.timeout(10000);
    let book;
    const books: any = [];
    const date = new Date();
    return authorModel.create({ name: 'Arthur Conan Doyle' }).then(author => {
      for (let i = 1; i <= 100; i++) {
        book = new bookModel({
          title: 'Book #' + i,
          date: new Date(date.getTime() + i),
          author: author._id
        });
        books.push(book);
      }
      return bookModel.create(books);
    });
  });

  it('returns promise', () => {
    const promise = bookModel.paginate();
    expect(promise.then).to.be.an.instanceof(Function);
  });

  it('calls callback', done => {
    bookModel.paginate({}, {}, (err: Error, result: IPaginatedResult<any>) => {
      expect(err).to.be.null;
      expect(result).to.be.an.instanceOf(Object);
      done();
    });
  });

  describe('paginates', () => {
    it('with criteria', () => {
      return bookModel.paginate({ title: 'Book #10' }).then((result: IPaginatedResult<any>) => {
        expect(result.items).to.have.length(1);
        expect(result.items[0].title).to.equal('Book #10');
      });
    });
    it('with default options (limit=10, lean=false)', () => {
      return bookModel.paginate().then((result: IPaginatedResult<any>) => {
        expect(result.items).to.have.length(10);
        expect(result.items[0]).to.be.an.instanceof((mongoose as any).Document);
        expect(result.paging.totalCount).to.equal(100);
        expect(result.paging.limit).to.equal(10);
        expect(result.paging.offset).to.equal(0);
      });
    });
    it('with offset and limit', () => {
      return bookModel.paginate({}, { offset: 30, limit: 20 }).then((result: IPaginatedResult<any>) => {
        expect(result.items).to.have.length(20);
        expect(result.paging.totalCount).to.equal(100);
        expect(result.paging.limit).to.equal(20);
        expect(result.paging.offset).to.equal(30);
      });
    });
    it('with zero limit', () => {
      return bookModel.paginate({}, { page: 1, limit: 0 }).then((result: IPaginatedResult<any>) => {
        expect(result.items).to.have.length(0);
        expect(result.paging.totalCount).to.equal(100);
        expect(result.paging.limit).to.equal(0);
      });
    });
    it('with select', () => {
      return bookModel.paginate({}, { select: 'title' }).then((result: IPaginatedResult<any>) => {
        expect(result.items[0].title).to.exist;
        expect(result.items[0].date).to.not.exist;
      });
    });
    it('with sort', () => {
      return bookModel.paginate({}, { sort: { date: -1 } }).then((result: IPaginatedResult<any>) => {
        expect(result.items[0].title).to.equal('Book #100');
      });
    });
    it('with populate', () => {
      return bookModel.paginate({}, { populate: 'author' }).then((result: IPaginatedResult<any>) => {
        expect(result.items[0].author.name).to.equal('Arthur Conan Doyle');
      });
    });
    describe('with lean', () => {
      it('with default leanWithId=true', () => {
        return bookModel.paginate({}, { lean: true }).then((result: IPaginatedResult<any>) => {
          expect(result.items[0]).to.not.be.an.instanceof((mongoose as any).Document);
          expect(result.items[0].id).to.exist;
          expect(result.items[0]).to.not.have.property('_id');
        });
      });
      it('with leanWithId=false', () => {
        return bookModel.paginate({}, { lean: true, leanWithId: false }).then((result: IPaginatedResult<any>) => {
          expect(result.items[0]).to.not.be.an.instanceof((mongoose as any).Document);
          expect(result.items[0]).to.not.have.property('id');
        });
      });
    });
  });

  after(done => {
    mongoose.connection.db.dropDatabase(done);
  });

  after(done => {
    mongoose.disconnect(done);
  });
});
