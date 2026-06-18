import { Semaphore } from "./semaphore.js";

describe(Semaphore.name, () => {
  describe("run", () => {
    describe("when the callback throws an async error", () => {
      it("should propagate the rejection to the caller", async () => {
        const semaphore = new Semaphore(1);
        const error = new Error("async failure");

        const promise = semaphore.run(() => Promise.reject(error));

        await expect(promise).rejects.toThrow(error);
      });

      it("should release the slot so subsequent runs can proceed", async () => {
        // Arrange
        const semaphore = new Semaphore(1);

        // Act
        await semaphore.run(() => Promise.reject(new Error())).catch(() => {});
        const promise = semaphore.run(() => Promise.resolve(42)); // If the slot was not released this would hang forever

        // Assert
        await expect(promise).resolves.toBe(42);
      });
    });

    describe("when the callback throws a sync error", () => {
      it("should propagate the error to the caller", async () => {
        const semaphore = new Semaphore(1);

        const promise = semaphore.run(() => {
          JSON.parse("not valid json {{{}}}");
          return Promise.resolve();
        });

        await expect(promise).rejects.toThrow(SyntaxError);
      });

      it("should release the slot so subsequent runs can proceed", async () => {
        // Arrange
        const semaphore = new Semaphore(1);

        // Act
        await semaphore
          .run(() => {
            JSON.parse("not valid json {{{}}}");
            return Promise.resolve();
          })
          .catch(() => {});
        const promise = semaphore.run(() => Promise.resolve(42)); // If the slot was not released this would hang forever

        // Assert
        await expect(promise).resolves.toBe(42);
      });
    });
  });
});
