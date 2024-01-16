import { NextFunction, Request, Response, Router } from 'express';
import * as JSONStream from 'jsonstream';
import * as csv from 'fast-csv';
import { dtoValidationMiddleware } from '../middleware/validation';
import { CollectionsService } from './collections.service';
import { MilvusService } from '../milvus/milvus.service';
import { LoadCollectionReq } from '@zilliz/milvus2-sdk-node';
import { WS_EVENTS, WS_EVENTS_TYPE } from '../utils';
import {
  CreateAliasDto,
  CreateCollectionDto,
  InsertDataDto,
  ImportSampleDto,
  VectorSearchDto,
  QueryDto,
  RenameCollectionDto,
  DuplicateCollectionDto,
} from './dto';
import { pubSub } from '../events';

export class CollectionController {
  private collectionsService: CollectionsService;
  private router: Router;

  constructor() {
    this.collectionsService = new CollectionsService();

    this.router = Router();
  }

  get collectionsServiceGetter() {
    return this.collectionsService;
  }

  generateRoutes() {
    this.router.get('/', this.showCollections.bind(this));
    this.router.post(
      '/',
      dtoValidationMiddleware(CreateCollectionDto),
      this.createCollection.bind(this)
    );
    this.router.get('/statistics', this.getStatistics.bind(this));
    this.router.get(
      '/:name/statistics',
      this.getCollectionStatistics.bind(this)
    );
    this.router.get(
      '/indexes/status',
      this.getCollectionsIndexStatus.bind(this)
    );
    this.router.delete('/:name', this.dropCollection.bind(this));
    this.router.post(
      '/:name',
      dtoValidationMiddleware(RenameCollectionDto),
      this.renameCollection.bind(this)
    );
    this.router.post(
      '/:name/duplicate',
      dtoValidationMiddleware(DuplicateCollectionDto),
      this.duplicateCollection.bind(this)
    );
    this.router.delete('/:name/alias/:alias', this.dropAlias.bind(this));
    // collection with index info
    this.router.get('/:name', this.describeCollection.bind(this));
    // just collection info
    this.router.get('/:name/info', this.getCollectionInfo.bind(this));
    this.router.get('/:name/count', this.count.bind(this));

    // load / release
    this.router.put('/:name/load', this.loadCollection.bind(this));
    this.router.put('/:name/release', this.releaseCollection.bind(this));
    this.router.put('/:name/empty', this.empty.bind(this));

    this.router.post(
      '/:name/insert',
      dtoValidationMiddleware(InsertDataDto),
      this.insert.bind(this)
    );
    this.router.post(
      '/:name/importSample',
      dtoValidationMiddleware(ImportSampleDto),
      this.importSample.bind(this)
    );
    // we need use req.body, so we can't use delete here
    this.router.put('/:name/entities', this.deleteEntities.bind(this));
    this.router.post(
      '/:name/search',
      dtoValidationMiddleware(VectorSearchDto),
      this.vectorSearch.bind(this)
    );
    this.router.post(
      '/:name/query',
      dtoValidationMiddleware(QueryDto),
      this.query.bind(this)
    );
    this.router.post(
      '/:name/alias',
      dtoValidationMiddleware(CreateAliasDto),
      this.createAlias.bind(this)
    );

    // segments
    this.router.get('/:name/psegments', this.getPSegment.bind(this));
    this.router.get('/:name/qsegments', this.getQSegment.bind(this));
    // compact
    this.router.put('/:name/compact', this.compact.bind(this));

    // export
    this.router.get('/:name/export', this.exportQueryResult.bind(this));
    return this.router;
  }

