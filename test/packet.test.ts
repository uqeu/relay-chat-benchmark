import { describe, expect, it } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { buildApp } from "../src/app.js";
describe("packet 4 public contract", () => { it("reopens durable state", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "packet-four-")), dbPath = path.join(dir, "db.sqlite"), password = "a-secure-password";
  let app = await buildApp({ dbPath }); await app.inject({ method: "POST", url: "/auth/register", payload: { email: "a@example.com", password } }); await app.close();
  app = await buildApp({ dbPath }); const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "a@example.com", password } });
  expect(login.statusCode).toBe(200); expect(fs.readFileSync(dbPath).includes(Buffer.from(password))).toBe(false); await app.close(); fs.rmSync(dir, { recursive: true });
}); });
