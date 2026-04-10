This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy this app is the [Vercel Platform](https://vercel.com/new).

### Required environment variables

Add these under **Project → Settings → Environment Variables** (at least for **Production**; add **Preview** if you use preview deployments):

| Variable | Notes |
| --- | --- |
| `SESSION_SECRET` | **Required.** At least 16 characters. Signs user session cookies. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase → Settings → API (anon, public) |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API (**service_role**, server-only) |
| `ADMIN_SESSION_SECRET` | **Required for `/admin`.** At least 16 characters; can be a second random string |

Copy from [`.env.example`](./.env.example) locally, then paste values into Vercel. Redeploy after saving.

Check out [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
