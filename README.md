# Constitutional Amendment Tracker

Tracks proposed amendments to the U.S. Constitution in the 119th Congress (2025-2027). Live at [constitutional-amendments-topaz.vercel.app](https://constitutional-amendments-topaz.vercel.app).

## How it works

A Vercel serverless function (`api/amendments.js`) queries the Congress.gov API for House and Senate joint resolutions whose titles indicate a constitutional amendment. It fetches sponsor and cosponsor details for each, then returns the full list as JSON. The frontend (`public/index.html`) fetches that endpoint and renders amendment cards.

API responses are cached at the edge for 1 hour (`s-maxage=3600, stale-while-revalidate`).

## Project structure

```
api/
  amendments.js    # Serverless function — fetches from Congress.gov API
public/
  index.html       # Frontend (vanilla HTML/JS)
  styles.css       # Styles
vercel.json        # Vercel config (routing, function settings)
```

## Local development

1. Get a free API key from [api.congress.gov](https://api.congress.gov/sign-up/)

2. Install the [Vercel CLI](https://vercel.com/docs/cli) if you don't have it:
   ```
   npm i -g vercel
   ```

3. Link the project and pull environment variables:
   ```
   vercel link
   vercel env pull
   ```
   This creates `.env.local` with `CONGRESS_API_KEY`. Alternatively, create it manually:
   ```
   echo "CONGRESS_API_KEY=your-key-here" > .env.local
   ```

4. Start the dev server:
   ```
   npm run dev
   ```
   The site will be available at `http://localhost:3000`.

## Deployment

Pushes to `main` auto-deploy via Vercel. No build step needed — the frontend is static HTML and the API is a single serverless function.

## Environment variables

| Variable | Description |
|---|---|
| `CONGRESS_API_KEY` | API key from [api.congress.gov](https://api.congress.gov/sign-up/) |

Set this in Vercel project settings under Environment Variables.
