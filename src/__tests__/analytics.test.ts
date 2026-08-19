/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import {
  POST as postEvent,
  GET as getEvents,
} from "@/app/api/v1/analytics/events/route";

// ── helpers ────────────────────────────────────────────────────────────────

function makeRequest(
  url: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {},
) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: options.method ?? "GET",
    body: options.body,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
}

function validEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `evt_${Date.now()}_0`,
    name: "listing_view",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ── POST /api/v1/analytics/events ──────────────────────────────────────────

describe("POST /api/v1/analytics/events", () => {
  it("records a valid event and returns 200", async () => {
    const req = makeRequest("http://localhost/api/v1/analytics/events", {
      method: "POST",
      body: JSON.stringify(validEvent()),
    });

    const res = await postEvent(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.recorded).toBe(true);
    expect(json.data.eventId).toBeDefined();
  });

  it("accepts all valid event names", async () => {
    const names = [
      "listing_view",
      "listing_create",
      "trade_complete",
      "match_propose",
      "wallet_connect",
      "wallet_disconnect",
      "page_view",
    ];

    for (const name of names) {
      const req = makeRequest("http://localhost/api/v1/analytics/events", {
        method: "POST",
        body: JSON.stringify(validEvent({ name })),
      });
      const res = await postEvent(req);
      expect(res.status).toBe(200);
    }
  });

  it("rejects missing id", async () => {
    const event = validEvent();
    delete (event as Record<string, unknown>).id;

    const req = makeRequest("http://localhost/api/v1/analytics/events", {
      method: "POST",
      body: JSON.stringify(event),
    });

    const res = await postEvent(req);
    expect(res.status).toBe(400);
  });

  it("rejects an unknown event name", async () => {
    const req = makeRequest("http://localhost/api/v1/analytics/events", {
      method: "POST",
      body: JSON.stringify(validEvent({ name: "hack_attempt" })),
    });

    const res = await postEvent(req);
    expect(res.status).toBe(400);
  });

  it("rejects a malformed timestamp", async () => {
    const req = makeRequest("http://localhost/api/v1/analytics/events", {
      method: "POST",
      body: JSON.stringify(validEvent({ timestamp: "not-a-date" })),
    });

    const res = await postEvent(req);
    expect(res.status).toBe(400);
  });

  it("rejects non-JSON body", async () => {
    const req = makeRequest("http://localhost/api/v1/analytics/events", {
      method: "POST",
      body: "not-json",
    });

    const res = await postEvent(req);
    expect(res.status).toBe(400);
  });

  it("accepts an event with optional properties", async () => {
    const req = makeRequest("http://localhost/api/v1/analytics/events", {
      method: "POST",
      body: JSON.stringify(
        validEvent({ properties: { assetId: "gold", price: 2385 } }),
      ),
    });

    const res = await postEvent(req);
    expect(res.status).toBe(200);
  });
});

// ── GET /api/v1/analytics/events ───────────────────────────────────────────

describe("GET /api/v1/analytics/events", () => {
  it("returns a list of events", async () => {
    // Record one first
    await postEvent(
      makeRequest("http://localhost/api/v1/analytics/events", {
        method: "POST",
        body: JSON.stringify(validEvent({ name: "trade_complete" })),
      }),
    );

    const req = makeRequest("http://localhost/api/v1/analytics/events");
    const res = await getEvents(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.metadata.total).toBeGreaterThan(0);
  });

  it("respects the limit parameter", async () => {
    const req = makeRequest(
      "http://localhost/api/v1/analytics/events?limit=2",
    );
    const res = await getEvents(req);
    const json = await res.json();
    expect(json.data.length).toBeLessThanOrEqual(2);
  });

  it("filters by event name", async () => {
    // Record a wallet_connect event
    await postEvent(
      makeRequest("http://localhost/api/v1/analytics/events", {
        method: "POST",
        body: JSON.stringify(validEvent({ name: "wallet_connect" })),
      }),
    );

    const req = makeRequest(
      "http://localhost/api/v1/analytics/events?name=wallet_connect",
    );
    const res = await getEvents(req);
    const json = await res.json();

    for (const event of json.data) {
      expect(event.name).toBe("wallet_connect");
    }
  });
});
