import { NextRequest } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/api-middleware";
import type { AnalyticsEvent, AnalyticsEventName } from "@/types/analytics";

/**
 * Valid event names accepted by the collector.
 * Kept as a runtime set so unknown event names are rejected early.
 */
const VALID_EVENT_NAMES = new Set<AnalyticsEventName>([
  "listing_view",
  "listing_create",
  "trade_complete",
  "match_propose",
  "wallet_connect",
  "wallet_disconnect",
  "page_view",
]);

/**
 * In-memory event store for the server process.
 * Suitable for development / demo purposes. In production this would be
 * forwarded to a dedicated analytics backend (e.g. Segment, Amplitude, or a
 * time-series DB).
 */
const serverEventStore: AnalyticsEvent[] = [];
const MAX_STORE_SIZE = 10_000;

/**
 * @openapi
 * /api/v1/analytics/events:
 *   post:
 *     summary: Record an analytics event
 *     description: |
 *       Accepts a single analytics event payload from the browser client.
 *       Requests without a valid event name are rejected. No authentication
 *       is required so this endpoint is intentionally light-weight — clients
 *       that have opted out simply do not call it.
 *     tags:
 *       - Analytics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - timestamp
 *             properties:
 *               id:
 *                 type: string
 *                 example: "evt_1718000000000_0"
 *               name:
 *                 type: string
 *                 enum:
 *                   - listing_view
 *                   - listing_create
 *                   - trade_complete
 *                   - match_propose
 *                   - wallet_connect
 *                   - wallet_disconnect
 *                   - page_view
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               properties:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Event recorded successfully
 *       400:
 *         description: Invalid event payload
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, "Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return createErrorResponse(400, "Event payload must be a JSON object");
  }

  const payload = body as Record<string, unknown>;

  const { id, name, timestamp, properties } = payload;

  if (typeof id !== "string" || !id) {
    return createErrorResponse(400, "Missing or invalid field: id");
  }

  if (typeof name !== "string" || !VALID_EVENT_NAMES.has(name as AnalyticsEventName)) {
    return createErrorResponse(400, "Missing or invalid field: name", {
      valid: [...VALID_EVENT_NAMES],
    });
  }

  if (typeof timestamp !== "string" || isNaN(Date.parse(timestamp))) {
    return createErrorResponse(400, "Missing or invalid field: timestamp");
  }

  // properties is optional; if present it must be a plain object
  if (properties !== undefined && (typeof properties !== "object" || Array.isArray(properties))) {
    return createErrorResponse(400, "Field 'properties' must be a plain object");
  }

  const event: AnalyticsEvent = {
    id,
    name: name as AnalyticsEventName,
    timestamp,
    properties: (properties as AnalyticsEvent["properties"]) ?? undefined,
  };

  // Bound the in-memory store
  if (serverEventStore.length >= MAX_STORE_SIZE) {
    serverEventStore.shift();
  }
  serverEventStore.push(event);

  return createSuccessResponse({ recorded: true, eventId: event.id });
}

/**
 * @openapi
 * /api/v1/analytics/events:
 *   get:
 *     summary: List recorded analytics events
 *     description: Returns the most-recent analytics events held in memory.
 *     tags:
 *       - Analytics
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of events to return (max 500)
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by event name
 *     responses:
 *       200:
 *         description: Events returned successfully
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const rawLimit = searchParams.get("limit");
  const limit = Math.min(parseInt(rawLimit ?? "50", 10) || 50, 500);

  const nameFilter = searchParams.get("name");

  let events = [...serverEventStore].reverse(); // newest first

  if (nameFilter) {
    events = events.filter((e) => e.name === nameFilter);
  }

  const page = events.slice(0, limit);

  return createSuccessResponse(page, {
    total: serverEventStore.length,
    returned: page.length,
    apiVersion: "v1",
  });
}
