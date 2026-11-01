import assert from "node:assert/strict";
import test from "node:test";
import { freshSeed } from "../src/lib/seed";
import { trackingService } from "../src/lib/services";

test("mock tracking is deterministic, pausable, and uses separate journeys", () => {
  let state = trackingService.initialize(freshSeed(), "SV1042", "assignment-demo", "r1", "b1");
  const first = trackingService.active(state, "SV1042")!;
  assert.equal(first.phase, "pickup");
  assert.deepEqual(first.waypoints, trackingService.routeFor(first.waypoints[0], first.pickup));
  state = trackingService.start(state, "SV1042", "r1");
  state = trackingService.advance(state, "SV1042", "r1", 450);
  assert.equal(trackingService.active(state, "SV1042")?.progress, .5);
  state = trackingService.pause(state, "SV1042", "r1");
  assert.throws(() => trackingService.advance(state, "SV1042", "r1", 1), /cannot advance/);
  state = trackingService.resume(state, "SV1042", "r1");
  state = trackingService.advance(state, "SV1042", "r1", 900);
  state = trackingService.beginDelivery(state, "SV1042", "r1");
  assert.equal(trackingService.active(state, "SV1042")?.phase, "delivery");
});

test("tracking rejects duplicate sessions and terminal sessions cannot resume", () => {
  let state = trackingService.initialize(freshSeed(), "SV1042", "assignment-demo", "r1", "b1");
  assert.throws(() => trackingService.initialize(state, "SV1042", "other", "r2", "b1"), /already exists/);
  state = trackingService.stop(state, "SV1042", "Cancelled");
  assert.equal(trackingService.active(state, "SV1042"), undefined);
  assert.throws(() => trackingService.start(state, "SV1042", "r1"), /cannot start/);
});
