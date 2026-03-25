# Kiddies Content

A parental content control middleware platform. Children can **only** access YouTube through this app — parents curate every video their children watch, and a community recommendation engine suggests content based on parents with similar religion, income, and region.

---

## Architecture

```
┌────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Kiddies Kids  │    │  Kiddies Parent  │    │  Parent Web App │
│  (React Native)│    │  (React Native)  │    │  (Next.js 14)   │
└───────┬────────┘    └────────┬─────────┘    └────────┬────────┘
        │                      │                        │
        └──────────────────────┴────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    API Gateway       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼──────┐ ┌───────▼──────┐
    │  Auth Service  │ │  API Service │ │  Workers     │
    │  :3002         │ │  :3001       │ │  Rec+Notify  │
    └─────────┬──────┘ └──────┬──────┘ └───────┬──────┘
              │                │                │
              └────────────────┴────────────────┘
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
    ┌─────────▼──┐  ┌──────────▼──┐  ┌──────────▼──┐
    │ PostgreSQL  │  │   Redis      │  │ YouTube API │
    │ + pgvector  │  │  + BullMQ   │  │  v3         │
    └─────────────┘  └─────────────┘  └─────────────┘
```

## How Content Gating Works

```
1. Child opens app → sees ONLY approved content from parent
2. Child finds a video they want → clicks "Ask Parent"
3. Parent gets push notification instantly
4. Parent reviews: thumbnail, title, channel, AI safety score
5. Parent taps Approve → child gets notification → video appears in library
6. Child watches in locked WebView (no YouTube navigation escape)
7. Screen time is tracked; session ends when limit reached
```

## How the Recommendation Engine Works

```
1. Parent sets profile: religion, income bracket, region
2. Engine computes similarity between all parent profiles
3. Finds 200 most similar parents (weighted: religion 35%, income 25%, region 25%, language 15%)
4. Aggregates what those parents approved for children in same age group
5. Scores content: community approval 40%, watch history 25%, parent patterns 15%, category 10%, trending 10%
6. Filters: removes already-approved, recently-watched, blocked categories/channels
7. Top 30 safe recommendations refreshed every 6 hours
```

---

## Quick Start

### Prerequisites
- Node.js >= 20
- Docker + Docker Compose
- A YouTube Data API v3 key (optional for dev, required for production)

### 1. Clone and install

```bash
git clone <repo-url>
cd kiddies-content
cp .env.example .env
npm install
```

### 2. Start infrastructure

```bash
npm run docker:up
# This starts: PostgreSQL, Redis, BullMQ board (port 3333)
```

### 3. Run database migrations

```bash
npm run db:generate   # generate SQL from schema
npm run db:migrate    # apply migrations
```

### 4. Seed sample data

```bash
npm run --workspace=packages/db db:seed
# Creates: 2 parents, 3 children, 10 YouTube videos, sample approvals
```

### 5. Start all services

```bash
npm run dev
# Starts: API :3001, Auth :3002, Web :3000, Recommendation worker, Notification worker
```

### 6. Access

| Service | URL |
|---|---|
| Parent Web Dashboard | http://localhost:3000 |
| API | http://localhost:3001/health |
| Auth | http://localhost:3002/health |
| BullMQ Dashboard | http://localhost:3333 |
| PostgreSQL | localhost:5432 |

**Default seed credentials:**
- Parent 1: `parent1@example.com` / `Password123!`
- Parent 2: `parent2@example.com` / `Password123!`
- Child PIN: `1234`

---

## Environment Setup

Copy `.env.example` to `.env` and fill in:

```env
# Required
DATABASE_URL=postgresql://kiddies:kiddies_secret@localhost:5432/kiddies_content
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_32_char_minimum_secret_here

# YouTube (get from Google Cloud Console)
YOUTUBE_API_KEY=AIza...

# Firebase (for push notifications - get from Firebase Console)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@...iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

# Email (SMTP - for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

---

## YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **YouTube Data API v3**
4. Create credentials → **API Key**
5. Restrict the key to YouTube Data API v3
6. Add to `.env` as `YOUTUBE_API_KEY`

For OAuth (parent account linking):
1. Create **OAuth 2.0 Client ID** (Web application)
2. Add redirect URI: `http://localhost:3001/api/v1/parent/platforms/youtube/callback`
3. Add `YOUTUBE_OAUTH_CLIENT_ID` and `YOUTUBE_OAUTH_CLIENT_SECRET` to `.env`

