# AlphaView TV 🎬

> **Nigeria's premier streaming platform** — Buy once, stream for 30 days. DRM-protected. Anti-piracy. Built for Nollywood.

![AlphaView TV](https://img.shields.io/badge/AlphaView-TV-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSIuOWVtIiBmb250LXNpemU9IjkwIj7wn46cPC90ZXh0Pjwvc3ZnPg==)
![Next.js](https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-e0234e?style=flat-square&logo=nestjs)
![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Apps](#apps)
  - [Web App](#web-app-nextjs)
  - [Mobile App](#mobile-app-react-native--expo)
  - [API Backend](#api-backend-nestjs)
- [Security & DRM](#security--drm)
- [Payment Integration](#payment-integration)
- [Deployment](#deployment)
- [API Reference](#api-reference)

---

## Overview

AlphaView TV is a full-stack, production-ready video-on-demand platform built specifically for the Nigerian market. Producers upload and price their films; viewers purchase 30-day streaming access via Paystack.

### Key Features

| Feature | Details |
|---|---|
| **Pay-per-title** | Producers set their own price (₦500 – ₦50,000) |
| **30-day access** | Each purchase grants 30 days of streaming + offline access |
| **Multi-DRM** | Widevine (Android/Chrome) · FairPlay (iOS/Safari) · PlayReady (Windows) |
| **Anti-piracy** | Forensic watermarking · Screen-record blocking · Encrypted downloads |
| **Nigeria-first payments** | Paystack — Card, Bank Transfer, USSD, Mobile Money |
| **Producer portal** | Upload · Analytics · Country breakdown · Payout requests |
| **Admin portal** | Content moderation · User management · Payout approvals |
| **Cross-platform** | Web (Next.js) · iOS · Android (React Native + Expo) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│  Next.js Web App  │  React Native iOS  │  React Native Android  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / JWT
                    ┌──────▼──────┐
                    │ API Gateway │  (Kong / AWS API GW)
                    │ Rate limit  │  60 req/min per IP
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────────────┐
        │                  │                          │
   ┌────▼────┐       ┌─────▼─────┐            ┌──────▼──────┐
   │  Auth   │       │  Content  │            │  Streaming  │
   │ Service │       │  Service  │            │  Service    │
   └────┬────┘       └─────┬─────┘            └──────┬──────┘
        │                  │ S3 Upload                │ CloudFront
   ┌────▼────┐       ┌─────▼─────┐            ┌──────▼──────┐
   │Payment  │       │Transcode  │            │   BuyDRM    │
   │Service  │       │ Worker    │            │  License    │
   │Paystack │       │  FFmpeg   │            │   Server    │
   └────┬────┘       └───────────┘            └─────────────┘
        │
   ┌────▼──────────────────────────────────────────────┐
   │                  DATA LAYER                        │
   │  PostgreSQL  │  MongoDB  │  Redis  │  Elasticsearch│
   └────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend — Web
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | SSR/SSG web framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling with custom AlphaView design system |
| Shaka Player | HLS + DRM video playback |
| Zustand | Global state management |
| TanStack Query | Data fetching & caching |
| Framer Motion | Animations |
| Paystack Popup | Inline payment checkout |
| Recharts | Analytics charts |

### Frontend — Mobile
| Technology | Purpose |
|---|---|
| React Native + Expo | Cross-platform iOS & Android |
| react-native-video | DRM video playback (Widevine / FairPlay) |
| expo-screen-capture | Block screen recording |
| expo-secure-store | Encrypted token storage |
| react-native-mmkv | High-performance local storage |
| expo-file-system | Download manager |
| Firebase Messaging | Push notifications (FCM/APNs) |

### Backend
| Technology | Purpose |
|---|---|
| NestJS (Node.js) | Microservices API framework |
| TypeORM + PostgreSQL | Primary database |
| Mongoose + MongoDB | Analytics time-series data |
| Redis + Bull | Caching, queues, sessions |
| Elasticsearch | Full-text content search |
| FFmpeg | Video transcoding (HLS multi-bitrate) |
| AWS S3 + CloudFront | Video storage + CDN delivery |
| BuyDRM KeyOS | Multi-DRM license server |
| Paystack | Nigerian payment gateway |
| Termii | SMS OTP (Nigeria) |
| SendGrid | Transactional email |
| Firebase Admin | Push notifications |
| MaxMind GeoIP2 | Viewer country detection |
| AWS Secrets Manager | Encryption key management |

---

## Project Structure

```
alphaview/
├── apps/
│   ├── web/                    # Next.js web app (User + Producer + Admin)
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── (user pages)    # Home, Browse, Movie Detail, Player, Library
│   │   │   ├── producer/       # Producer portal (Dashboard, Upload, Analytics)
│   │   │   └── admin/          # Admin portal (Content, Users, Payouts)
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/api/            # API client functions
│   │   ├── store/              # Zustand stores
│   │   └── types/              # TypeScript interfaces
│   │
│   ├── api/                    # NestJS backend API
│   │   └── src/
│   │       ├── auth/           # JWT auth, OTP, refresh tokens
│   │       ├── content/        # Movie CRUD + S3 upload URLs
│   │       ├── streaming/      # DRM session + CloudFront signing
│   │       ├── payments/       # Paystack purchase + webhook
│   │       ├── producers/      # Producer profiles + payouts
│   │       ├── analytics/      # View tracking + country stats
│   │       ├── downloads/      # Encrypted offline downloads
│   │       ├── admin/          # Content approval + user management
│   │       ├── notifications/  # SMS (Termii) + Email + Push
│   │       ├── search/         # Elasticsearch integration
│   │       └── common/         # Shared guards, filters, decorators
│   │
│   └── mobile/                 # React Native (Expo) mobile app
│       └── src/
│           ├── screens/        # All app screens (Home, Player, Library…)
│           ├── navigation/     # Stack + Tab navigators
│           ├── services/       # API client
│           ├── store/          # Auth state (Zustand)
│           └── types/          # TypeScript interfaces
│
├── scripts/
│   └── init.sql                # PostgreSQL schema + seed data
├── docker-compose.yml          # Full local dev stack
├── turbo.json                  # Turborepo pipeline config
└── .env.example                # Environment variable template
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- Docker + Docker Compose
- iOS: Xcode 15+ / Android: Android Studio

### 1. Clone and install

```bash
git clone https://github.com/your-org/alphaview-tv.git
cd alphaview-tv

# Install all workspace dependencies
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your keys (Paystack, AWS, Termii, BuyDRM, etc.)
```

### 3. Start the full local stack

```bash
# Starts: PostgreSQL, MongoDB, Redis, RabbitMQ, Elasticsearch, API, Web
docker compose up -d

# View logs
docker compose logs -f api
docker compose logs -f web
```

### 4. Start development servers (without Docker)

```bash
# Terminal 1 — Start all infrastructure
docker compose up -d postgres mongo redis rabbitmq elasticsearch

# Terminal 2 — Start API in watch mode
cd apps/api && npm run start:dev

# Terminal 3 — Start web app
cd apps/web && npm run dev

# Terminal 4 — Start mobile app
cd apps/mobile && npx expo start
```

### 5. Access the apps

| App | URL | Credentials |
|---|---|---|
| Web App | http://localhost:3000 | Register a new account |
| Admin Portal | http://localhost:3000/admin | admin@alphaview.tv / Admin@AlphaView2024 |
| API Docs | http://localhost:3001/docs | — |
| RabbitMQ UI | http://localhost:15672 | alphaview / alphaview_dev |
| pgAdmin | http://localhost:5050 *(tools profile)* | admin@alphaview.tv / admin |

> **⚠️ Change the default admin password immediately after first login.**

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```bash
# Payment (required for purchases)
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

# DRM (required for video playback)
BUYDRM_API_KEY=base64_api_key
BUYDRM_LICENSE_URL=https://wv-keyos.licensekeyserver.com/

# AWS (required for video storage + CDN)
AWS_REGION=af-south-1
S3_RAW_BUCKET=alphaview-raw-uploads
S3_HLS_BUCKET=alphaview-hls-content
CLOUDFRONT_DOMAIN=cdn.alphaview.tv
CLOUDFRONT_KEY_PAIR_ID=APKA...
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."

# SMS OTP — Nigeria (required for registration)
TERMII_API_KEY=TLxxxxxxx
```

---

## Apps

### Web App (Next.js)

Three portals in one Next.js deployment:

#### User Portal (`/`)
- **Home** — Hero carousel, trending, new releases, producer spotlight
- **Browse** (`/movies`) — Filter by genre, type, sort; full-text search
- **Movie Detail** (`/movies/[id]`) — Synopsis, cast, producer, purchase CTA
- **Player** (`/player/[id]`) — DRM-protected HLS with forensic watermark, expiry countdown
- **Library** (`/library`) — Active & expired purchases, re-buy CTA
- **Downloads** (`/downloads`) — Offline files with expiry status

#### Producer Portal (`/producer/*`)
- **Dashboard** — Revenue, views, country breakdown, top content table
- **Upload** (`/producer/upload`) — Multi-step: metadata → media files → review → submit
- **Content** (`/producer/content`) — Manage all titles, status, stats
- **Analytics** (`/producer/analytics`) — Revenue charts, device split, geo heatmap
- **Earnings** (`/producer/earnings`) — Balance, bank account setup, payout history
- **Payouts** (`/producer/payouts`) — Request withdrawals, track status

#### Admin Portal (`/admin/*`)
- **Dashboard** — Platform KPIs, revenue chart, action queue
- **Content** (`/admin/content`) — Approve / reject uploaded films
- **Users** (`/admin/users`) — Search, ban/unban
- **Producers** (`/admin/producers`) — Verify, suspend, set commission rate
- **Payouts** (`/admin/payouts`) — Approve → triggers Paystack bank transfer
- **Payments** (`/admin/payments`) — Transaction ledger

### Mobile App (React Native + Expo)

Supports **iOS** and **Android** from one codebase.

#### Screens
| Screen | Description |
|---|---|
| **HomeScreen** | Hero carousel + content rows |
| **BrowseScreen** | Grid browse with genre + sort filters |
| **MovieDetailScreen** | Full detail with purchase flow |
| **PlayerScreen** | DRM video player (Widevine/FairPlay) with screen capture blocking |
| **LibraryScreen** | Purchased films — active vs expired tabs |
| **DownloadsScreen** | Encrypted offline files |
| **SearchScreen** | Full-text search with recent history (MMKV) |
| **ProducerProfileScreen** | Producer bio, stats, follow button, content grid |
| **ProfileScreen** | User account, settings, sign out |
| **LoginScreen** | Email + password with gradient design |
| **RegisterScreen** | Multi-step: details → OTP → success |

#### Build for production

```bash
cd apps/mobile

# iOS
eas build --platform ios

# Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### API Backend (NestJS)

Base URL: `https://api.alphaview.tv/v1`  
Swagger docs: `/docs` (non-production only)

#### Module overview

| Module | Responsibility |
|---|---|
| `AuthModule` | JWT + refresh tokens, OTP via Termii, Google OAuth |
| `UsersModule` | Profile management, device token registration |
| `ContentModule` | CRUD, S3 pre-signed uploads, FFmpeg transcoding queue |
| `StreamingModule` | CloudFront signed URLs, BuyDRM license issuance, heartbeats |
| `PaymentsModule` | Paystack initiation, HMAC webhook verification, producer credit |
| `ProducersModule` | Studio profiles, follow system, payout requests |
| `AnalyticsModule` | MongoDB time-series view events, country/revenue aggregation |
| `DownloadsModule` | Encrypted offline authorisation, AWS Secrets Manager key lifecycle |
| `AdminModule` | Content approval, user management, payout processing |
| `NotificationsModule` | Termii SMS, SendGrid email, Firebase push |
| `SearchModule` | Elasticsearch indexing + full-text search |
| `HealthModule` | `/v1/health` endpoint for load balancer probes |

---

## Security & DRM

### Multi-DRM Coverage

| DRM System | Platforms |
|---|---|
| **Widevine** (Google) | Android, Chrome, Firefox |
| **FairPlay** (Apple) | iOS, iPadOS, Safari on macOS |
| **PlayReady** (Microsoft) | Windows, Edge |

All three are served from a single **BuyDRM KeyOS** integration. The DRM license server receives the purchase expiry timestamp and bakes it into the license — after 30 days the license server refuses renewal and playback stops automatically.

### Anti-Piracy Layers

1. **Forensic watermarking** — User ID embedded in every stream segment. Leaked content can be traced to the exact account.
2. **Screen recording blocking** — `FLAG_SECURE` on Android (OS-level); `UIScreen.isCaptured` detection on iOS with black overlay.
3. **Signed stream URLs** — CloudFront pre-signed URLs expire in 6 hours. Raw S3 paths are never exposed.
4. **Encrypted downloads** — AES-256 per-device key stored in AWS Secrets Manager. Key is deleted when 30-day window closes. Without the key, the downloaded file is permanently unplayable.
5. **Device binding** — Download keys are tied to a device fingerprint. A key issued for Device A won't decrypt files on Device B.

### 30-Day Access Enforcement

- **Cron job** runs every hour and marks expired purchases as `expired`
- **Download keys** are revoked in AWS Secrets Manager by the same cron
- **DRM license server** independently checks the expiry — it won't issue new licenses after the window closes
- **Mobile app** checks key validity from the server before every offline playback attempt

---

## Payment Integration

### Purchase Flow

```
User clicks "Buy" → POST /purchases/initiate
                   → Paystack checkout opens
                   → User pays (card / bank / USSD / mobile money)
                   → Paystack fires webhook to /payments/webhook
                   → HMAC-SHA512 signature verified
                   → Purchase marked active (30-day window opens)
                   → Producer earnings ledger credited (amount × producer share %)
                   → User receives email + SMS confirmation
```

### Producer Payout Flow

```
Producer requests withdrawal → POST /producer/payouts/request
                             → Admin reviews in portal
                             → Admin approves → POST /admin/payouts/:id/approve
                             → Paystack Transfer API initiates bank transfer
                             → transfer.success webhook confirms payment
                             → Producer notified via email + push
```

### Supported Payment Channels (Nigeria)

- Debit / Credit card (Visa, Mastercard, Verve)
- Bank transfer (all major Nigerian banks)
- USSD (`*737#`, `*901#`, `*966#`)
- Mobile money (OPay, Palmpay, PocketApp)

---

## Deployment

### Production stack (AWS af-south-1 — Cape Town)

```
                    Cloudflare (CDN + DDoS)
                           │
              ┌────────────▼────────────┐
              │    AWS Application      │
              │    Load Balancer        │
              └────────┬────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐  ┌─────▼─────┐  ┌───▼────┐
    │  ECS /  │  │  ECS /    │  │  ECS / │
    │  EKS    │  │  EKS      │  │  EKS   │
    │  (API)  │  │  (Web)    │  │(Worker)│
    └────┬────┘  └─────┬─────┘  └───┬────┘
         │             │             │
    ┌────▼─────────────▼─────────────▼────┐
    │           AWS Managed Services       │
    │  RDS PostgreSQL  │  ElastiCache      │
    │  DocumentDB      │  OpenSearch       │
    └──────────────────────────────────────┘
```

### Deploy with GitHub Actions

Push to `main` triggers the CI/CD pipeline:

1. ✅ Run Jest tests
2. 🔨 Build Docker images → push to ECR
3. 🚀 Rolling deploy to EKS
4. 🗄️ Run database migrations
5. 📢 Slack notification

```bash
# Manual deploy
git push origin main
```

### Environment-specific deploys

```bash
# Staging
git push origin staging

# Production (requires PR + review)
gh pr create --base main
```

---

## API Reference

Full Swagger docs available at `/docs` when running locally.

### Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

Access tokens expire in **15 minutes**. Use the refresh token (httpOnly cookie) to get a new one:
```
POST /v1/auth/refresh
```

### Key Endpoints

```
POST   /v1/auth/register          Register new user (returns OTP pinId)
POST   /v1/auth/verify-otp        Verify phone OTP → returns JWT tokens
POST   /v1/auth/login             Email + password login
POST   /v1/auth/refresh           Rotate access token

GET    /v1/content                Browse catalogue (paginated, filterable)
GET    /v1/content/home           Home page data (featured, trending, etc.)
GET    /v1/content/:id            Movie detail + related content
GET    /v1/content/search?q=      Full-text search

POST   /v1/purchases/initiate     Start Paystack checkout
POST   /v1/payments/webhook       Paystack webhook (HMAC verified)
GET    /v1/purchases/library      User's purchased films

POST   /v1/stream/:id/session     Request DRM playback session
POST   /v1/stream/:id/drm-license Forward license request to BuyDRM
POST   /v1/stream/:id/heartbeat   30-second analytics ping

POST   /v1/downloads/:id/authorise Authorise encrypted download
GET    /v1/downloads/:keyId/key   Fetch decryption key (checks expiry)

GET    /v1/producer/dashboard     Producer stats summary
POST   /v1/producer/payouts/request Request bank withdrawal
GET    /v1/admin/content          List all content (admin)
PATCH  /v1/admin/content/:id/approve Approve → publish content
POST   /v1/admin/payouts/:id/approve Trigger producer bank transfer
```

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes with proper TypeScript types
3. Run tests: `npm test`
4. Submit a PR targeting `main` with a clear description

### Code style

- TypeScript strict mode throughout
- NestJS modules — one responsibility per module
- React components — functional only, hooks for all state
- No `any` types in production code

---

## Licence

Proprietary — All rights reserved © 2024 AlphaView TV Limited.

---

## Support

- **Technical issues**: engineering@alphaview.tv  
- **Producer support**: producers@alphaview.tv  
- **General**: hello@alphaview.tv
