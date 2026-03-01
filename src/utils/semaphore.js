// @ts-check

export class Semaphore {
  /** @param {number} max */
  constructor(max) {
    this.max = max;
    this.count = 0;
    /** @type {Array<(value?: void) => void>} */
    this.queue = [];
  }
  /** @template T @param {() => Promise<T>} fn */
  async run(fn) {
    if (this.count >= this.max) {
      await new Promise((resolve) => this.queue.push(resolve));
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
