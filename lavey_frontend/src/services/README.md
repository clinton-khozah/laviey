# Services layer

All backend HTTP goes through here. UI code must not import `httpClient` directly.

## Pattern

```ts
import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';

export const exampleService = {
  async getThing(): Promise<Thing> {
    if (!usesBackendApi()) {
      return mockThing;
    }
    const res = await httpClient.get<ApiResponse<Thing>>(API_ENDPOINTS.example.thing);
    return res.data;
  },
};
```

## Modules

| Folder | Domain |
|--------|--------|
| `api/` | `httpClient`, `ApiError` |
| `auth/` | Sign-in, session |
| `content/` | Posts, avatar, photo compliment |
| `profile/` | Discover feed, meetup host profile |
| `messages/` | Chat |
| `rooms/` | Online meetups / dates |
| `users/` | Profile CRUD |
| `onboarding/` | Quiz |
| `privacy/`, `settings/` | Account prefs |
| `subscription/` | Flame quota, Platinum |
| `gifts/` | Send gifts, payouts |
| `support/`, `legal/` | Support chat, legal copy |
| `verification/` | Face match |
| `admin/` | Admin dashboard (separate session token) |

## Imports

Prefer the barrel: `import { contentService } from '@/services'`

Admin services use a custom fetch helper (admin JWT, not user token).
