import http from './Axios';
import { Method, ResponseType } from 'axios';

type findParamsType = {
  method?: Method;
  path: string;
  params: { [x: string]: any };
  responseType?: ResponseType;
  timeout?: number;
};

type updateParamsType = {
  path: string;
  data?: any;
};

type downloadType = {
  path: string;
  params: { outputFields: string[]; filename: string };
};

export default class BaseModel {
  constructor(props: any) {
    return this;
  }

  static async findAll(data: findParamsType) {
    const {
      params = {},
      path = '',
      method = 'get',
      responseType = 'json',
    } = data;
    const type = method === 'post' ? 'data' : 'params';
    const httpConfig = {
      method,
      url: path,
      [type]: { ...params },
      responseType,
    };

    const res = await http(httpConfig);
    let list = res.data.data || [];
    if (!Array.isArray(list)) {
      return list;
    }

    return Object.assign(
      list.map(v => new this(v)),
      {
        _total: res.data.data.total_count || list.length,
      }
    );
  }

  static async search<T>(data: findParamsType) {
    const { method = 'get', params = {}, path = '', timeout } = data;
    const httpConfig = {
      method,
      url: path,
      params,
    } as any;
    if (timeout) httpConfig.timeout = timeout;
    const res = await http(httpConfig);
    // conflict with collection view data structure, status is useless, so delete here.
    delete res.data.data.status;
    return new this(res.data.data || {}) as T;
  }

  /**
   * Create instance in database
   */
  static async create<T>(options: updateParamsType) {
    const { path, data } = options;
    const res = await http.post(path, data);
    return new this(res.data.data || {}) as T;
  }

  static async update<T>(options: updateParamsType) {
    const { path, data } = options;
    const res = await http.put(path, data);

    return new this(res.data.data || {}) as T;
  }

  static async delete<T>(options: updateParamsType) {
    const { path, data } = options;

    const res = await http.delete(path, { data: data });

    return res.data;
  }

  static async batchDelete(options: updateParamsType) {
    const { path, data } = options;
    const res = await http.post(path, data);
    return res.data;
  }

  static async query(options: updateParamsType) {
    const { path, data } = options;
    const res = await http.post(path, data);
    return res.data.data;
  }

  static async download(data: downloadType) {
    const response = await http({
      url: data.path,
      method: 'GET',
      params: data.params,
      responseType: 'blob', // important
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', data.params.filename); // or any other extension
    document.body.appendChild(link);
    link.click();
  }
}
