# Fluxy - Project Context for Claude

## App Overview

Fluxy is an iOS mathematics education app for interactive practice across multiple math topics. Students answer questions with immediate feedback (particle animations, haptics) and can select difficulty levels. The app has a freemium model with social/competitive features (daily streaks, Elo-rated competition).

**Target audience:** VCE (Victorian Certificate of Education) students in Australia, primarily years 11–12 studying Mathematical Methods and Specialist Mathematics. The app is intentionally fast-paced — questions should be answerable in seconds, not minutes. The experience should feel more like a reflex trainer than a homework helper.

**Growth strategy:** User growth takes priority over monetisation. Free tier limits are set to be generous enough that students can build a genuine daily habit before hitting a wall. Virality comes from streaks, leaderboards, and social sharing — not paid acquisition.

## Architecture

### Current state
- **SwiftUI-only** with no separate ViewModel layer — state lives in views via `@State`
- **No networking, no persistence** — all question generation is pure client-side logic
- **LaTeXSwiftUI** is the only external dependency, used for rendering math expressions in Trig, Differentiation, Antidifferentiation, Complex Numbers, and Log/Index Laws views
- UIKit is used only for `UINotificationFeedbackGenerator` and `UIImpactFeedbackGenerator`

### Target architecture (as features are added)
- **Authentication**: Sign in with Apple + email/password via Firebase Auth
- **Backend**: Firebase (Firestore for user data/streaks/Elo, Firebase Functions for Elo calculation and competition orchestration, Firebase Realtime Database or Firestore for live competition state)
- **In-app purchase**: StoreKit 2 for premium subscription
- **Local persistence**: SwiftData (or simple UserDefaults) for caching daily question counts and streak data locally so the app works offline and syncs when back online
- **Service layer**: Introduce `@Observable` service objects (e.g. `AuthService`, `UserService`, `StreakService`, `CompetitionService`) owned at the app level and injected via SwiftUI environment — keeping views free of network logic

## File Structure

| File | Purpose |
|---|---|
| `FluxyApp.swift` | App entry point (`@main`) |
| `ContentView.swift` | Home screen, topic selection, `MathTopic` enum, navigation routing |
| `NumericalCalculationsView.swift` | Mental arithmetic with custom numpad |
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

## Shared UI Conventions

- Brand accent color: `fluxyOrange` = `#FFBF00` (defined via `Color(hex:)` extension in `ContentView.swift`)
- Wrong answer: shake animation + `UINotificationFeedbackGenerator(.error)` haptic
- Correct answer: success animation + `UIImpactFeedbackGenerator(.heavy)` haptic
- Answer grids: 2×2 layout of multiple-choice buttons
- Large question display: 80pt font, 1.9× scale effect for LaTeX views

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
| Numerical Calculations questions/day | 40 | Unlimited |
| All other topics questions/day | 10 per topic (50 total across 5 topics) | Unlimited |
| Daily competitions | 3 | Unlimited |
| Personal timed practice (competition training) | No | Yes |
| Streak lives/month | 0 | 2 |
| Streak levels available | Level 1 only | Levels 1–3 |
| Colour palette customisation | No | Yes |
| Profile design flexibility | Basic | Full |

**Rationale for limits:** 40 numerical + 10 per LaTeX topic = 90 questions/day free. This is enough for a meaningful 10–15 minute daily session across multiple topics, building habit before hitting a wall. The limit should feel like a natural stopping point, not a punishment. Do not show hard error screens — show a friendly "come back tomorrow" message with a clear premium upsell.

### Streak System

Streaks require completing a daily question quota. They reset to zero if the quota is missed and the user has no lives remaining. Premium users get 2 lives per month that can be spent to protect a broken streak.

| Level | Requirement | Availability |
|---|---|---|
| Level 1 | 20 questions in any one topic per day | Free + Premium |
| Level 2 | 20 questions each in any 3 different topics per day | Premium only |
| Level 3 | 20 questions each in all 6 topics per day | Premium only |

- Streak level, current streak length, and Elo rating are public on a user's profile
- Completing higher streak levels earns more "streak points" / visual badges (TBD)

### Competition Mode

- Timed head-to-head rounds between two users (or small groups — TBD)
- Users are matched by Elo rating where possible
- Questions drawn from any topic; both players see the same question simultaneously
- Winner earns Elo; loser loses Elo (standard Elo formula, K-factor TBD)
- Free users: 3 competitions per day; Premium: unlimited
- Results and Elo changes visible after each round

### User Profiles

- Display name, avatar (basic free / customisable premium)
- Public stats: current streak, streak level, Elo rating
- Leaderboard/friend list showing friends' Elo and streaks

### Onboarding & Curriculum Mapping

On first launch, ask the student which VCE subject they are studying (Further Mathematics, Mathematical Methods, Specialist Mathematics). Use their answer to:
- Surface the most relevant topics prominently on the home screen
- Personalise the streak quota messaging ("Methods students typically drill 20 Differentiation questions per day")
- In future, tailor which topics count toward streak levels

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

### Phase 1 — Persistence & Authentication
*Goal: user identity, local + cloud storage of progress. No social features yet.*

