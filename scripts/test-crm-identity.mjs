import assert from "node:assert/strict";
import test from "node:test";
import { contactEmailFromRoute } from "../app/crm/identity.ts";

test("Vercel's encoded route parameter resolves the actual archived email", () => {
  assert.equal(contactEmailFromRoute("ana%40example.org"), "ana@example.org");
  assert.equal(contactEmailFromRoute("ana%2Bedit%40example.org"), "ana+edit@example.org");
});

test("an already decoded email containing a percent escape keeps its identity", () => {
  assert.equal(contactEmailFromRoute("sales%40team@example.org"), "sales%40team@example.org");
  assert.equal(contactEmailFromRoute("Ana+Edit@Example.org"), "ana+edit@example.org");
});

test("malformed and double-encoded parameters cannot resolve another contact", () => {
  assert.equal(contactEmailFromRoute("bad%ZZ%40example.org"), null);
  assert.notEqual(contactEmailFromRoute("ana%2540example.org"), "ana@example.org");
});
