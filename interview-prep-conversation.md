# Runna / Strava Challenge — Interview Preparation Conversation

A working transcript of an interview-prep conversation: code review of the
submission, likely interview questions with suggested answer angles, deep-dives
on token handling, the OAuth cold-start bug, and follow-up clarifications.

---

## Q1: Review the repo and prepare interview questions

> This repo contains an application I submitted as part of an interview process.
> You are an interviewer for a FullStack Engineer role on the Growth team at
> Runna (acquired by Strava). The contents of `rb-strava-challenge-initial` is
> what I was sent; everything else is what I built. Prepare a list of questions
> I could be asked, with ideas for answers.

### 1. Walk-through / architectural decisions

**Q: "Walk us through the structure of your submission. Why did you split it the way you did?"**
- Acknowledge the scaffold was a single `App.tsx`; you broke it into `app/` (Expo Router screens) and `src/` (components, contexts, services, types, utils).
- Justify the layering: screens stay thin, `stravaApi.ts` owns network calls, `lapCalculations.ts` owns pure logic, types are shared. Easy to test, easy to swap fetch for `axios` or React Query later.
- Mention this scales as new screens (e.g. profile, segments) get added.

**Q: "You moved from React Navigation-style to Expo Router. Why?"**
- File-based routing reduces boilerplate, dynamic `[id]` route is idiomatic, and the README hinted at expo-router.
- Drawback: less explicit control vs. a stack defined in code; harder to type-check route params (you used `useLocalSearchParams<{id: string}>` which is a string even though IDs are numbers — note that as a known caveat).

### 2. Authentication & token handling

**Q: "The README specifically asked you to think about how the access token is reused across screens. Talk us through your approach."**
- AuthContext at the root, single `useAuth()` hook, screens subscribe.
- Justify Context over Redux/Zustand: only one piece of global state, no need for extra deps in a 3-hour challenge.
- Be ready to defend why you didn't pass token via route params (would leak into URLs, logs).

**Q: "What happens to the token when the user kills the app?"**
- Honest answer: it's lost — only stored in memory.
- What you'd do next: persist via `expo-secure-store` (Keychain/Keystore-backed) — not AsyncStorage, because tokens are sensitive. Hydrate on app launch in `AuthProvider`.

**Q: "Strava access tokens expire after 6 hours. How would you handle refresh?"**
- The `exchangeCodeAsync` response includes `refreshToken` and `expiresAt`. Store both.
- Add a wrapper around fetch that checks expiry and calls the refresh endpoint (`/oauth/token` with `grant_type=refresh_token`) before each request.
- Or: catch 401 responses, refresh once, retry once.

**Q: "I notice `STRAVA_CLIENT_SECRET` is embedded in the mobile app. Is that a problem?"**
- Yes — anyone can decompile an APK/IPA and extract it. Strava's mobile OAuth flow technically permits it but it's not best practice.
- Proper fix: PKCE (Proof Key for Code Exchange) so the client secret isn't required on-device, OR proxy the token exchange through a backend you control.
- Note: you committed creds in an earlier commit (`chore: update creds`) — be ready to say you'd rotate and use `expo-constants` + EAS secrets / environment files in `.gitignore`.

**Q: "Why did you use `Linking.addEventListener` to catch the redirect rather than the `response` returned by `useAuthRequest`?"**
- Be ready: explain it was a deliberate choice (or an iteration after debugging). If response handling worked you'd have used the destructured response. The deep-link approach is more explicit and resilient when the app is killed and reopened by the redirect.

### 3. Data fetching & state

**Q: "Each screen has its own `useState` + `useEffect` + try/catch. Would you do anything differently?"**
- Acknowledge the duplication. With more time: React Query / TanStack Query for caching, deduping, retry, background refresh, and pull-to-refresh out of the box.
- Or a custom `useStravaQuery` hook to centralise loading/error/retry logic.

**Q: "What happens if the activities list changes while the user is on the detail screen?"**
- Currently: stale data on return. RQ would invalidate. Acceptable trade-off for the challenge.

**Q: "You only fetch the first 30 activities. How would you handle a user with 1,000?"**
- Strava paginates with `page` / `per_page`. Use `FlatList`'s `onEndReached` to fetch next page. RQ has `useInfiniteQuery` for this.

### 4. Lap calculation logic (domain bit)

**Q: "Walk me through `calculateLapStatistics`."**
- Each lap has `start_index`/`end_index` into the stream arrays. You slice each stream and take min/max.
- Streams are time-series sampled at activity recording cadence (usually 1 Hz), so indices align across streams.

**Q: "What's the bug risk in `Math.max(...segment)`?"**
- Two:
  1. For very long activities (marathon = ~15k samples), `Math.max(...arr)` can blow the JS call-stack limit. Safer: `segment.reduce((a, b) => Math.max(a, b), -Infinity)`.
  2. On an empty segment, `Math.max()` returns `-Infinity` — which the UI would render as `-Infinity bpm`. You'd guard with a length check.

**Q: "What if `start_index`/`end_index` are out of bounds, or streams are missing for a lap?"**
- `slice` is safe — returns `[]`. But min/max on `[]` is broken (above). Add an explicit `if (!segment?.length) return null`.

**Q: "Cadence on Strava — what unit is it, and is your `maxCadence` correct for a runner?"**
- Strava reports cadence in revolutions/strides per minute *for one leg*. Many running watches multiply by 2 to give "spm". Your README/UI shows `spm`, so be ready to discuss whether to double it. Worth flagging this as a known nuance.

### 5. TypeScript / types

**Q: "Where did your types come from?"**
- Hand-authored against the Strava docs, only modelling fields used. Trade-off: faster than pulling a generated OpenAPI client; risk of drift if Strava changes shape.
- With more time: generate from Strava's published OpenAPI/Swagger spec.

**Q: "Why are some fields optional (e.g. `average_heartrate?`)?"**
- Heart rate isn't always recorded (no chest strap, manual upload). Modelling that explicitly forces UI to handle the `undefined` case.

### 6. Testing & quality

**Q: "How would you test this?"**
- Unit tests for `lapCalculations` (pure functions — fixture-driven, including empty segments, single sample, missing stream).
- Component tests for `LapsList` with React Native Testing Library.
- Mocked `fetch` / MSW for `stravaApi.ts`.
- E2E with Detox or Maestro for the OAuth flow (likely deferred — flaky).

**Q: "What did you not get to in 3 hours?"**
- Persistence, refresh tokens, pagination, tests, error toasts, accessibility, analytics. Be honest and prioritise.

