import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
describe("packet 2 public contract", () => { it("registers and refuses a wrong password", async () => {
  const app = await buildApp({ dbPath: ":memory:" });
  const registration = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "A@example.com", password: "a-secure-password" } });
  const wrong = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "a@example.com", password: "wrong-password-value" } }); // estelle:allow-secret
  expect(registration.statusCode).toBe(201); expect(wrong.statusCode).toBe(401); await app.close();
}); });
