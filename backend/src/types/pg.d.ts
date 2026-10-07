declare module "pg" {
  export class PoolClient {
    query: (text: string, values?: unknown[]) => Promise<any>;
    release: () => void;
  }
  export class Pool {
    constructor(config?: any);
    connect(): Promise<PoolClient>;
    query(text: string, values?: unknown[]): Promise<any>;
    end(): Promise<void>;
  }
  export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
  }
}