### 7. Performance

**Q: "What about list performance?"**
- `FlatList` does windowing — fine for hundreds of activities. With more: `getItemLayout`, `keyExtractor` already in place, memoise `renderActivity` with `useCallback`, wrap card in `React.memo` if performance matters.

**Q: "What would happen to the detail screen if the user has thousands of stream samples?"**
- Slice + reduce is O(n) per metric per lap. Acceptable. If we visualised streams (charts), we'd downsample.

### 8. UI / product

**Q: "There were no designs. How did you make UI choices?"**
- Mirror Strava's brand colour (#FC4C02) for familiarity, simple cards, three primary stats per card (distance/time/elevation) — what runners glance at most. Loading/error/empty states explicitly designed.
- Date in user locale, distance in km, pace in min/km — assumed a UK/EU user (Runna is UK-based). Would put unit preferences in settings later.

**Q: "Which stats did you choose to highlight and why?"**
- Distance, moving time, elevation gain on the list (quick scan).
- On detail: also pace, avg HR, cadence — the metrics a runner reflects on post-run.

### 9. Growth team alignment (Runna-specific)

**Q: "If you owned this as a Growth engineer, what telemetry would you wire up first?"**
- Funnel events: `auth_started -> auth_completed -> activities_loaded -> activity_opened -> lap_viewed`.
- Time-to-first-activity-view as an activation metric.
- Drop-off at OAuth (the riskiest step).

**Q: "What would you A/B test?"**
- Connect-with-Strava CTA copy/colour.
- Whether to show lap analysis upfront vs. behind a tap (engagement vs. simplicity).
- Onboarding length.

**Q: "Runna is a coaching/training app — how would you make this more valuable than just a Strava mirror?"**
- Compare lap pace against the prescribed plan, surface "you held target pace for 7/8 intervals", congratulate streaks, suggest next workout. The lap-level breakdown you've built is exactly the substrate for that — a great pivot point.

### 10. Trade-offs & "what next"

**Q: "If you had another day on this, what would you do?"**
1. Persist token + refresh logic (correctness blocker).
2. PKCE + remove client secret (security).
3. Tests for `calculateLapStatistics` (highest-risk pure logic).
4. React Query for fetching/caching.
5. Pagination on activities.
6. Empty/edge-case hardening (`Math.max([])`).
7. Analytics scaffold.

**Q: "What's the part of this code you're least proud of?"**
- Pick one and own it: e.g. duplicated loading/error blocks across screens, or the deep-link auth handler being a bit fiddly. Show self-awareness — interviewers value this more than perfection.

**Q: "What's the part you're most proud of?"**
- Splitting the lap statistics into a pure function decoupled from the UI — easy to test, easy to extend (e.g. add `avgHeartRate`).
- The clean migration from a single-file scaffold to a layered architecture in the time available.

---

## Q2: Expand on each of the points — explain as if I have no prior knowledge

### 1. Architecture & code organisation

**Q: "Walk us through the structure of your submission."**

A layered architecture means each folder/file has *one* job. Screens know how to render. A service knows how to talk to the network. A util knows how to do pure math. They don't know about each other's internals. This makes code easier to read, test, and change.

Your structure:

```
app/                  -- screens (Expo Router file-based routes)
  _layout.tsx         -- root wrapper, mounts AuthProvider + Stack navigator
  index.tsx           -- login screen
  activities.tsx      -- list of activities
  activity/[id].tsx   -- dynamic detail screen, [id] = activity ID

src/
  components/         -- reusable UI pieces (LapsList)
  contexts/           -- React Contexts (AuthContext)
  services/           -- network code (stravaApi.ts)
  types/              -- shared TypeScript interfaces
  utils/              -- pure functions (formatTime, calculateLapStatistics)
```

The scaffold was an 80-line `App.tsx`. Splitting it shows you understand that as a codebase grows, putting everything in one file becomes unmaintainable. Each folder has a clear "this is what lives here" rule.

Trade-off: more folders/files for a 3-hour challenge is over-engineered if you only ever ship 3 screens. But it's a deliberate choice because (a) the README hinted at multiple screens, (b) you wanted to demonstrate how you'd organise a real app.

**Q: "Why Expo Router instead of React Navigation?"**

A mobile app has multiple screens. A navigation library decides what screen is on top, animates between them, and handles the back button.

- React Navigation: routes defined in JS code (`<Stack.Screen name="Home" component={HomeScreen} />`).
- Expo Router: file-based. `app/activities.tsx` automatically becomes the `/activities` route. Square brackets = dynamic segments. `myapp://activity/12345` opens the right screen via deep linking.

Drawback to acknowledge: route params come back as strings. Even though Strava IDs are numbers, the URL only carries strings. You convert with `parseInt`. With React Navigation's typed config, you'd get the right type for free.

### 2. Authentication & token handling

**Q: "Talk us through the access token approach."**

When you log in to Strava through OAuth, Strava gives your app a string of random characters called an access token. Every API call includes it in a header (`Authorization: Bearer <token>`). The token expires after a while; until then, it's the keys to your data.

React Context: components form a tree. Normally data flows top-down via props. Context lets you wrap a subtree with `<Provider value={...}>` and any component inside reads it via `useContext` — avoiding "prop drilling".

Your AuthContext:

```tsx
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  return <AuthContext.Provider value={{ accessToken, setAccessToken }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
```

The `throw` is defensive: if someone uses `useAuth()` outside the provider, they get a clear error instead of `undefined.accessToken` crashing later.

Why Context (not Redux/Zustand)? Redux/Zustand are state-management libraries optimised for complex state with many consumers and updates. For one piece of state (the token), a Context is the lightest tool.

Why not pass token via route params? Tokens are credentials — keep them out of URLs.

**Q: "What happens to the token when the user kills the app?"**

- `useState` lives in JavaScript memory. When the OS kills the app's process, that memory is gone.
- Persistent storage means writing data to disk. On mobile:
  - AsyncStorage: a key-value store. Easy but unencrypted.
  - expo-secure-store: a wrapper around iOS Keychain and Android Keystore. Encrypted at rest. The right place for tokens, passwords, anything sensitive.

Honest answer: "Right now, on app restart the user has to log in again. I'd persist using `expo-secure-store`. On app launch, the `AuthProvider` would read the token from secure storage and put it in state — so if it's there, the redirect at `app/index.tsx:49` takes them straight to the list."

**Q: "Strava tokens expire after 6 hours. How would you handle refresh?"**

