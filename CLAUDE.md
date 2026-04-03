# Fluxy - Project Context for Claude

## App Overview

Fluxy is an iOS mathematics education app for interactive practice across multiple math topics. Students answer questions with immediate feedback (particle animations, haptics) and can select difficulty levels. The app has a freemium model with social/competitive features (daily streaks, Elo-rated competition).

**Target audience:** VCE (Victorian Certificate of Education) students in Australia, primarily years 11–12 studying Mathematical Methods and Specialist Mathematics. The app is intentionally fast-paced — questions should be answerable in seconds, not minutes. The experience should feel more like a reflex trainer than a homework helper.

**Growth strategy:** User growth takes priority over monetisation. Free tier limits are set to be generous enough that students can build a genuine daily habit before hitting a wall. Virality comes from streaks, leaderboards, and social sharing — not paid acquisition.

## Architecture

### Current state
- **SwiftUI-only** with no separate ViewModel layer — state lives in views via `@State`
- **Firebase** is live: Auth (Sign in with Apple + email/password) and Firestore (user profiles, streaks, Elo, competitions, friends, challenges)
- **Service layer** is implemented — `@Observable` service objects owned at app level in `FluxyApp.swift` and injected via SwiftUI environment:
  - `AuthService` — Firebase Auth wrapper; Sign in with Apple + email/password; exposes `currentUser`
  - `UserService` — reads/writes Firestore `users` collection; holds `UserProfile` (username, email, streakDays, eloRating, isPremium, lifetimeTotals, etc.)
  - `StreakService` — computes streak state; UserDefaults local cache synced to Firestore on foreground; daily goal = 20 questions; revival state persisted in UserDefaults
  - `FriendService` — friend requests (pending_sent / pending_received / accepted) stored in Firestore subcollection
  - `CompetitionService` — SBMM matchmaking via Firebase Cloud Function, real-time Firestore listener for live match state, async friend challenges, match history
- **LaTeXSwiftUI** used for rendering math expressions in Trig, Differentiation, Antidifferentiation, Complex Numbers, and Log/Index Laws views
- UIKit is used only for `UINotificationFeedbackGenerator` and `UIImpactFeedbackGenerator`
- **App is locked to light mode** via `.preferredColorScheme(.light)` on the root `ContentView` in `FluxyApp.swift`

### Target architecture (remaining work)
- **Push notifications**: `UserNotifications` for streak reminders (not yet implemented)

## File Structure

| File | Purpose |
|---|---|
| `FluxyApp.swift` | App entry point (`@main`); owns and injects all services; configures Firebase; locked to light mode |
| `ContentView.swift` | `HomeView` (home screen + competition nav stack), `TopicSelectionView`, `TopicCard`, `MathTopic` enum, `Color(hex:)` extension, `fluxyOrange` brand colour |
| `LandingView.swift` | Sign in / sign up entry point shown when no authenticated user; Sign in with Apple + email flows; username setup sheet on first login |
| `LogInView.swift` | Email/password sign-in form |
| `SignUpView.swift` | Email/password sign-up form |
| `AuthService.swift` | Firebase Auth wrapper (`@Observable`); Sign in with Apple + email/password; `currentUser` |
| `UserService.swift` | Firestore `users` collection read/write; `UserProfile` model (username, email, streakDays, eloRating, isPremium, lifetimeTotals, etc.) |
| `StreakService.swift` | Streak state (`todayCorrectCount`, `streakDays`, `streakCompletedToday`); UserDefaults local cache; syncs from Firestore on foreground; daily goal = 20; revival state (`revivalAvailable`, `revivalOldStreakDays`, `revivalOldElo`) |
| `StreakRevivalOverlay.swift` | Full-screen revival pop-up shown on first app open after a premium streak break; heart icon, streak count, remaining lives, "Revive Streak" and "Not Now" actions |
| `StreakProgressBar.swift` | Shared progress bar shown in practice views and home screen; reads from `StreakService` |
| `StreakCompletionAnimation.swift` | Overlay animation shown when a streak is completed for the day |
| `FriendService.swift` | Friend requests and accepted friends via Firestore subcollection; search by username |
| `FriendsView.swift` | Friend list, search, pending requests UI |
| `ProfileView.swift` | Current user's profile: username, email, streak, Elo, lifetime stats, sign out, delete account |
| `CompetitionService.swift` | SBMM matchmaking (Firebase Cloud Function), real-time match listener, async friend challenges, match history, Elo |
| `CompetitionView.swift` | All competition screens: lobby, setup, matchmaking, live match (SBMM + challenge), results |
| `CompetitionQuestionGenerator.swift` | Seeded question generation for competition matches |
| `NumericalCalculationsView.swift` | Mental arithmetic with custom numpad; easy (integers) and hard (fractions) modes |
| `TrigExactValuesView.swift` | Recall exact trig values at standard angles |
| `DifferentiationView.swift` | Polynomial and trig derivatives |
| `AntidifferentiationView.swift` | Polynomial and trig integrals |
| `ComplexNumbersView.swift` | Cartesian ↔ Polar conversion |
| `LogIndexLawsView.swift` | Index laws and log laws, 3 difficulty levels each |
| `SuccessAnimation.swift` | Shared particle/shockwave success feedback |

