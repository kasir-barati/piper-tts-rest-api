export class Semaphore {
  private max: number;
  private count: number;
  private queue: Array<() => void>;

  constructor(max: number) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }

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