---

## Firebase Setup (Push Notifications)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Add iOS and Android apps with your bundle identifiers
4. Go to Project Settings → Service Accounts → Generate new private key
5. Add credentials to `.env`
6. Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) to respective app folders

---

## Project Structure

```
kiddies-content/
├── apps/
│   ├── mobile-child/          # React Native - child app (Expo)
│   │   ├── app/               # Expo Router screens
│   │   │   ├── (auth)/        # Login screen
│   │   │   ├── (tabs)/        # Home, Library, Requests, Profile
│   │   │   └── watch/         # Video player (locked WebView)
│   │   └── src/               # Stores, API client
│   │
│   ├── mobile-parent/         # React Native - parent app (Expo)
│   │   └── app/(tabs)/        # Requests, Children, Settings
│   │
│   └── web-parent/            # Next.js 14 - parent dashboard
│       └── src/app/
│           ├── (auth)/        # Login, Register
│           └── (dashboard)/   # Dashboard, Requests, Children, Recommendations, Settings
│
├── services/
│   ├── api/                   # Main Fastify API (:3001)
│   │   └── src/routes/        # parent, child, content routes
│   ├── auth/                  # Auth microservice (:3002)
│   ├── recommendation/        # BullMQ worker - recommendation engine
│   └── notification/          # BullMQ worker - push/email notifications
│
├── packages/
│   ├── db/                    # Drizzle ORM schema + migrations
│   │   └── src/schema.ts      # All 15 database tables
│   ├── types/                 # Shared TypeScript types
│   ├── youtube-client/        # YouTube Data API v3 wrapper (safety enforced)
│   └── ui/                    # Shared React Native components
│
├── infrastructure/
│   └── docker/                # docker-compose.yml, Dockerfiles, init.sql
│
├── .env.example               # Environment template
├── turbo.json                 # Turborepo config
└── README.md
```

---

## Mobile App Development

### Child App

```bash
cd apps/mobile-child
npx expo start
```

Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_AUTH_URL` in `apps/mobile-child/.env`.

### Parent App

```bash
cd apps/mobile-parent
npx expo start
```

---

## COPPA Compliance

This platform is designed with COPPA compliance for children under 13:

- Children **never self-register** — all child accounts are created by parents
- No email, full name, or PII collected from children
- No third-party analytics SDKs in child app sessions
- Community data only aggregated when ≥10 parents in a demographic bucket
- One-click data export and deletion available to parents
- All child data is linked to parent for deletion cascade
- Child tokens have `role: child` scope — cannot access parent endpoints

---

## App Store Deployment

### iOS (Apple App Store)
- Submit `mobile-child` under the **Kids** category
- Apple applies additional privacy review for Kids category apps
- No third-party SDKs that share data with external parties in child app
- Parental consent screen must appear before any data collection

### Android (Google Play)
- Submit under **Google Play Families** program
- Both apps require Families policy compliance
- Age group targeting: "Ages 5 and under" / "Ages 6-8" / "Ages 9-12"

---

## Security Features

- JWT RS256 tokens (parent 15min access / 30 day refresh, child 8h)
- PIN attempts: 5 failures = 15-minute lockout
- YouTube API key server-side only, never exposed to clients
- OAuth tokens encrypted at rest (AES-256-GCM)
- WebView: certificate pinning, navigation intercept, no "Watch on YouTube" links
- AI safety score threshold (0.7 default) — unsafe content blocked automatically
- Community data anonymized — no individual parent approval decisions exposed

---

## License

Proprietary — All rights reserved. Unauthorized use, distribution, or modification is prohibited.
Built with ❤️ for safer childhoods.