## Key Patterns

### Question Generation
Each view generates questions as structs containing a LaTeX string and 4 `Choice` options. Decoys are modelled on common student mistakes (wrong sign, forgot to multiply/divide by exponent, wrong trig function, adjacent angle, etc.). A fallback random pool is used if not enough targeted decoys can be generated.

### Exact Symbolic Math
- `Frac` / `AFrac` structs perform rational arithmetic (GCD reduction, multiply, add, negate) and render to LaTeX — avoiding floating-point display errors
- `CAngle` represents angles as rational multiples of π (k·π/d)
- `kTrigAngles` / `kCplxAngles` are hardcoded lookup tables of 33 standard angles with exact sin/cos/tan values (including √2/√3 factors)

### LaTeX Rendering
- LaTeX strings are stored **without** `$…$` delimiters in question factories
- The `tex()` helper wraps them at render time
- Never use floating-point values directly in displayed math — always compute exact symbolic strings

### Success Animation (`SuccessAnimation.swift`)
- `SuccessAnimationState` is an `@Observable` class owned by each practice view as `@State`
- Applied via `.successAnimationOverlay(state:)` view extension
- Calls `onNext` callback after the exit animation to load the next question
- All practice views follow the same pattern: correct answer → `animState.trigger(origin:onNext:)`

### Difficulty & Mode
- Each view has its own `Difficulty` enum (easy/medium/hard) and optional `Mode` enum
- Displayed as flame buttons (1–3 flames) for difficulty
- Custom floating-card dropdown for mode where applicable (matches NumericalCalculations/ComplexNumbers style)

### Numpad Layout (NumericalCalculations + Competition views)
- The answer input display area must always have a **fixed height** (`ZStack { ... }.frame(height: 96)`) so that switching between integer and fraction display never causes the numpad to shift or resize
- The fraction bar button uses a shorter `fracBarHeight = keyHeight * 0.6` — it is a compact extra row that sits above the digit keys without stealing space from them
- `keyHeight` is always computed from the base 4.5-row formula regardless of whether hard (fraction) mode is active

### Firestore Data Model
- **`users/{uid}`**: `username`, `email`, `createdAt`, `streakDays`, `streakCompletedToday`, `todayCorrectCount`, `lastActiveDate` (yyyy-MM-dd, Melbourne time), `isPremium`, `streakLives`, `streakLivesLastGrantMonth` ("yyyy-MM"), `eloRating`, `lifetimeTotals` (map of `MathTopic.firestoreKey` → Int)
- **`usernames/{username}`**: `uid` — used for uniqueness checks
- **`users/{uid}/friends/{friendUid}`**: `username`, `status` (pending_sent / pending_received / accepted), `createdAt`
- **Competition**: `matches/{matchId}`, `queue/{uid}` — managed by `CompetitionService` and Firebase Cloud Functions
- **Challenges**: `challenges/{challengeId}` — async friend challenges with `challenger`, `opponent`, `status`, `mode`, `duration`, `challengerResult`, `opponentResult`, `winnerId`