1. **Add Firebase SDK** (Auth, Firestore) via Swift Package Manager
2. **Authentication flow**
   - `AuthService: @Observable` — wraps Firebase Auth, exposes `currentUser`, `signIn()`, `signUp()`, `signInWithApple()`
   - Onboarding/login screen (shown when no authenticated user)
   - Sign in with Apple (required for App Store) + email/password fallback
3. **User document in Firestore**
   - Schema: `userId`, `displayName`, `isPremium`, `eloRating` (default 1000), `streakDays`, `streakLevel`, `streakLives`, `lastActiveDate`, `dailyCounts` (map of topic → count, resets daily)
4. **`UserService: @Observable`** — reads/writes user document; injected via `.environment`
5. **`StreakService: @Observable`** — computes streak state from `lastActiveDate` + `dailyCounts`; handles daily reset logic; deducts a life on missed day if lives > 0
6. **Local caching** — `UserDefaults` or `SwiftData` shadow of daily counts so the app is usable offline; synced to Firestore on reconnect
7. **Wire daily question limits into each practice view** — each view reads from `UserService` to check remaining questions; shows a "quota reached" paywall nudge when at limit

---

### Phase 2 — Streak UI & Daily Progress
*Goal: visible streak display on home screen and within practice views.*

1. **Streak widget on home screen** (ContentView) — shows current streak, level badge, flame icon
2. **Daily progress ring/bar** per topic on home screen — shows questions answered today vs target (20)
3. **Streak level indicator** — L1/L2/L3 badge; locked levels shown greyed out with "Premium" lock for free users
4. **"Lives" display** — small heart icons on streak widget; tappable to explain the mechanic
5. **End-of-day summary** (optional push notification via `UserNotifications`) — "You're 5 questions away from keeping your streak"
6. **Streak broken screen** — shown when a streak resets; offers life purchase or premium upsell

---

### Phase 3 — Premium & In-App Purchase
*Goal: gate premium features behind a StoreKit 2 subscription.*

1. **Add StoreKit 2** — define one auto-renewing subscription product (e.g. `com.fluxy.premium.monthly`) in App Store Connect
2. **`PurchaseService: @Observable`** — wraps StoreKit 2 `Product`/`Transaction` APIs; exposes `isPremium: Bool`; handles restore purchases
3. **Paywall screen** — shown when free user hits a limit (questions, competitions, streak level); lists premium benefits; single subscribe CTA
4. **Gate UI elements** — streak level badges for L2/L3 show lock icon; colour palette picker disabled; profile customisation gated
5. **Colour palette** (premium perk) — define 3–4 palettes beyond the default orange; stored in `UserService`; applied via a `ThemeService` injected into environment; all accent colour references read from theme instead of hardcoded `fluxyOrange`
6. **Profile customisation** — avatar picker (system SF Symbols or photo), custom display name, bio (premium)

---

### Phase 4 — User Profiles, Social & Teacher Adoption
*Goal: public profiles, friend system, leaderboard, viral sharing, and teacher-driven class growth.*

1. **Profile screen** — displays own or another user's public stats (streak, Elo, streak level, join date)
2. **Friend system** — search by username; send/accept friend requests stored in Firestore subcollection
3. **Friends leaderboard** — ranked by Elo; shows streak length alongside
4. **Global leaderboard** (optional, premium) — top N users by Elo
5. **Deep links** — share profile URL; tapping opens profile in app
6. **Share cards** — shareable image cards for streak milestones and competition results; generated via SwiftUI rendered to an image and passed to the system share sheet
7. **Teacher class feature** — any user can generate a class code and QR code from their profile; students who scan/follow the link are added to the class group; the teacher sees a simple class leaderboard (streaks + Elo); class code links route through a Universal Link to the App Store if the app isn't installed
8. **"Challenge a friend" deep link** — generates a URL that auto-starts a competition against the sender when tapped

---

### Phase 5 — Competition Mode
*Goal: real-time Elo-rated head-to-head competitions.*

1. **Matchmaking** — user taps "Compete"; `CompetitionService` writes a matchmaking document to Firestore; a Firebase Cloud Function pairs users by Elo proximity within a timeout window; falls back to a bot/random opponent if no match found
2. **Competition session** — Firestore document tracks: both player IDs, current question, each player's answer + timestamp, round number (e.g. best of 5 questions), scores
3. **`CompetitionView`** — real-time listener on competition document; shows shared question with countdown timer; both players answer simultaneously; shows who answered correctly/faster
4. **Elo update** — Firebase Cloud Function fires on competition completion; updates both users' `eloRating` in Firestore using standard Elo formula (K = 32 initially)
5. **Results screen** — shows Elo change, winner/loser, option to rematch or return home
6. **Daily competition limit** — `CompetitionService` checks `dailyCounts.competitions` against limit (3 free / unlimited premium)
7. **Friend challenge** — invite a specific friend to a competition via deep link or in-app notification

---

## What Not To Do

- Do not add networking or persistence without being asked
- Do not add a Combine-based reactive layer — use Swift async/await or `@Observable` instead
- Do not use floating-point values in rendered math answers — use exact symbolic strings
- Do not force-unwrap optionals
- Do not add comments to code you haven't changed
- Do not start any Phase 2+ work until Phase 1 persistence is in place