OAuth gives you two tokens at the end of the flow:
- Access token — short-lived (Strava: 6 hours). Used for actual API calls.
- Refresh token — long-lived (effectively until revoked). Used only to get a new access token.

This split limits damage: if an access token leaks, it dies in 6 hours.

Your code only stores `accessToken` (line 79 of `app/index.tsx`). The refresh token is silently discarded.

Option A — proactive refresh:

```ts
async function getValidToken() {
  if (Date.now() / 1000 >= expiresAt - 60) {
    const newTokens = await refreshAccessToken(refreshToken);
    saveTokens(newTokens);
    return newTokens.accessToken;
  }
  return accessToken;
}
```

Option B — reactive refresh (catch 401):

```ts
async function fetchWithAuth(url) {
  let res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) {
    await refreshAccessToken();
    res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  }
  return res;
}
```

Production systems often do both. The refresh call itself is a POST to `https://www.strava.com/oauth/token` with `grant_type=refresh_token` and the refresh token.

**Q: "Is embedding `STRAVA_CLIENT_SECRET` in the app a problem?"**

When you registered the Strava API app, Strava gave you:
- Client ID — public, identifies your app.
- Client Secret — supposed to be secret. Proves to Strava that the token-exchange request is genuinely from your app.

Why it's a problem in mobile: the "secret" is shipped inside the app binary. Anyone can:
1. Download the IPA/APK.
2. Unzip it.
3. Run `strings` or a JS bundle inspector.
4. Read your "secret".

Proper fix — PKCE (Proof Key for Code Exchange):

1. The app generates a random string (the "verifier") and hashes it (the "challenge").
2. App sends the *challenge* with the auth request.
3. User logs in, gets redirected back with an auth code.
4. App exchanges the code, sending the *verifier*.
5. Strava hashes the verifier, checks it matches the challenge.

Result: anyone intercepting the code can't use it without the verifier, and the verifier never leaves the device.

Strava's quirk: their docs technically still want a client secret. The proper architectural fix is to proxy the token exchange through your own backend.

Be ready to add: "I committed credentials in an earlier commit. I'd rotate those, move them out of source via Expo's `extra` config + EAS Secrets, and add `.env` patterns to `.gitignore`."

**Q: "Why use `Linking.addEventListener` instead of the OAuth `response`?"**

`useAuthRequest` returns `[request, response, promptAsync]`. The standard flow: call `promptAsync()` to open the browser, when the user returns `response` updates with `{ type: 'success', params: { code } }`.

What you did instead:

```ts
const [request, , promptAsync] = useAuthRequest(...);  // ignore response
Linking.getInitialURL().then(handleDeepLink);
Linking.addEventListener('url', (event) => handleDeepLink(event.url));
```

When this is needed: on some configurations — particularly when the app gets killed and reopened by the redirect, or when the redirect comes via a custom URL scheme — the `useAuthRequest` `response` doesn't fire reliably.

How to frame it: "The standard `response` flow worked in the in-app browser case but I wanted resilience against the cold-start case. Listening on `Linking` covers both. The trade-off is that you're now responsible for URL parsing, which is why I added `hasHandledCallback` to prevent double-handling."

### 3. Data fetching & state

**Q: "Each screen has `useState` + `useEffect` + try/catch. Would you do anything differently?"**

Same boilerplate repeated. Worse, this approach has gaps:
- No caching: navigate around, refetches every time.
- No deduping: simultaneous requests for same data fire twice.
- No background refresh: data goes stale; user must pull-to-refresh.
- No retry policy: a flaky network = error screen.

The fix — TanStack Query (a.k.a. React Query):

```ts
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['activities'],
  queryFn: () => fetchActivities(token),
});
```

- Caches by `queryKey`. Same key elsewhere = served from cache.
- Auto-refetch on window/screen focus.
- Configurable retry, stale-time, garbage collection.
- Pagination via `useInfiniteQuery`.

How to frame it: "I duplicated the loading/error pattern intentionally to keep the dependency footprint small in 3 hours. In production I'd reach for TanStack Query — it gives me caching, dedup, retries, and `useInfiniteQuery` for pagination almost for free."

**Q: "What happens if activities change while user is on detail screen?"**

React Query has invalidation: "this cached data is now stale, refetch when next requested". Without it, the user sees stale data until pull-to-refresh.

**Q: "How would you handle 1,000 activities?"**

APIs paginate large datasets. Strava's endpoint accepts `?page=N&per_page=M`.

Infinite scroll pattern:

```ts
<FlatList
  onEndReached={loadNextPage}
  onEndReachedThreshold={0.5}
  ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
/>
```

With TanStack Query's `useInfiniteQuery`, this is ~10 lines.

### 4. Lap calculation logic

**Q: "Walk me through `calculateLapStatistics`."**

Activity stream: when you record a run on a watch, it samples sensors once per second. Result is parallel arrays:

```
heartrate: [120, 122, 125, 130, 132, ...]   // one number per second
altitude:  [50,  50,  51,  52,  53,  ...]
cadence:   [80,  82,  82,  85,  85,  ...]
velocity:  [3.2, 3.5, 3.6, 3.7, 3.7, ...]
```

A 30-minute run = 1,800 elements per stream.

A lap is a manually or auto-recorded section. Strava represents each lap with `start_index` and `end_index` — the indices into the stream arrays.

Your code slices each stream by the lap's indices, then takes min/max across the slice. Pure function — same input, same output, no side effects. Easy to test.

**Q: "What's the bug risk in `Math.max(...segment)`?"**

`Math.max(...arr)` is JS shorthand for `Math.max(arr[0], arr[1], ...)`. Every function call uses a slot on the call stack. JS engines have a limit (~100k–500k arguments).

For an ultra (43,200 samples), this can throw `RangeError: Maximum call stack size exceeded`.

Safer:

```ts
function maxOf(arr: number[]): number | null {
  if (!arr.length) return null;
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) if (arr[i] > max) max = arr[i];
  return max;
}
```

The empty-array bug: `Math.max()` with zero arguments returns `-Infinity`. If a stream existed but had zero samples in this lap's range, your UI would display `Infinity bpm` or `-Infinity m`.

Defensive code:

```ts
maxCadence: cadenceSegment?.length ? Math.max(...cadenceSegment) : null,
```

**Q: "What if `start_index`/`end_index` are out of bounds?"**

`arr.slice(5, 10)` on a 3-element array returns `[]` — no crash. But that empty array hits the `Math.max([])` bug.

If `start_index > end_index`: `slice(10, 5)` returns `[]`. Same path.

