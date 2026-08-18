import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
describe("packet 6 public contract", () => { it("calls GitHub exactly", async () => {
  const get = vi.fn(async () => ({ data: { full_name: "octo/demo", stargazers_count: 42, html_url: "https://github.com/octo/demo", description: null } }));
  const app = await buildApp({ dbPath: ":memory:", githubClient: { repos: { get } } });
  const registered = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "a@example.com", password: "a-secure-password" } }); const token = registered.json().token;
  const response = await app.inject({ method: "POST", url: "/messages", headers: { authorization: `Bearer ${token}` }, payload: { body: "see https://github.com/octo/demo" } });
  expect(get).toHaveBeenCalledWith({ owner: "octo", repo: "demo" }); expect(response.json().github.fullName).toBe("octo/demo"); await app.close();
}); });
