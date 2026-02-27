# SpearlanceOS

Spearlance's client portal for managing all marketing services.

## Stack

- **Framework:** React + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (auth, database, edge functions, storage)
- **AI:** OpenRouter (Claude Sonnet, Gemini Flash)
- **Payments:** Stripe
- **Scheduling:** Cal.com
- **Deployment:** Vercel

## Development

```sh
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```sh
cp .env.example .env
```

See `.env.example` for all required variables. For Vercel deployment, set these in the Vercel dashboard under Project Settings > Environment Variables.

## Deployment

Deployed on Vercel. Pushes to `main` trigger automatic production deploys.

Custom domain: `os.spearlance.com`
