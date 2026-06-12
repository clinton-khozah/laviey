# Lavey Frontend Architecture

This document describes how the codebase is organized for long-term maintainability.

## Layer overview

```
┌─────────────────────────────────────────────────────────┐
│  app/          Entry shell, routing (future)            │
├─────────────────────────────────────────────────────────┤
│  features/     Feature pages + containers (smart)       │
├─────────────────────────────────────────────────────────┤
│  components/   Reusable UI (dumb / presentational)      │
├─────────────────────────────────────────────────────────┤
│  hooks/        React state tied to services             │
├─────────────────────────────────────────────────────────┤
│  services/     API communication only                   │
├─────────────────────────────────────────────────────────┤
│  types/        Shared TypeScript contracts              │
│  constants/    Endpoints, nav config                    │
│  config/       Environment & API base URL               │
└─────────────────────────────────────────────────────────┘
```

**Rule of thumb:** UI components never call `fetch` directly. They receive data via props or use hooks that delegate to `services/`.

## Folder structure

```
src/
├── app/                    # Application bootstrap
├── config/                 # env.ts, api.config.ts
├── constants/              # API_ENDPOINTS, navigation
├── types/                  # Domain & API types
│   ├── api/
│   └── domain/
├── services/               # Backend communication
│   ├── api/                # httpClient, ApiError
│   ├── profile/            # profileService
│   ├── match/              # matchService
│   ├── subscription/       # flameQuotaService
│   └── mocks/              # Dev-only mock data
├── hooks/                  # useDiscoverFeed, useMatchActions, …
├── features/               # Feature modules
│   └── discover/
│       ├── pages/          # Route-level composition
│       └── containers/     # Smart components (hooks + UI)
├── components/             # Shared reusable UI
│   ├── feed/               # FeedItem, VerticalFeed, …
│   ├── layout/             # AppShell, TopBar, BottomNav
│   └── ui/                 # FeedState, buttons, …
└── utils/                  # Pure helpers (sleep, formatters)
```

## Component convention

Each reusable component lives in its own folder:

```
components/feed/FeedItem/
├── FeedItem.tsx          # Component implementation
├── FeedItem.css          # Scoped styles
├── FeedItem.types.ts     # Props interface
└── index.ts              # Public exports
```

Import via the barrel: `import { FeedItem } from '@/components/feed/FeedItem'`

## Services & API

| Service | Responsibility |
|---------|----------------|
| `httpClient` | Typed GET/POST, auth header, error parsing |
| `profileService` | Discover feed, profile by ID |
| `matchService` | Send flame / create match |
| `flameQuotaService` | Freemium daily flame limit |
| `authService` | Google + email sign-in, session restore |

Set `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL` to point at the Express API (`http://localhost:5000/api` locally, Render URL in production).

Expected response shape from .NET:

```json
{
  "success": true,
  "data": { ... }
}
```

## Adding a new feature

1. Add types under `src/types/domain/`
2. Add endpoints in `src/constants/apiEndpoints.ts`
3. Create `src/services/<name>/<name>Service.ts`
4. Create `src/hooks/<name>/use<Name>.ts`
5. Add `src/features/<name>/pages/` and `containers/`
6. Reuse or add components under `src/components/`

## Path alias

`@/` maps to `src/` — configured in `vite.config.ts` and `tsconfig.app.json`.

## Admin dashboard architecture (recommended)

Admin should be implemented as a dedicated feature module inside the same frontend, following the current layering rules.

### Admin login route

- Admin login page route: `http://localhost:3000/admin/19990808/adminlogin`
- Protect all `/admin/*` routes behind an admin auth guard.
- Keep admin session storage separate from user session where possible.

### Frontend structure (aligned with this project)

