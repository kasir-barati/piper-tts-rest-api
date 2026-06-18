import { handleHealth } from "./health.js";

describe(handleHealth.name, () => {
  it("should send OK response", () => {
    const res = {
      statusCode: 0,
      end: jest.fn(),
    } as any;

    handleHealth(res);

    expect(res.statusCode).toBe(200);
    expect(res.end).toHaveBeenCalledWith("OK");
  });
});
