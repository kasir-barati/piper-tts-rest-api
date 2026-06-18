import type { IncomingMessage } from "node:http";

import { getCorrelationId } from "./get-correlation-id.js";

describe(getCorrelationId.name, () => {
  it("should return correlation-id when it exists as a string", () => {
    const req = {
      headers: {
        "correlation-id": "403b8e59-ac0e-4b99-9888-40a0cb5aa197",
      },
    } as unknown as IncomingMessage;

    const result = getCorrelationId(req);

    expect(result).toBe("403b8e59-ac0e-4b99-9888-40a0cb5aa197");
  });

  it("should return the first correlation-id when header is an array", () => {
    const req = {
      headers: {
        "correlation-id": [
          "5ad97a99-3d5b-4c28-8aac-fa533f001cc9",
          "b6f8f8ea-fafb-4f99-a838-e3e611cbcdd9",
        ],
      },
    } as unknown as IncomingMessage;

    const result = getCorrelationId(req);

    expect(result).toBe("5ad97a99-3d5b-4c28-8aac-fa533f001cc9");
  });

  it("should generate a correlation-id when header is missing", () => {
    const req = {
      headers: {},
    } as IncomingMessage;

    const result = getCorrelationId(req);

    expect(result).toBeString();
    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