```text
src/
├── features/
│   └── admin/
│       ├── pages/
│       │   ├── AdminLoginPage/
│       │   ├── AdminDashboardPage/
│       │   ├── AdminUsersPage/
│       │   ├── AdminContentPage/
│       │   ├── AdminSafetyPage/
│       │   ├── AdminRevenuePage/
│       │   └── AdminExperimentsPage/
│       ├── containers/
│       │   ├── CommandCenterContainer/
│       │   ├── UsersContainer/
│       │   ├── ModerationContainer/
│       │   ├── CommunicationsContainer/
│       │   └── MonetizationContainer/
│       └── index.ts
├── components/
│   └── admin/
│       ├── kpi/
│       ├── tables/
│       ├── charts/
│       ├── moderation/
│       ├── notifications/
│       └── audit/
├── hooks/
│   └── admin/
│       ├── useAdminAuth.ts
│       ├── useAdminDashboard.ts
│       ├── useAdminUsers.ts
│       ├── useAdminModeration.ts
│       ├── useAdminRevenue.ts
│       └── useAdminExperiments.ts
├── services/
│   └── admin/
│       ├── adminAuthService.ts
│       ├── adminDashboardService.ts
│       ├── adminUserService.ts
│       ├── adminModerationService.ts
│       ├── adminNotificationService.ts
│       └── adminBillingService.ts
└── types/
    └── domain/
        ├── adminAuth.types.ts
        ├── adminKpi.types.ts
        ├── adminUser.types.ts
        ├── adminModeration.types.ts
        ├── adminRevenue.types.ts
        └── adminExperiment.types.ts
```

### Core admin modules (control the full system)

1. **Command center (landing)**
   - Live KPIs: DAU/MAU, active sessions, matches/day, message volume.
   - System health: API latency, error rates, queue health, incident banner.
   - Revenue pulse: MRR, conversion rate, failed payments, refunds.

2. **User management**
   - Searchable user directory with filters (status, region, subscription, risk level).
   - Verification queue (identity, profile review, document status).
   - Enforcement controls: suspend, ban, restore, restricted visibility.
   - High-value user tracker (engagement leaders, churn risk, VIP cohorts).

3. **Content control**
   - Moderation queue for reported photos/videos/posts.
   - Priority lane for high-severity reports.
   - Review actions: approve, remove, escalate, note reason.
   - Content quality analytics (completion rate, drop-off, report ratio).

4. **Communication hub**
   - Reported and flagged message center for safety review.
   - Global announcement composer (audience targeting + scheduling).
   - Push notification campaigns with templates and A/B variants.
   - Delivery/open/click metrics and emergency campaign stop.

5. **Matching and discovery controls**
   - Adjustable matching parameters (distance, preference strictness, freshness).
   - Match quality metrics (match-to-chat conversion, response time, retention impact).
   - Bias and fairness monitoring dashboard with alerts and manual overrides.
   - Controlled rollout for ranking changes.

6. **Monetization lab**
   - Tier and entitlement manager (Free/Premium/Platinum features).
   - Regional pricing and promotion manager.
   - Coupon and trial orchestration.
   - Revenue analytics (ARPU, LTV, churn by plan, promo effectiveness).

7. **Safety and compliance**
   - Unified report center (users, messages, media).
   - Compliance checklist: privacy requests, retention rules, legal takedowns.
   - Data privacy controls (export/delete requests, consent status).
   - Full audit trail for every admin action.

8. **Experimentation lab**
   - Feature flag manager (scope by region, platform, plan, cohort).
   - Progressive rollout controls with rollback thresholds.
   - Segment builder for experiments and campaigns.
   - Experiment results panel with guardrail metrics.

9. **AI overseer**
   - Suspicious behavior detection (bot/scam/spam anomaly alerts).
   - Churn and reactivation predictions.
   - Feed/network health diagnostics by region and segment.
   - Recommended actions panel (human-approved before execution).

### Required security baseline for admin

- Enforce MFA for all admin accounts.
- Add role-based access control (support/moderator/finance/super-admin).
- Add IP allowlist and device/session management for super-admin routes.
- Log all admin actions with actor ID, timestamp, old/new values.
- Use principle of least privilege for backend admin tokens.

### Backend contract (admin API namespaces)

```text
/admin-api
├── /auth
├── /dashboard
├── /users
├── /verification
├── /moderation
├── /reports
├── /communications
├── /matching
├── /monetization
├── /experiments
├── /safety
└── /audit
```

### Build order (fast implementation sequence)

1. Admin auth + route guard + `AdminLoginPage`.
2. Command Center with read-only KPIs.
3. User management and moderation queues.
4. Notifications and feature flags.
5. Monetization + experiments + advanced analytics.
