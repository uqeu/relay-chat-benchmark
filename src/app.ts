import jwt from "@fastify/jwt";
import { Octokit } from "@octokit/rest";
import argon2 from "argon2";
import Database from "better-sqlite3";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";

export type GitHubClient = {
  repos: {
    get(args: { owner: string; repo: string }): Promise<{
      data: {
        full_name: string;
        stargazers_count: number;
        html_url: string;
        description: string | null;
      };
    }>;
  };
};

export type BuildOptions = { dbPath?: string; githubClient?: GitHubClient };

type UserRow = { id: number; password_hash: string };
type MessageRow = { id: number; body: string; created_at: string; github_json: string | null };
type Identity = { sub: string };

const EMAIL = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
const AUTH_SCHEMA = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["email", "password"],
    properties: {
      email: { type: "string", pattern: EMAIL, maxLength: 320 },
      password: { type: "string", minLength: 12, maxLength: 256 },
    },
  },
} as const;
const MESSAGE_SCHEMA = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["body"],
    properties: { body: { type: "string", minLength: 1, maxLength: 2000, pattern: ".*\\S.*" } },
  },
} as const;

function schema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL,
      created_at TEXT NOT NULL, github_json TEXT
    );
  `);
}

function userId(request: FastifyRequest): number {
  const value = Number((request.user as Identity).sub);
  if (!Number.isInteger(value) || value < 1) throw new Error("invalid token subject");
  return value;
}

function message(row: MessageRow) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    github: row.github_json ? JSON.parse(row.github_json) : null,
  };
}

async function enrich(client: GitHubClient, text: string) {
  const match = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/.exec(text);
  if (!match?.[1] || !match[2]) return null;
  try {
    const { data } = await client.repos.get({ owner: match[1], repo: match[2] });
    return {
      fullName: data.full_name,
      stars: data.stargazers_count,
      url: data.html_url,
      description: data.description,
    };
  } catch {
    return null;
  }
}

function authHook() {
  return async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw Object.assign(new Error("unauthorized"), { statusCode: 401 });
    }
  };
}

export async function buildApp(options: BuildOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const db = new Database(":memory:");
  const client = options.githubClient ?? new Octokit({ auth: process.env.GITHUB_TOKEN }) as GitHubClient;
  schema(db);
  await app.register(jwt, { secret: process.env.JWT_SECRET ?? "benchmark-secret-at-least-thirty-two-chars" });
  const authenticate = authHook();

  app.get("/health", async () => ({ status: "ok" }));
  app.post<{ Body: { email: string; password: string } }>(
    "/auth/register", { schema: AUTH_SCHEMA }, async (request, reply) => {
      const email = request.body.email.toLowerCase();
      const passwordHash = await argon2.hash(request.body.password);
      try {
        const result = db.prepare("INSERT INTO users(email,password_hash) VALUES (?,?)")
          .run(email, passwordHash);
        return reply.code(201).send({ token: app.jwt.sign({ sub: String(result.lastInsertRowid) }) });
      } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE")) {
          return reply.code(409).send({ error: "email already registered" });
        }
        throw error;
      }
    });
  app.post<{ Body: { email: string; password: string } }>(
    "/auth/login", { schema: AUTH_SCHEMA }, async (request, reply) => {
      const row = db.prepare("SELECT id,password_hash FROM users WHERE email=?")
        .get(request.body.email.toLowerCase()) as UserRow | undefined;
      if (!row || !(await argon2.verify(row.password_hash, request.body.password))) {
        return reply.code(401).send({ error: "invalid credentials" });
      }
      return { token: app.jwt.sign({ sub: String(row.id) }) };
    });
  app.post<{ Body: { body: string } }>(
    "/messages", { preHandler: authenticate }, async (request, reply) => {
      const github = null;
      const createdAt = new Date().toISOString();
      const result = db.prepare(
        "INSERT INTO messages(user_id,body,created_at,github_json) VALUES (?,?,?,?)",
      ).run(userId(request), request.body.body, createdAt, github ? JSON.stringify(github) : null);
      return reply.code(201).send({ id: Number(result.lastInsertRowid), body: request.body.body,
        createdAt, github });
    });
  app.get("/messages", { preHandler: authenticate }, async (request) => {
    const rows = db.prepare(
      "SELECT id,body,created_at,github_json FROM messages WHERE user_id=? ORDER BY id",
    ).all(userId(request)) as MessageRow[];
    return { messages: rows.map(message) };
  });
  app.addHook("onClose", async () => db.close());
  return app;
}
