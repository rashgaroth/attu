declare namespace Express {
  export interface Request {
    // create after connection
    client: any;
    grants: any;
  }
}