If streams don't exist: `streams.heartrate?.data.slice(...)` — the `?.` makes it `undefined`. `cadenceSegment ? Math.max(...) : null` correctly returns null.

**Q: "Cadence — what unit is it, and is your `maxCadence` correct for a runner?"**

Cadence = how fast your legs turn over. Cyclists: pedal RPM. Runners: steps per minute (SPM).

The Strava trap: Strava reports running cadence as single-leg SPM. So a runner's real cadence is roughly double:
- Strava says: 90
- Real SPM: 180 (typical recreational running cadence)

Your code displays the raw Strava value, which is confusing for runners. Even noticing this in the interview is a strong signal that you understand the product domain.

### 5. TypeScript / types

**Q: "Where did your types come from?"**

You hand-wrote interfaces in `src/types/strava.ts` based on Strava's response shapes, only including fields you used. Lean, but creates drift risk.

Alternative — code-gen from OpenAPI: tools like `openapi-typescript` read Strava's spec and generate a `.d.ts` file with every endpoint typed.

How to frame it: "For the challenge I hand-wrote the minimum types needed. In production I'd generate from Strava's OpenAPI spec so types stay in sync."

**Q: "Why are some fields optional?"**

`average_heartrate?: number` means the property can be `number` or `undefined`. The compiler then forces you to handle the undefined case.

Why HR is optional: many activities don't have it (no chest strap, manual upload, swim).

### 6. Testing & quality

**Q: "How would you test this?"**

The testing pyramid:
- Unit tests — pure functions, no I/O. Fast, plentiful.
- Component/integration tests — render, simulate tap, assert the DOM.
- E2E — drive the real app on a simulator. Slowest, fewest.

Priority:
1. `lapCalculations.ts` — pure function, highest value.
2. `stravaApi.ts` — mock fetch, assert URL and headers.
3. Components — `@testing-library/react-native`.
4. E2E — Detox or Maestro.

### 7. Performance

**Q: "What about list performance?"**

`FlatList` is windowed: only visible rows + buffer mounted. You're already using:
- `FlatList` (not `map` inside `ScrollView`).
- `keyExtractor`.

Next: `useCallback` on `renderActivity`, `React.memo` on the row, `getItemLayout` if rows are fixed-size.

**Q: "What if streams have thousands of samples?"**

`slice` is O(b - a). `Math.max(...arr)` is O(n). For N samples and L laps: O(N x constant). Fine for 1,000–50,000 samples.

If visualising streams: downsample using LTTB (Largest-Triangle-Three-Buckets) preserves visual shape with ~200 points.

### 8. UI / product

**Q: "How did you decide?"**

- Brand colour `#FC4C02`: Strava orange. Familiarity reduces friction.
- Stat triplet on cards: distance / time / elevation. What runners glance at first.
- Pace in min/km, distance in km: assumed UK/EU user.
- Pull-to-refresh: the only obvious manual refresh on a mobile list.
- Loading spinner + label: tells the user what's happening.
- Error screen with retry button: actionable.
- Empty state copy: directs the user to fix the cause.

### 9. Growth team alignment

**Q: "What telemetry would you wire up?"**

Funnel:

```
app_opened
  -> auth_started           (tapped 'Connect with Strava')
    -> auth_browser_opened
      -> auth_callback_received
        -> auth_completed     (token in hand)
          -> activities_loaded
            -> activity_detail_opened
              -> laps_viewed
```

Tools: PostHog, Amplitude, Mixpanel, Segment.

Two metrics that matter most:
1. Auth completion rate: `auth_completed / auth_started`.
2. Time-to-first-activity-view: from app open to first detail screen.

**Q: "What would you A/B test?"**

- CTA copy.
- CTA placement.
- Onboarding length.
- Lap analysis prominence.
- First-screen content.

**Q: "How would you make this more valuable than just a Strava mirror?"**

A pure Strava mirror has no reason to exist. The unique value is **coaching context**.

What you've built — lap-by-lap stats — is the substrate to evaluate prescribed workouts:

- "Lap 3: target pace 5:00, actual 4:58 — on target"
- "Lap 5: HR drifted to 178, max recommended 175 — pacing too aggressive"
- "Workout score: 8/10."

That's coaching, not just data. It turns a passive log into a feedback loop, and feedback loops drive retention.

### 10. Trade-offs

**Q: "If you had another day?"**

Prioritised:
1. Token persistence + refresh (correctness blocker).
2. PKCE / proxy through backend (security).
3. Tests for `calculateLapStatistics` (highest-risk pure code).
4. Replace duplicated fetch boilerplate with TanStack Query.
5. Pagination on activities.
6. Analytics SDK + funnel events.
7. Accessibility audit + i18n scaffolding.

**Q: "Least proud of?"**

Pick one and own it: e.g. duplicated loading/error blocks, or the deep-link auth handler being fiddly.

**Q: "Most proud of?"**

- Pure-function lap statistics. Easy to test, easy to extend.
- Migration from single-file scaffold to layered architecture.

---

## Q3: The OAuth re-mount issue — explain the phenomenon, why multiple attempts, how it was fixed

### Background concepts

**App instance.** When you tap an app icon, the OS creates a process — a running copy in memory holding all working state. Under memory pressure, the OS can kill the process. Tapping the icon again creates a brand new process. None of the previous state survives.

**Deep link.** Apps register URL schemes with the OS. Your app registered `myapp` (in `app.json`). Any URL starting with `myapp://` is the OS's signal to wake up your app and hand it that URL.

**OAuth in one paragraph.** You don't want to type your Strava password into a third-party app. The app sends you to Strava's website. You log in there. Strava redirects you back to the app with a temporary code in the URL. The app exchanges that code for a long-lived access token.

**Re-mounting in React.** Components hold state. "Mounting" means created and initialised. "Unmounting" means destroyed. When the OS kills the process, every component re-mounts in the new process — state is replaced with initial values.

### What was supposed to happen

1. User taps "Connect with Strava".
2. App opens an in-app browser pointed at Strava.
3. User logs in.
4. Strava redirects to `myapp://oauth?code=abc123`.
5. The OS sees `myapp://`, brings your app back to the foreground, hands it the URL.
6. App reads `code=abc123`.
7. App calls Strava's token endpoint, swapping the code for an access token.
8. App stores token and shows the activities screen.

The crucial assumption at step 5: the OS brings your app back — same process, same memory.

### What actually happened

While the in-app browser was open, your app was backgrounded. Backgrounded apps can be killed at any time. If the OS killed your process while the browser was open:

1. User taps "Connect with Strava". App is running.
2. Browser opens, app goes to background. OS kills process.
3. User finishes logging in.
4. Strava redirects to `myapp://oauth?code=abc123`.
5. OS sees URL but process is dead. Launches a new one.
6. New process starts. React tree mounts fresh. `AuthContext.accessToken = null`. No record of the OAuth flow.
7. Original code was watching `useAuthRequest`'s `response`. The new process has a brand new `useAuthRequest` — no idea a request was started. URL is sitting there, untouched.
8. Token exchange never happens. User dropped back on login screen.

That's the re-mount problem. The original code only handled "warm resume" of step 5. When the OS did "cold start", the auth code arrived at an app that didn't know it was waiting for it.

### Why multiple attempts sometimes worked

**Strava remembered you.** First time: full login + permissions prompt = several seconds backgrounded = likely killed. Second tap: Strava had cached session = redirect almost instant = not enough time backgrounded to be killed. The redirect arrived at the still-running app, original `useAuthRequest` was alive, login worked.

**Timing roulette.** Whether iOS killed your process depended on memory pressure, other apps, response timing. Same code path could succeed or fail on different runs.

### The solution

The redirect URL can arrive in two ways:
- Warm resume: process alive. URL arrives as event to running app.
- Cold start: process dead. OS launches new process; URL is the reason it started.

Original code only listened for warm resume. Fix listens for both via React Native's `Linking` module:

**`Linking.getInitialURL()`** answers: "What URL, if any, caused this app to launch?" Call on app start. If null, app launched normally. If a URL, that URL brought the app back to life — the cold-start case.

**`Linking.addEventListener('url', handler)`** says: "While I'm running, tell me whenever a URL is handed to me." Subscribe once on startup; warm-resume case.

Both feed the same handler:
1. Read `code=abc123` from URL query string.
2. Call Strava to exchange the code for an access token.
3. Store the token in `AuthContext`.
4. Navigate to activities screen.

### Why this works in cold-start

The token exchange only needs three things — code from URL, client ID, client secret. Doesn't need any state from before cold start. The new process has lost the old `useAuthRequest`, lost the old closures, lost the React tree — none matters. Code is in the URL the OS handed to the new process. Client ID/secret are constants in source code, present in new process too.

### The new failure mode and how it's handled

Cold start: new process starts. `getInitialURL()` returns the redirect URL. Handler starts processing. Then OS *also* fires a `'url'` event for the same URL. Both listeners think they need to handle it. Result: token-exchange called twice with the same code.

Strava's auth codes are single-use. First exchange succeeds. Second fails. You'd get a successful login *and* an error message simultaneously.

Two boolean flags:
- `hasHandledCallback`: set to true the moment a `code` is found, before the async exchange. Subsequent invocations exit immediately.
- `isProcessing`: drives the spinner UI.

Both flipped *before* the `await` on the network call. If exchange fails, flags reset so user can try again.

### Why this fix is principled