## Shared UI Conventions

- Brand accent color: `fluxyOrange` = `#FFBF00` (defined via `Color(hex:)` extension in `ContentView.swift`)
- App is always in **light mode** — `.preferredColorScheme(.light)` applied at the root; do not use dark-mode-only colours or assets
- Wrong answer: shake animation + `UINotificationFeedbackGenerator(.error)` haptic
- Correct answer: success animation + `UIImpactFeedbackGenerator(.heavy)` haptic
- Answer grids: 2×2 layout of multiple-choice buttons
- Large question display: 80pt font, 1.9× scale effect for LaTeX views
- Streak progress bar (`StreakProgressBar`) is shown in practice views and the home screen — reads from `StreakService` environment object

## Adding a New Topic

1. Add a case to `MathTopic` in `ContentView.swift` (with `subtitle`, `icon`, and routing in `@ViewBuilder`)
2. Create a new `*View.swift` following the existing view structure:
   - Define `Difficulty` (and `Mode` if needed) enums
   - Define a `Question` struct with a display string and 4 `Choice` options
   - Write a `generateQuestion()` function with targeted decoys
   - Use `SuccessAnimationState` and `.successAnimationOverlay(state:)` for feedback

---

## Product Features (Planned)

### Free vs Premium

| Feature | Free | Premium |
|---|---|---|
| Numerical Calculations questions/day | Unlimited | Unlimited |
| All other topics questions/day | 20 per topic (100 total across 5 topics) | Unlimited |
| Daily competitions | 3 | Unlimited |
| Streak lives/month | 0 | 2 |
| Colour palette customisation | No | Yes |
| Avatar customisation | No | Yes |

**Rationale for limits:** Numerical Calculations is always unlimited — it's the core free experience and the best habit-forming topic. The 5 LaTeX topics are capped at 20/day free (100 total), which is enough for a meaningful session before hitting a wall. The limit should feel like a natural stopping point, not a punishment. Do not show hard error screens — show a friendly "come back tomorrow" message with a clear premium upsell.

### Streak System

Streaks require completing 20 questions in any topic per day. They reset to zero if the quota is missed and the user has no lives remaining. Premium users get 2 lives per calendar month (reset client-side on foreground sync; never accumulate — always topped up to exactly 2).

**Streak lives revival flow (implemented):**
1. Streak breaks overnight (Cloud Function sets `streakDays: 0`)
2. User opens app → foreground sync detects break (`streakDays == 0 && local > 0`) → Elo penalty applied (4%)
3. If premium + has lives → `StreakRevivalOverlay` shown automatically (one-time per break, persisted in UserDefaults)
4. User can "Revive Streak" (restores old streak, decrements life, undoes Elo penalty) or "Not Now"
5. If dismissed: a "Revive Streak" pill appears on the home screen below the streak bar
6. Tapping "Practice" while revival is pending shows an alert: completing the daily goal will forfeit the revival option for this break (life is kept)
7. Completing 20 questions forfeits the revival permanently for that break; fresh streak of 1 begins
8. Monthly life reset: checked on foreground sync — if current Melbourne month differs from `streakLivesLastGrantMonth`, reset to 2 lives and update Firestore

- Current streak length and Elo rating are public on a user's profile

### Competition Mode

- Timed head-to-head rounds between two users (or small groups — TBD)
- **Skill-based matchmaking (SBMM)** — users are paired by Elo proximity; search radius expands gradually if no close match is available, falling back to a bot as a last resort
- Questions drawn from any topic; both players see the same question simultaneously
- Winner earns Elo; loser loses Elo (standard Elo formula, K-factor TBD)
- Free users: 3 competitions per day; Premium: unlimited
- Results and Elo changes visible after each round

