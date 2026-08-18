import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
describe("packet 5 public contract", () => { it("rejects invalid inputs", async () => {
  const app = await buildApp({ dbPath: ":memory:" });
  expect((await app.inject({ method: "POST", url: "/auth/register", payload: { email: "bad", password: "a-secure-password" } })).statusCode).toBe(400);
  const registered = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "a@example.com", password: "a-secure-password" } }); const token = registered.json().token;
  expect((await app.inject({ method: "POST", url: "/messages", headers: { authorization: `Bearer ${token}` }, payload: { body: "   " } })).statusCode).toBe(400); await app.close();
}); });
