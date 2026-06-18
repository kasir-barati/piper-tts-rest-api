export class Semaphore {
  private max: number;
  private count: number;
  private queue: Array<() => void>;

  constructor(max: number) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }

  /**
   * @description The semaphore's `finally` always releases the slot, so if clients need to make sure the callback always returns (never throws an error). You must handle errors gracefully (e.g. use a `try...catch` statement inside the callback and do NOT rethrow the error).
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.count >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.count++;
    try {
      return await fn();
    } finally {
      this.count--;

      const next = this.queue.shift();

      if (next) {
        next();
      }
    }
  }
}
