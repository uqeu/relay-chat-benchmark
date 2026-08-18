import Fastify, { type FastifyInstance } from "fastify";
export type BuildOptions = { dbPath?: string; githubClient?: unknown };
export async function buildApp(_options: BuildOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.get("/health", async () => ({ status: "ok" }));
  return app;
}
