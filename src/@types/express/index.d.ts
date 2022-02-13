declare namespace Express {
  export interface Request {
    queue: Queue.Queue<any>;
  }
}
