import type { ServerResponse } from "node:http";
import { sendText } from "../utils/index.js";

/**
 * Handles health-check endpoint.
 */
export function handleHealth(res: ServerResponse): void {
  sendText(res, 200, "OK");
}