### User Profiles

- Display name, avatar (customisable — premium only)
- Public stats: current streak, Elo rating
- Leaderboard/friend list showing friends' Elo and streaks

### Onboarding & Curriculum Mapping

On first launch, ask the student which VCE subject they are studying (Further Mathematics, Mathematical Methods, Specialist Mathematics). Use their answer to:
- Surface the most relevant topics prominently on the home screen
- Personalise the streak quota messaging ("Methods students typically drill 20 Differentiation questions per day")
- In future, surface the most relevant topics more prominently based on subject

This is a high-ROI build — one screen on first launch, significant improvement in new-user retention.

### Virality — Social Sharing

Students sharing the app with classmates is the primary organic growth mechanism. Features to support this:

- **Streak share card** — after a streak milestone (7 days, 30 days, etc.), offer a pre-formatted share sheet image showing the streak count and flame level. Students will post these to group chats.
- **"Challenge a friend" deep link** — generate a URL that opens the app and auto-starts a competition against the sender. Works even if the recipient doesn't have the app yet (opens App Store first).
- **Score/result share card** — after a competition, show a shareable result card (winner, Elo change, question count).

The share cards should look great as screenshots — treat them as marketing material.

### Teacher Adoption — Class Share Feature

A single teacher recommending Fluxy to their class is worth 25–30 installs and strong word-of-mouth. Build a low-cost feature to enable this:

- **"Share with your class" page** — accessible from the home screen or profile. Generates a QR code and a short URL (e.g. `fluxy.app/join/[code]`) that the teacher can display on a projector or share in a class group chat.
- When a student scans the QR code or follows the link, they're taken to the App Store (or directly into the app if already installed) and optionally auto-added to the teacher's class group.
- A teacher "class view" (minimal — just a list of their students' streaks and Elo ratings) gives teachers a reason to keep using the app themselves and recommend it to colleagues.
- No complex account type needed initially — a teacher is just a regular user who generates a class code.

This feature should be planned for Phase 4 alongside social features, but the QR/share flow itself is simple enough to ship earlier.

### VCE Exam Season Timing

The VCE written exams run in October–November. This is the peak anxiety and motivation window for the target audience. Aim to have Phases 1–3 (persistence, streaks, premium) live by **late July** at the latest so students can build streaks heading into their exam revision period. Social features and competition (Phases 4–5) should be live by **September** to drive word-of-mouth during the peak study period.

---

## Development Plan

The project requires five major phases before the full product vision is complete. Each phase is independently shippable.

---

### Phase 1 — Persistence & Authentication ✅ COMPLETE
- Firebase SDK (Auth + Firestore) integrated
- `AuthService`, `UserService`, `StreakService` implemented and injected via environment
- Sign in with Apple + email/password flows working; username setup on first login
- User document in Firestore with full schema
- UserDefaults local cache for streak state; syncs from Firestore on app foreground

---

### Phase 2 — Streak UI & Daily Progress ✅ COMPLETE
- `StreakProgressBar` shown on home screen and in all practice views
- Streak count badge on profile avatar button in `HomeView`
- `StreakCompletionAnimation` plays when daily goal (20 questions) is reached
- `StreakService.recordCorrectAnswer()` increments count and writes to Firestore

---

### Phase 3 — Premium & In-App Purchase ✅ MOSTLY COMPLETE
- StoreKit 2 integrated; product `com.fluxy.premium.monthly` defined in `.storekit` config
- `PurchaseService: @Observable` — wraps StoreKit 2 APIs; exposes `isPremium: Bool`; handles restore; syncs to Firestore
- `PaywallView` — generic modal with `PaywallReason` enum; shown when free user hits any limit
- `DailyLimitOverlay` — shown when daily question limit reached in practice views
- Daily question limits enforced in all 5 LaTeX topic views (20/day free); Numerical Calculations unlimited for all
- Daily competition limit enforced (3/day free)
- Colour scheme picker gated behind premium in `ProfileView` (lock icon + paywall on tap)
- Avatar picker gated behind premium in `ProfileView` (lock badge + paywall on tap)

**Remaining:**
- Streak Levels 2 & 3 (only Level 1 active; L2/L3 tracking and unlock not yet implemented)

**Colour themes (12 implemented):** Amber, Arctic, Ember, Forest, Violet, Sakura, Ocean, Sunset, Midnight, Neon, Rose Gold, Slate — all defined in `AppTheme.swift` via `ThemeService`; selectable from `ThemePickerView` (premium-gated).

---

### Phase 4 — User Profiles, Social & Teacher Adoption ✅ MOSTLY COMPLETE
- `ProfileView` — username, email, streak, Elo, lifetime stats per topic, sign out, delete account
- `FriendService` + `FriendsView` — search by username, send/accept friend requests, friend list
- **Friend challenges** — async 60s 1v1 via `CompetitionService.createChallenge()`, pending/active challenge rows in lobby

**Remaining:**
- Friends leaderboard (ranked by Elo)
- Share cards (streak milestones, competition results)
- Teacher class feature / QR codes
- Deep links / Universal Links

---

### Phase 5 — Competition Mode ✅ MOSTLY COMPLETE
- SBMM matchmaking via Firebase Cloud Function; falls back to a bot after 7s countdown
- Live 60s match (`NumericalMatchView`) with real-time opponent score sync via Firestore listener
- Bot opponent with pre-generated answer timings revealed in real time
- Async friend challenge match (`NumericalChallengeMatchView`)
- Results screen with Elo delta; match history in lobby
- Competition is Numerical Calculations only (easy = integers, hard = fractions)
- Duration options: 30 / 60 / 90 / 120 seconds

**Elo formula** (implemented in Cloud Function `submitMatchResult`):
- `K(elo) = elo < 1200 ? 32 : elo < 1600 ? 24 : 16`
- `expected = 1 / (1 + 10^((opponentElo − myElo) / 400))`
- `margin = (myScore − oppScore) / max(myScore + oppScore, 1)` → −1..1
- `W = clamp(0.5 + margin × 0.5, 0, 1)`
- `delta = round(K × (W − expected))`

**Streak break Elo penalty** (implemented client-side in `UserService.applyStreakBreakEloPenalty`):
- When the server resets `streakDays` to 0, the user loses **4% of their current Elo rating** (floor: 0)
- `newElo = max(0, round(currentElo × 0.96))`
- Detected in `StreakService.apply()` when incoming `streakDays == 0` and local `currentStreakDays > 0`
- Wired via `StreakService.onStreakBroken` callback set in `FluxyApp.init()`
- Penalty fires once per break (on next app foreground after the streak resets overnight)
- Penalty is **undone** if the user revives their streak via a streak life (`UserService.undoStreakBreakEloPenalty`)

**Elo permanent premium unlock** (implemented in `PurchaseService.grantEloPremium`):
- Reaching Elo 2400 grants **lifetime premium** — the user keeps premium access permanently regardless of their Elo going forward (they can drop below 2400 and still retain premium)

**Remaining:**
- Daily competition limit enforcement (3 free / unlimited premium) — depends on Phase 3
- "Challenge a friend" deep link / Universal Link

---

## What Not To Do

- Do not add new Firebase collections or schema changes without being asked
- Do not add a Combine-based reactive layer — use Swift async/await or `@Observable` instead
- Do not use floating-point values in rendered math answers — use exact symbolic strings
- Do not force-unwrap optionals
- Do not add comments to code you haven't changed
- Do not start Phase 3 (premium/IAP) work without being asked — it requires App Store Connect setup first
- Do not use dark-mode-aware system colours that would look wrong — the app is locked to light mode
