import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
describe("packet 3 public contract", () => { it("isolates users", async () => {
  const app = await buildApp({ dbPath: ":memory:" });
  const token = async (email: string) => (await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "a-secure-password" } })).json().token;
  const a = await token("a@example.com"), b = await token("b@example.com");
  expect((await app.inject({ method: "GET", url: "/messages" })).statusCode).toBe(401);
  await app.inject({ method: "POST", url: "/messages", headers: { authorization: `Bearer ${a}` }, payload: { body: "private" } });
  const listed = await app.inject({ method: "GET", url: "/messages", headers: { authorization: `Bearer ${b}` } });
  expect(listed.json()).toEqual({ messages: [] }); await app.close();
}); });
