# Build task: Relay Chat API

Build the complete service in this repository. Do not merely explain or scaffold it.

Use the exact dependencies and versions already pinned in `package.json`; consult their real current APIs
when needed. Implement a TypeScript/Fastify chat API with:

- JWT registration and login using Argon2 password hashes;
- SQLite persistence through `better-sqlite3`;
- authenticated, per-user message creation and listing;
- GitHub URL enrichment through `@octokit/rest` when a message contains
  `https://github.com/<owner>/<repo>`;
- explicit validation and stable error responses;
- tests for the important success and refusal paths.

Export `buildApp(options?)` from `src/app.ts`. Options are:

```ts
type GitHubClient = {
  repos: {
    get(args: { owner: string; repo: string }): Promise<{
      data: { full_name: string; stargazers_count: number; html_url: string; description: string | null };
    }>;
  };
};

type BuildOptions = { dbPath?: string; githubClient?: GitHubClient };
```

When no client is injected, construct a real `Octokit` client, using `GITHUB_TOKEN` only when present.

Required HTTP contract:

- `GET /health` → 200 `{ "status": "ok" }`.
- `POST /auth/register` with `{email,password}` → 201 `{token}`; duplicate email → 409.
- `POST /auth/login` → 200 `{token}`; wrong credentials → 401.
- `POST /messages` with Bearer JWT and `{body}` → 201 message.
- `GET /messages` with Bearer JWT → 200 `{messages:[...]}` for that user only.
- Missing/invalid auth → 401. Invalid payload → 400.
- A GitHub API failure must not lose the chat message: return 201 with `github: null`.

Each message has `{id, body, createdAt, github}`. Enrichment is either `null` or
`{fullName, stars, url, description}`. Email is case-normalised. Passwords require at least 12 characters;
message bodies are nonblank and at most 2,000 characters.

Provide `npm run build`, `npm test`, and `npm start`. Finish only after running the build and tests.