The original code reached through an abstraction (`useAuthRequest`'s `response`) to find out about a redirect URL. That abstraction assumes the same React component instance is alive on both sides of the round-trip. On cold start, that breaks.

The fix drops to the raw OS mechanism — *here is a URL, do something with it* — which doesn't care about React, components, or processes. Just delivers the bytes. From there you build back up.

When an abstraction is failing intermittently, sometimes the right answer is to operate one level closer to the truth of what the system is actually doing.

---

## Q4: Iterations on summarising the issue

### First attempt by user:

> "OS was opening the browser, authorizing with Strava then killing the app instance. This meant that it worked intermittently as sometimes the app instance wouldn't be killed in time so the flow would complete. Proper fix required changing the app code so that it 'stayed awake' and waited for the token to come back to complete the flow."

### Corrections:

- The *app* opens the browser; the *user* authorises. The OS only routes the resulting URL.
- "Wouldn't be killed in time" implies a fixed deadline. More accurate: a fast redirect doesn't sit backgrounded long enough to be a likely eviction target. Probability shift, not stopwatch.
- **"Stayed awake" is wrong.** You cannot make a mobile app refuse to be killed. Process lifecycle is the OS's call. The fix is the *opposite philosophy*: accept that the app might be killed, and make redirect handling work either way.

### Second attempt by user:

> "OS was opening the browser, authorizing with Strava then killing the app instance. This meant that it worked intermittently as sometimes the app instance wouldn't be killed in time so the flow would complete. Proper fix required changing the app code so that it correctly handled the scenario where the process was killed, by checking if the app was cold-started by a deep-link, and also the scenario where the process was not killed in time so it waited for the token to come back to complete the flow."

Structurally correct. Three small imprecisions:
1. App opens browser, user authorises.
2. "Killed in time" — probability shift, not deadline.
3. Redirect carries an *auth code*, not a token. Token comes from a separate API call.

### Polished version

> "While the user was authenticating in the in-app browser, my app was backgrounded and the OS sometimes killed its process to free memory. It worked intermittently because faster redirects — after Strava cached the session on subsequent attempts — didn't sit backgrounded long enough to get killed.
>
> The fix handles both cases: if the app was cold-started by the deep link, I use `Linking.getInitialURL()` to recover the redirect URL that woke the new process; if the app was still alive, I use `Linking.addEventListener` to catch the URL as it arrives. Either way, the same handler reads the auth code from the URL and exchanges it for an access token."

---

## Q5: Expand each "next steps" item

### 1. Token persistence + refresh

**The problem.** Token is stored in `useState` in `AuthContext` — JavaScript variable in memory. When the process ends, it's gone. Next open: `accessToken = null`, login screen again.

Strava's tokens also expire after 6 hours. After expiry, every API call returns 401.

**Fix A: Persist the token.**

`expo-secure-store` stores values in iOS Keychain / Android Keystore — encrypted by the OS, tied to app identity.

```ts
// On login
await SecureStore.setItemAsync('accessToken', token);

// On app start, in AuthProvider
const saved = await SecureStore.getItemAsync('accessToken');
if (saved) setAccessToken(saved);

// On logout
await SecureStore.deleteItemAsync('accessToken');
```

Until the load resolves, show a splash screen rather than flashing the login screen.

**Fix B: Handle 6-hour expiry.**

Strava returns three values at exchange: `accessToken`, `refreshToken`, `expiresAt`. Your code throws away two.

```ts
async function getValidAccessToken() {
  if (Date.now() / 1000 >= expiresAt - 60) {  // 60s safety margin
    const fresh = await refresh(refreshToken);
    await SecureStore.setItemAsync('accessToken', fresh.accessToken);
    return fresh.accessToken;
  }
  return accessToken;
}
```

Defensive version *also* catches 401 responses and retries once.

### 2. PKCE / proxy through backend

**The problem.** Client ID is public; Client Secret is supposed to be secret. Both are hardcoded in your code. Mobile apps ship source code in the binary. Anyone can unzip the IPA/APK and read the "secret".

You also committed credentials to git in `chore: update creds`. Rotate before doing anything else.

**Fix A: PKCE.**

1. Before opening browser, app generates random `code_verifier` and hashes it (SHA-256) to `code_challenge`.
2. Auth request includes `code_challenge`.
3. User logs in; Strava redirects with auth code.
4. Token exchange sends original `code_verifier` (not a static secret).
5. Strava hashes verifier, checks match, issues token.

Verifier never leaves the device. `expo-auth-session` supports PKCE with `usePKCE: true`.

**Fix B: Proxy through backend.**

1. Phone receives auth code.
2. Phone sends code to your backend.
3. Backend (which keeps secrets safely) calls Strava with client secret.
4. Backend returns access token to phone.

Bonus: store long-lived refresh token on server. Phone only ever holds short-lived tokens. If phone compromised, attacker only gets a few hours of access.

In production Runna almost certainly does this. Interview answer: "I'd remove the client secret from the app and let the backend handle the exchange. As an interim measure on a backend-less prototype, I'd at least add PKCE."

### 3. Tests for `calculateLapStatistics`

**The concept.** Unit test = call function with known input, assert output. Run the test file in seconds.

Tests pay off most for **pure functions** — input, output, no side effects. `calculateLapStatistics` is pure.

**Why highest-risk in your repo.**

- Network calls — bugs are obvious.
- UI components — visual bugs are caught by looking.
- `calculateLapStatistics` — bugs are silent. Wrong numbers displayed confidently.

Two real bugs we discussed:
1. `Math.max([])` returns `-Infinity`, so a lap with no stream samples renders `-Infinity bpm`.
2. `Math.max(...veryLongArray)` can blow the JS call stack on long activities.

**Tests to write:**

```ts
import { calculateLapStatistics } from './lapCalculations';

const baseLap = {
  id: 1, name: 'Lap 1', distance: 1000, moving_time: 300,
  elapsed_time: 300, start_date: '...', start_index: 0, end_index: 2,
  average_speed: 3, max_speed: 4,
};

test('computes max and min across the lap segment', () => {
  const result = calculateLapStatistics(
    [baseLap],
    { heartrate: { data: [120, 150, 130, 999], series_type: '', original_size: 4, resolution: '' } }
  );
  expect(result[0].maxHeartRate).toBe(150);
  expect(result[0].minHeartRate).toBe(120);
});

test('returns null when stream is missing', () => {
  const result = calculateLapStatistics([baseLap], {});
  expect(result[0].maxHeartRate).toBeNull();
});

test('returns null instead of -Infinity when segment is empty', () => {
  const lapWithEmptyRange = { ...baseLap, start_index: 10, end_index: 5 };
  const result = calculateLapStatistics(
    [lapWithEmptyRange],
    { heartrate: { data: [120, 130], /* ... */ } as any }
  );
  expect(result[0].maxHeartRate).toBeNull();
});
```

Third test fails until you fix the bug — write test, watch fail, fix code, watch pass.

### 4. TanStack Query

**The problem.** `app/activities.tsx` and `app/activity/[id].tsx` both have:

```ts
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

const load = useCallback(async () => {
  try {
    setError(null);
    const res = await fetchSomething();
    setData(res);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [...]);

useEffect(() => { load(); }, [load]);
```

Gaps:
- No caching: navigation always refetches.
- No deduping.
- No stale-while-revalidate.
- No retry.
- No background refresh on focus.

**TanStack Query.**

```ts
import { useQuery } from '@tanstack/react-query';

function ActivitiesScreen() {
  const { accessToken } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['activities', accessToken],
    queryFn: () => fetchActivities(accessToken!),
    enabled: !!accessToken,
  });
}
```

Caches by `queryKey`, dedupes, refetches on focus, retries with backoff, separates first-load loading from background refresh.

For pagination: `useInfiniteQuery`.

Cache invalidation:

```ts
queryClient.invalidateQueries({ queryKey: ['activities'] });
```

**Why "pays back across every future screen".** First screen: roughly net-neutral. Second screen, pull-to-refresh, background freshness, pagination — all become flag-flips instead of hand-rolling.

### 5. Pagination

**The problem.** `fetchActivities` requests page 1, 30 items. User with 200 activities sees the most recent 30, can't access the rest.

**What pagination is.** APIs split large datasets into pages. Strava's endpoint accepts `?page=N&per_page=M`. Two patterns:
- Page-by-page (web).
- Infinite scroll (mobile).

**Implementation.**

```ts
const [page, setPage] = useState(1);
const [items, setItems] = useState<SummaryActivity[]>([]);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);

const loadMore = async () => {
  if (loadingMore || !hasMore) return;
  setLoadingMore(true);
  const next = await fetchActivities(token, page + 1);
  setItems(prev => [...prev, ...next]);
  setPage(p => p + 1);
  setHasMore(next.length === 30);
  setLoadingMore(false);
};

<FlatList
  data={items}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
/>
```

By hand: fragile (race conditions). With `useInfiniteQuery`: ~5 lines, race handled internally.

**Priority.** Not a problem on day 1. Grows with engagement — most-engaged users hit it first. Below "things that break the app", above polish.

### 6. Analytics SDK + funnel events

**Analytics SDK.** Library you install (PostHog, Amplitude, Mixpanel, Segment) that gives `track(eventName, properties)`. Batches and ships events to a dashboard.

```ts
import posthog from 'posthog-react-native';
posthog.capture('auth_started');
posthog.capture('activity_opened', { activityId, activityType: 'Run' });
```

**Funnel.** Sequence of events representing steps to reach value. At each step, users drop off.

```
1. app_opened              -- 100 users
2. auth_started            --  82 users
3. auth_callback_received  --  76 users
4. auth_completed          --  74 users
5. activities_loaded       --  73 users
6. activity_opened         --  41 users
7. lap_section_viewed      --  18 users
```

Each drop = fix opportunity.

**"Growth-team table-stakes."** Growth team's job is to move funnel numbers. Without instrumentation they're flying blind.

A candidate who treats analytics as cosmetic signals "feature builder". A candidate who ships instrumentation from day one signals "Growth engineer".

**Two key metrics:**
- Auth completion rate.
- Activation rate (first activity opened in first session).

### 7. Accessibility audit + i18n scaffolding

**Accessibility.** Making the app usable for people with disabilities — primarily blind/low-vision (screen readers like VoiceOver / TalkBack), motor-impaired (large hit targets), colour-blind (don't communicate state with colour alone).

A screen reader speaks UI elements aloud. Every interactive element needs a label:

```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Connect with Strava"
  accessibilityHint="Opens Strava login in your browser"
  onPress={onPressStravaAuth}
>
```

Without these, screen reader users hear "button" with no context — or silence on a `<View>` pretending to be a button.

Quick scan of your code: no accessibility props anywhere.

Audit checklist:
- Every interactive element has a label.
- Touch targets >= 44x44 (iOS guideline).
- Contrast ratios meet WCAG AA (4.5:1).
- No precise-timing interactions.
- State changes announced (`accessibilityState`).

Tools: iOS Accessibility Inspector, Android Accessibility Scanner.

EU Accessibility Act applies from June 2025. Beyond compliance: ~5–8% of users have a disability that affects app usage.

**Internationalisation (i18n).** Engineering work to prepare for translation/localisation.

Hardcoded in your code:

```ts
new Date(item.start_date_local).toLocaleDateString('en-US', { ... })
formatDistance(meters): string => `${(meters/1000).toFixed(2)}`
formatPace
```

Every UI string is a literal English string in JSX.

**Scaffolding right.** `react-i18next`:

```json
// en.json
{ "activities.empty": "No activities found" }
// de.json
{ "activities.empty": "Keine Aktivitäten gefunden" }
```

```tsx
const { t } = useTranslation();
<Text>{t('activities.empty')}</Text>
```

Date formatting via `Intl.DateTimeFormat` with user locale. Distance/pace honour user preference (km vs miles — US runners use miles).

**Why listed last.** One-time cost you don't want to do reactively. Doesn't block any user today.

### How to talk about all seven

Frame: "I'd order it like this — first things that make the app actually usable across sessions, then security debt, then a foundation of tests on the riskiest pure logic, then platform improvements that compound, and finally polish work that's important but doesn't block any user today."

---

## Q6: Can the token be refreshed while the app is closed?

**Short answer.** Not reliably, and you almost never need to. Standard pattern: refresh lazily on next use. Apps that need autonomous refresh do it on a backend.

### Why "refresh while closed" is hard

Modern phones restrict background work for battery life.

Mechanisms that *can* wake an app:
- **iOS BGAppRefreshTask:** ~30 seconds at OS discretion. May get a slot in 15 minutes; may not get one for two days.
- **Android WorkManager:** deferred, batched work. Eventual but not soon.
- **Silent push notifications:** server sends a push that wakes app briefly. Requires backend infra.

In Expo: `expo-background-fetch` and `expo-task-manager`.

### Why apps don't bother

1. **No user-visible benefit.** Refreshing a token is so an API call works. If app is closed, it isn't making API calls.
2. **Costs battery.** Waking the app for no immediate benefit is what the OS discourages.
3. **Unreliable.** Can't depend on `BGAppRefreshTask` running when you want.

### The standard pattern: lazy refresh

1. Store access token, refresh token, expiry on disk (encrypted).
2. Wrap network calls: before sending, if access token is expired/expiring, refresh first.
3. Optionally: catch 401 responses, refresh once, retry.

```ts
async function authenticatedFetch(url: string, init?: RequestInit) {
  const token = await getValidAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    await forceRefresh();
    const retryToken = await getValidAccessToken();
    return fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${retryToken}` },
    });
  }
  return res;
}
```

**Strava-specific.** Strava's refresh tokens don't expire by default. App closed for six months will still successfully refresh on next open.

### Server-side tokens (when autonomous refresh matters)

Products that do work while user isn't using the app:
- Coaching app auto-grading workouts on completion.
- Push notifications triggered by activity completion.
- Live leaderboards.

Architecture:
1. App initiates OAuth.
2. App receives auth code.
3. App **sends auth code to your backend**.
4. Backend exchanges and stores tokens in its database.
5. Backend can refresh and call Strava on its own schedule.
6. Backend issues short-lived **session token** to the app.

Solves several problems:
- **Security:** long-lived refresh token never on phone.
- **Strava webhooks:** Strava pushes activity events to your backend.
- **Background processing:** any analysis runs server-side.
- **Multi-device:** backend is source of truth.

For Runna specifically — coaching app reacting to completed workouts — this is overwhelmingly likely the architecture in production.

### Interview answer

> "On-device, you don't really refresh while closed — the OS makes background work unreliable, and there's no point refreshing a token if the app isn't using it. The standard pattern is lazy refresh: store the access token, refresh token, and expiry in secure storage; before any API call, refresh if the access token is stale; also catch 401s as a fallback. Strava's refresh tokens don't expire, so this works even after months of inactivity.
>
> The exception is when the *server* needs ongoing access — say, to grade a workout when it completes, regardless of whether the app is open. Then you change the architecture: the auth code is exchanged on the backend, the refresh token lives on the backend, the backend talks to Strava, and the app holds only a short-lived session token. That's almost certainly what Runna does in production, especially if they're consuming Strava webhooks for activity events."

---

## Q7: Confirming — refresh token in expo-secure-store means access tokens generated when needed without re-auth?

**Yes — exactly.** As long as the refresh token survives on the device, the access token becomes a disposable that the app mints on demand. The user only goes through OAuth once, on first install.

The mental model: the **refresh token is the real credential**. The access token is just a short-lived ticket. The user authenticates *the app to Strava*, not *each session to Strava*.

### When re-auth IS required

1. **User revokes the app on Strava's side** — strava.com/settings/apps → disconnect. Refresh token invalidated. Next refresh: 401 / `invalid_grant`.

2. **You change OAuth scopes** — say `activity:read` -> `activity:read_all`. Existing refresh token is scoped to original permissions. Send user back through OAuth.

3. **Refresh token lost from device** — uninstall/reinstall, switch phones, secure-store loses value.

4. **Strava revokes server-side** — rare. Suspicious activity, password change in some flows. Refresh tokens may invalidate.

### Error path

Wrap refresh in try/catch. If it fails with auth error (not network — those retry):
1. Clear stored tokens from secure storage.
2. Set `accessToken` and `refreshToken` to null in context.
3. Routing redirects user to login.

Graceful logout. Seamless for the 99% case where refresh token is valid; only surfaces re-auth when Strava genuinely needs it.

### General pattern

This is how "remember me" works in basically every mobile app — Spotify, Slack, Gmail, banking apps. None ask you to re-enter credentials every session. They all hold a long-lived refresh token (or equivalent) in secure storage and mint short-lived access tokens silently. The OAuth dance is the *only* time the user sees a login screen.

---

## Q8: Is the `Linking.addEventListener` interview question related to the cold-start bug?

**Yes — exactly the same thing.** The interview question is the *outside view* of what you experienced. Interviewer reads your code, sees `[request, , promptAsync]` and Linking listeners, asks "why?" — that's an unusual choice.

### Why this is a strong question to get

Most submissions either:
- Use library default (`response`), didn't hit the cold-start case, would say "I just used what the docs showed".
- Used `Linking` because they copied an example, would say "I saw it in a tutorial".

You used `Linking` because you **debugged a real failure**, traced it to OS process lifecycle, and chose a different abstraction layer. Four senior signals:
1. You investigated symptoms instead of accepting them.
2. You understand mobile fundamentals (process lifecycle, custom URL schemes, cold-start vs warm-resume).
3. You know when to drop a layer.
4. You handled the new failure mode the fix introduced (`hasHandledCallback`).

### Answer in interview

> "I started with the standard pattern of watching `response` from `useAuthRequest`. In testing I hit a flaky bug where login worked on the second or third attempt, never the first. After some debugging I traced it to iOS killing my app's process while the in-app browser was open — so the OAuth redirect was cold-starting a new process instead of resuming the original. The `response` field only fires inside the original `useAuthRequest` instance, which by then was gone, so the auth code was silently dropped.
>
> The fix was to stop relying on the in-process callback and read the redirect URL directly via the OS's Linking API. `Linking.getInitialURL()` recovers the URL that cold-started the app; `addEventListener('url', ...)` catches it on warm resume. Same handler for both paths. I added a `hasHandledCallback` flag because both listeners can fire for the same URL on cold start, and Strava's auth codes are single-use — without the flag you'd get one successful login and one error from the duplicate exchange.
>
> The deeper takeaway is that I shouldn't assume the same React component instance is alive on both sides of an OAuth round-trip. Operating one layer closer to the OS — at the URL level rather than the OAuth-library-state level — is the right abstraction for something the OS is fundamentally in control of."

### Subtle interview tip

Don't volunteer the war story unprompted. If asked, tell it in full. If not, drop a smaller hint — "I dropped down to `Linking` directly because the OAuth library's response handling is sensitive to the React component lifecycle" — and let them decide whether to pull on the thread.

Walking up to a fresh interviewer announcing "I had a bug" can read as confessional. Letting them ask makes it a story you're explaining, not a confession.

---

## Q9: Is this issue common, or did I just implement OAuth wrong?

**Common — not user error.** Closer to "anyone could have experienced this".

### Why it's a known class of bug

OAuth was designed for web browsers, where the round-trip happens within one tab. The session, cookies, JS state — all alive on both ends.

Mobile broke that assumption. The "redirect" crosses an OS boundary: from a browser process back to your app's process. The OS in the middle has its own opinions about whether your app is alive.

Apple/Google have spent years iterating on this:
- **In-app `WebView`** (early): user types password into your `WebView` — terrible. Rejected by Apple.
- **External Safari/Chrome**: more secure, but redirect back is hard cold-start every time.
- **Safari View Controller / Chrome Custom Tabs** (current): blessed for OAuth. Better UX, but app is still backgrounded — structural risk.
- **`ASWebAuthenticationSession` / Custom Tabs with single-task**: more recent native APIs designed for OAuth. Still don't fully eliminate cold-start.

This is why Expo ships `WebBrowser.maybeCompleteAuthSession()` — it exists specifically to paper over part of this problem.

### Why the starter code hit it too

The original `App.tsx` uses the pattern from Expo's auth-session docs verbatim — `useAuthRequest`, watch `response`, exchange in callback. That pattern works in development on a fast simulator with a fresh OS install (where the app is essentially never killed). It does *not* work reliably on a real device, especially iOS, especially low-memory, especially when the user takes more than a few seconds.

Anyone implementing OAuth from those docs would write code that exhibits the bug. The docs lead you straight to it.

So:
- Starter code uses canonical-but-fragile pattern.
- You followed it (correct first behaviour — "follow the docs").
- You hit the bug in real testing.
- You debugged to root cause and chose a more robust pattern.

That sequence is the *correct* engineering sequence. Not the absence of bugs.

### Interview framing

Don't downplay as "small mistake". The framing that's both true and effective: **this is a known sharp edge of mobile OAuth, the docs lead you into it, and I worked through it.**

Experienced mobile interviewer hearing this story will *recognise it instantly* and lean in. There's a strong chance the Runna team has hit some variant. "Yeah, we ran into the same thing on Android with…" is a likely response. Great moment in an interview: no longer demonstrating, swapping war stories. Signals you've crossed from "knows React Native" to "has shipped React Native".

### Contrast to "implementation mistake"

Typing `useAuthRequst` instead of `useAuthRequest` would be implementing wrong. Swapping client ID and secret would be wrong. Local errors with no interesting cause.

What you hit was an interaction between three independent things — your app's lifecycle, the in-app browser's lifecycle, OS memory pressure — none visible from inside your code. You can't read the OAuth docs and be warned. You can't unit-test it. The only ways to discover: debug when you hit it, or be told by someone who has. Different category from "implementation mistake".

### Useful sentence in your back pocket

If asked "could you have avoided this from the start?":

> "Probably not, no. The Expo docs show the response-watching pattern, and that pattern works in the simulator and on warm resumes. The cold-start case only shows up on real devices under memory pressure, which isn't something you can reasonably anticipate before testing. The right thing in production is what I ended up with — listening on `Linking` directly because that's the layer the OS actually uses to deliver the URL — but I'd argue you have to hit the bug once to know the abstraction is leaking. Now I know."

Honest, concedes nothing you shouldn't, ends with the strongest signal: *I learned the platform lesson and I can apply it next time without rediscovering it.*

---

## General delivery tips

- Name the trade-off. Every answer should have a "but"/"though"/"the cost is".
- Tie technical to product. "I chose X technically *because* it lets us Y as a product."
- Be honest about constraints. "Three hours, so I prioritised…" — once. Don't lean on it for every gap.
- When you flag a bug or limitation, immediately follow with the fix.
- Don't over-claim. If you didn't deeply consider X vs Y, say so. Authentic > polished-but-shallow.
- Listen for the interviewer's signal. If they push, they want depth there. If they nod and move on, don't keep talking.
