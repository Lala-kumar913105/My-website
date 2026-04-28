This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Run the development server from the repository root (recommended):

```bash
npm run dev
```

or directly inside `frontend/`:

```bash
npm run dev
```

Stop the running frontend dev server:

```bash
npm run dev:stop
```

Restart the frontend dev server safely:

```bash
npm run dev:restart
```

### Why this is the correct workflow

- `frontend/package.json` + `frontend/package-lock.json` are the source of truth for the Next.js app.
- root-level `npm run dev` forwards to `frontend` so you always run the right app.
- `frontend` dev uses `scripts/dev-safe.mjs` which:
  - prevents accidental duplicate `next dev` sessions,
  - safely removes stale `frontend/.next/dev/lock` when no real frontend dev process exists.
- `dev:stop` safely shuts down tracked and stray frontend `next dev` processes and clears stale lock files when safe.
- `dev:restart` runs `dev:stop` first, then starts the frontend again with `dev-safe`.

If you truly need raw Next behavior, use:

```bash
npm run dev:raw
```

Open your deployed frontend URL (or local dev URL) in your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