  async showCollections(req: Request, res: Response, next: NextFunction) {
    const type = parseInt('' + req.query?.type, 10);
    try {
      const result =
        type === 1
          ? await this.collectionsService.getLoadedCollections()
          : await this.collectionsService.getAllCollections();
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.collectionsService.getStatistics();
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async createCollection(req: Request, res: Response, next: NextFunction) {
    const createCollectionData = req.body;
    try {
      const result = await this.collectionsService.createCollection(
        createCollectionData
      );
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async renameCollection(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    const data = req.body;
    try {
      const result = await this.collectionsService.renameCollection({
        collection_name: name,
        ...data,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async duplicateCollection(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    const data = req.body;
    try {
      const result = await this.collectionsService.duplicateCollection({
        collection_name: name,
        ...data,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async dropCollection(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    try {
      const result = await this.collectionsService.dropCollection({
        collection_name: name,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async describeCollection(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    try {
      const result = await this.collectionsService.getAllCollections({
        data: [{ name }],
      });
      res.send(result[0]);
    } catch (error) {
      next(error);
    }
  }

  async getCollectionInfo(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    try {
      const result = await this.collectionsService.describeCollection({
        collection_name: name,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async getCollectionStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const name = req.params?.name;
    try {
      const result = await this.collectionsService.getCollectionStatistics({
        collection_name: name,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async getCollectionsIndexStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await this.collectionsService.getCollectionsIndexStatus();
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async loadCollection(req: Request, res: Response, next: NextFunction) {
    const collection_name = req.params?.name;
    const data = req.body;
    const param: LoadCollectionReq = { collection_name };
    if (data.replica_number) {
      param.replica_number = Number(data.replica_number);
    }
    try {
      const result = await this.collectionsService.loadCollection(param);
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async releaseCollection(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    try {
      const result = await this.collectionsService.releaseCollection({
        collection_name: name,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async insert(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    const data = req.body;
    try {
      const result = await this.collectionsService.insert({
        collection_name: name,
        ...data,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async importSample(req: Request, res: Response, next: NextFunction) {
    const data = req.body;
    try {
      const result = await this.collectionsService.importSample({
        ...data,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }
  async deleteEntities(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    const data = req.body;
    try {
      const result = await this.collectionsService.deleteEntities({
        collection_name: name,
        ...data,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async vectorSearch(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    const data = req.body;
    try {
      const result = await this.collectionsService.vectorSearch({
        collection_name: name,
        ...data,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async query(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    const data = req.body;
    const resultLimit: any = req.query?.limit;
    const resultPage: any = req.query?.page;

    try {
      const limit = isNaN(resultLimit) ? 100 : parseInt(resultLimit, 10);
      const page = isNaN(resultPage) ? 0 : parseInt(resultPage, 10);
      // TODO: add page and limit to node SDK
      // Here may raise "Error: 8 RESOURCE_EXHAUSTED: Received message larger than max"
      const result = await this.collectionsService.query({
        collection_name: name,
        ...data,
      });

      // const queryResultList = result.data;
      const queryResultLength = result.data.length;
      // const startNum = page * limit;
      // const endNum = (page + 1) * limit;
      // const slicedResult = queryResultList.slice(startNum, endNum);
      // result.data = slicedResult;
      res.send({ ...result, limit, page, total: queryResultLength });
    } catch (error) {
      next(error);
    }
  }

  async createAlias(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    const data = req.body;
    try {
      const result = await this.collectionsService.createAlias({
        collection_name: name,
        ...data,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async dropAlias(req: Request, res: Response, next: NextFunction) {
    const alias = req.params?.alias;
    try {
      const result = await this.collectionsService.dropAlias({ alias });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async getReplicas(req: Request, res: Response, next: NextFunction) {
    const collectionID = req.params?.collectionID;
    try {
      const result = await this.collectionsService.getReplicas({
        collectionID,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async getPSegment(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    try {
      const result = await this.collectionsService.getPersistentSegmentInfo({
        collectionName: name,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async getQSegment(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    try {
      const result = await this.collectionsService.getQuerySegmentInfo({
        collectionName: name,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async compact(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    try {
      const result = await this.collectionsService.compact({
        collection_name: name,
      });
      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  async count(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    try {
      const { value } = await this.collectionsService.hasCollection({
        collection_name: name,
      });
      let result: any = '';
      if (value) {
        result = await this.collectionsService.count({
          collection_name: name,
        });
      }

      res.send({ collection_name: name, rowCount: result });
    } catch (error) {
      next(error);
    }
  }

  async empty(req: Request, res: Response, next: NextFunction) {
    const name = req.params?.name;
    try {
      const result = await this.collectionsService.emptyCollection({
        collection_name: name,
      });

      res.send(result);
    } catch (error) {
      next(error);
    }
  }

  // This function exports the result of a query
  async exportQueryResult(req: Request, res: Response, next: NextFunction) {
    // Get the collection name from the request parameters
    const name = req.params?.name;
    // Get the request body
    const data = req.body;
    // Set the page size
    const pageSize = 512;
    // Get the output fields from the request query
    const outputFields = req.query.outputFields as string[];
    // Get the filename from the request query
    const filename = req.query.filename as string;

    // Get the total count of the collection
    const total = await this.collectionsService.count({
      collection_name: name,
    });

    // Get the primary key field name of the collection
    const pkField = await MilvusService.activeMilvusClient.getPkFieldName({
      collection_name: name,
    });
    // Get the primary key field type of the collection
    const pkType = await MilvusService.activeMilvusClient.getPkFieldType({
      collection_name: name,
    });

    // Initialize the lastId based on the primary key type
    let lastId: string | number = pkType === 'Int64' ? 0 : '';

    // Determine the export type based on the filename extension
    const type = filename.endsWith('.csv') ? 'csv' : 'json';

    // Log the export information
    console.log(
      `exporting ${name}, output_fields: ${outputFields}, data count: ${total}, batch size: ${pageSize}`
    );

    // Emit the start event
    pubSub.emit('ws_pubsub', {
      event: WS_EVENTS.EXPORT + WS_EVENTS_TYPE.START,
      data: filename,
    });

    // Start the timer for the export operation
    console.time(`exporting ${filename}`);

    // Set the response header for the file download
    res.setHeader('Content-disposition', `attachment; filename=${filename}`);

    // Initialize the stream based on the export type
    let stream: NodeJS.ReadWriteStream;
    if (type === 'csv') {
      res.setHeader('Content-type', 'text/csv');
      stream = csv.format({ headers: true });
    } else {
      res.setHeader('Content-type', 'application/json');
      stream = JSONStream.stringify();
    }

    // Pipe the stream to the response
    stream.pipe(res);

    // Loop through the data by page size
    for (let i = 0; i < total; i += pageSize) {
      // const page
      const nextPage = i + pageSize > total ? total : i + pageSize;
      // Start the timer for the current page
      console.time(`exporting from ${i} to ${nextPage}`);

      // Emit the export event
      pubSub.emit('ws_pubsub', {
        event: WS_EVENTS.EXPORT,
        data: nextPage,
      });

      // Construct the expression for the query
      let expr = `${pkField} > ${
        pkType === 'VarChar' ? `'${lastId}'` : `${lastId}`
      }`;

      // Execute the query
      const result = await this.collectionsService.query({
        collection_name: name,
        ...data,
        limit: pageSize,
        expr,
        output_fields: outputFields || ['*'],
      });

      // Update the lastId for the next page
      lastId = result.data[result.data.length - 1][pkField];

      // Loop through the result data
      for (const item of result.data) {
        for (const key in item) {
          // Delete the id if it's not in the output fields
          if (!outputFields.includes(key)) {
            delete item[key];
            continue;
          }
          // Handle array data for csv export
          if (type === 'csv' && Array.isArray(item[key])) {
            item[key] = JSON.stringify(item[key]);
          }
        }

        // Write the item to the stream
        stream.write(item as any);
      }
      // End the timer for the current page
      console.timeEnd(`exporting from ${i} to ${nextPage}`);
    }

    // End the stream
    stream.end();

    // Emit the stop event
    pubSub.emit('ws_pubsub', {
      event: WS_EVENTS.EXPORT + WS_EVENTS_TYPE.STOP,
      data: filename,
    });

    // End the timer for the export operation
    console.timeEnd(`exporting ${filename}`);
  }
}
