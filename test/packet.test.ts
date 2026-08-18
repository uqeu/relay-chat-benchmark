import { describe, expect, it } from "vitest";
import fs from "node:fs"; import { buildApp } from "../src/app.js";
describe("packet 7 public contract", () => { it("retains integrated health", async () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  expect(pkg.scripts.start).toBe("node dist/src/server.js");
  const app = await buildApp({ dbPath: ":memory:" }); const response = await app.inject({ method: "GET", url: "/health" });
  expect(response.json()).toEqual({ status: "ok" }); await app.close();
}); });
