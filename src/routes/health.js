// @ts-check

import { sendText } from "../utils/http.js";

/**
 * Handles health-check endpoint.
 * @param {import('node:http').ServerResponse} res
 * @returns {void}
 */
export function handleHealth(res) {
  sendText(res, 200, "OK");
}
