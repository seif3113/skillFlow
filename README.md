# SkillFlow

SkillFlow is a monorepo project built with **Next.js**, **NestJS GraphQL**, and **Fastify**.

It includes:

- A `web` app (Next.js + Apollo Client + shadcn/ui)
- An `api` app (NestJS + GraphQL via Mercurius + Fastify adapter)

## Tech Stack

- Frontend: `Next.js 16`, `React 19`, `Apollo Client`, `shadcn/ui`
- Backend: `NestJS 11`, `GraphQL`, `Mercurius`, `Fastify`
- Monorepo: `pnpm workspaces`, `Turborepo`
- Language: `TypeScript`

## Project Structure

```txt
skillFlow/
├─ apps/
│  ├─ web/   # Next.js frontend
│  └─ api/   # NestJS GraphQL API (Fastify)
├─ package.json
├─ pnpm-workspace.yaml
└─ turbo.json
```

## Prerequisites

- Node.js `>= 18`
- `pnpm` (project uses `pnpm@9`)

## Getting Started

### 1) Install dependencies

```bash
pnpm install
```

### 2) Run all apps in dev mode

```bash
pnpm dev
```

This runs all workspace `dev` scripts through Turborepo.

## App URLs

- Web app: [http://localhost:3000](http://localhost:3000)
- GraphQL API endpoint: [http://localhost:3001/graphql](http://localhost:3001/graphql)

## Run Individual Apps

### Web (Next.js)

```bash
pnpm --filter web dev
```

### API (NestJS + Fastify + GraphQL)

```bash
pnpm --filter api dev
```

## Useful Scripts

From the repository root:

- `pnpm dev` - run all apps in development
- `pnpm build` - build all workspaces
- `pnpm lint` - run lint tasks in all workspaces
- `pnpm check-types` - run type checks in all workspaces
- `pnpm format` - format `ts`, `tsx`, and `md` files

## GraphQL Notes

- Backend uses NestJS GraphQL with Mercurius at `/graphql`
- Frontend Apollo Client points to: `http://localhost:3001/graphql`
- CORS is configured to allow the web app origin: `http://localhost:3000`

## Current Feature Demo

The current demo in `apps/web` includes user management with GraphQL:

- List users
- Get single user by ID
- Create user
- Update user
- Delete user
