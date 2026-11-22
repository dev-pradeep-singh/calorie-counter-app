# 🥗 Calzy — AI Calorie Tracker

> Calzy is an AI-powered calorie tracker for lazy people. Just snap a photo or describe your meal, and Calzy estimates calories and macros instantly so you can log food with minimal effort.

🌐 **Try it now:** [calorie-counter-app-theta.vercel.app](https://calorie-counter-app-theta.vercel.app)

---

## 🤔 Why Calzy?

Counting calories is boring. Manually searching for food, weighing portions, entering numbers — nobody wants to do that.

Calzy fixes this. Take a photo of your plate, and AI figures out the rest in seconds.

---

## ✨ What Can It Do?

- 📸 **Snap & Analyze** — Take a photo or pick one from your gallery. Calzy identifies the food and estimates calories and macros instantly
- ✍️ **Describe It** — No photo? Just type what you ate and Calzy does the math
- 💡 **Smart Hints** — Not sure AI will recognize your home-cooked dish? Add a quick hint like "dal makhani" to help it
- 📋 **Daily Log** — All your meals are saved and shown on your home screen with a running calorie total
- 📊 **Weekly Progress** — See your calorie history for the past 7 days, streaks, and averages
- 🗑️ **Easy Corrections** — Swipe left or tap a meal to delete it, with Undo if you change your mind
- ⚖️ **Portion Sizes** — Ate half, or seconds? Adjust the portion before adding it
- 🌙 **Dark Mode** — Follows your phone's light or dark setting
- ☁️ **Your Data, Everywhere** — Create an account and access your log from any device
- 💡 **Nutrition Tips** — Every meal comes with a short tip on how to make it healthier

---

## 📱 How To Use

1. **Sign up** with your email and password
2. **Set your goal** — enter your name and daily calorie target
3. **Tap "Snap"** from the bottom nav
4. **Take or choose a photo** of your meal (or just describe it in text)
5. **Hit "Analyze with AI"** — get calories + macros in seconds
6. **Tap "Add to Today's Log"** to save it
7. **Check your progress** anytime from the Progress tab

---

## 🍽️ Works Great For

- Home-cooked meals
- Restaurant food
- Packaged food (just snap the nutrition label!)
- Any meal you can photograph or describe

---

## 🛠️ For Developers

### Architecture

```
Browser (React SPA, frontend/)
   │  Supabase Auth only: sign in / sign up / session
   │  fetch /api/v1/*  with  Authorization: Bearer <Supabase access token>
   ▼
FastAPI (Vercel Python function: api/index.py → backend/)
   ├── verifies the token against Supabase's signing keys (JWKS)
   ├── reads/writes Supabase (PostgREST) with the user's own token → row-level security applies
   └── calls Claude for meal analysis (API key stays on the server)
```

Both run in one Vercel project: `vercel.json` builds `frontend/` into `frontend/dist`, routes `/api/health` and `/api/v1/*` to FastAPI, and sends every other path to the single-page app.

| Path | What |
|---|---|
| `backend/` | FastAPI app: `auth.py` (token check), `db.py` (Supabase as the user), `routers/`, `services/` (Claude, stats), `tests/` |
| `api/index.py` | Vercel entry point (`from backend.main import app`) |
| `frontend/src/` | React app: `pages/`, `components/`, `hooks/data.ts` (TanStack Query), `lib/api.ts` (typed client), `styles/app.css` (design tokens, light + dark) |

### Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | backend + frontend build | Public |
| `SUPABASE_ANON_KEY` | backend + frontend build | Public (protected by RLS). The frontend build fails if either is missing |
| `ANTHROPIC_API_KEY` | backend | Secret |
| `ANTHROPIC_MODEL` | backend | Optional, default `claude-sonnet-5` |
| `SUPABASE_JWT_SECRET` | backend | Only if the Supabase project still signs tokens with the legacy HS256 secret |
| `DAILY_SCAN_LIMIT` | backend | Optional, default `3`: AI scans per user per UTC day. `0` turns the limit off |

### Database migrations

SQL for the Supabase project lives in `supabase/migrations/`. Run each file once in Supabase → SQL Editor (they are safe to re-run).

- `20261122_scan_usage.sql`: the daily AI scan counter. Until it has run, the API logs a warning and does not enforce the limit.

Locally, put them in a repo-root `.env` (see `.env.example`); both the backend and Vite read it.

### Run locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # fill in the values
uvicorn backend.main:app --reload --port 8000
```

```bash
cd frontend && npm install
npm run dev                     # http://localhost:5173, proxies /api to :8000
```

- Health check: `curl localhost:8000/api/health` → `{"status":"ok"}`. API docs: http://localhost:8000/api/v1/docs
- **Demo mode** (no login or backend needed): http://localhost:5173/?demo — fake session and in-memory data for designing screens. `?demo=new` shows onboarding, `?demo=empty` an empty day, `?nodemo` turns it off. Dev builds only.
- After changing backend schemas: `npm run gen:api` (in `frontend/`) regenerates the typed API client.

### Tests

```bash
pytest backend/tests            # Supabase and Anthropic are mocked
cd frontend && npm run build    # typecheck + production build
```

### Deploy

Every push to a branch gets a Vercel preview; merging into `master` deploys production. To roll back, use **Promote to Production** on an earlier deployment in Vercel, or revert the merge commit.

---

## 📄 License

MIT
