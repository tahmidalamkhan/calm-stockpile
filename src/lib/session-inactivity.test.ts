import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { inactivityState, readActivityTimestamp, usesInactivityLogout } from "./session-inactivity";

describe("Account inactivity security", () => {
  it("logs staff out after exactly ten minutes", () => {
    assert.equal(usesInactivityLogout("staff"), true);
    assert.equal(inactivityState(1000, 600999).expired, false);
    assert.equal(inactivityState(1000, 601000).expired, true);
  });
  it("applies the same ten-minute deadline to managers", () => {
    assert.equal(usesInactivityLogout("manager"), true);
    assert.equal(inactivityState(1000, 601000).expired, true);
  });
  it("never applies inactivity logout to admins", () => {
    assert.equal(usesInactivityLogout("admin"), false);
    assert.equal(usesInactivityLogout(null), false);
  });
  it("warns with sixty seconds left, after nine idle minutes", () => {
    assert.equal(inactivityState(1000, 540999).warning, false);
    assert.deepEqual(inactivityState(1000, 541000), { expired: false, warning: true, secondsRemaining: 60 });
    assert.equal(inactivityState(1000, 600000).secondsRemaining, 1);
  });
  it("renewed activity gives another full ten minutes", () => {
    assert.equal(inactivityState(541000, 541000).secondsRemaining, 600);
    assert.equal(inactivityState(541000, 601000).warning, false);
  });
  it("a tab resumed beyond its deadline is already expired", () => {
    assert.equal(inactivityState(1000, 900000).expired, true);
  });
  it("only accepts valid shared activity timestamps", () => {
    assert.equal(readActivityTimestamp("541000", 550000), 541000);
    for (const value of [null, "", "NaN", "0", "-1", "Infinity", "550001"]) {
      assert.equal(readActivityTimestamp(value, 550000), null);
    }
  });
});