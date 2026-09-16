# Test Infrastructure & Specification: Feature B & Feature D E2E Test Suite

## 1. Executive Summary & Architecture

This document defines the test architecture, 4-tier verification methodology, interface contracts, and coverage thresholds for **RateFactor Feature B** (Multi-Dimensional Rating & Critique) and **Feature D** (Available for Hire Beacon & Profile Accolades), as specified in `ORIGINAL_REQUEST.md` (2026-09-13T02:37:38+08:00) and `PROJECT.md`.

### Tech Stack & Test Environment
- **Runtime**: Node.js v22+ with `npx tsx`
- **Framework**: Native Node.js `node:assert` with structured test harnesses and Next.js `NextRequest` / `NextResponse` invocation
- **Execution Mode**: Opaque-box requirement-driven testing; isolates business logic and route endpoints without requiring a live external server
- **Primary Test Runner**: `scripts/verify-e2e-feature-b-d.ts`
- **Run Command**: `npx tsx scripts/verify-e2e-feature-b-d.ts`

---

## 2. Feature Inventory & Coverage Scope

| ID | Feature Name | Domain | Requirements Source | Target Tier |
|---|---|---|---|---|
| **FB-1** | 4-Dimensional Rating Submission | Feature B (Rating) | ORIGINAL_REQUEST R1, PROJECT §2 | Tier 1, Tier 2 |
| **FB-2** | Composite Rating Arithmetic Parity ($/4$) | Feature B (Rating) | ORIGINAL_REQUEST R1, PROJECT §2 | Tier 1, Tier 2 |
| **FB-3** | Dimension Breakdown Meter Fill Calculations | Feature B (Rating UI) | ORIGINAL_REQUEST R1, PROJECT §2 | Tier 1, Tier 2 |
| **FB-4** | Structured Critique Tags Categorization | Feature B (Critique) | ORIGINAL_REQUEST R2, PROJECT §2 | Tier 1, Tier 2 |
| **FB-5** | Request Roast / Critique Flag & Beacon | Feature B (Critique) | ORIGINAL_REQUEST R2, PROJECT §2 | Tier 1, Tier 3 |
| **FD-1** | Available for Hire Status & Beacon Toggle | Feature D (Hire) | ORIGINAL_REQUEST R3, PROJECT §2 | Tier 1, Tier 2 |
| **FD-2** | Hire Inquiry Channels & Template Generator | Feature D (Hire) | ORIGINAL_REQUEST R3, PROJECT §2 | Tier 1, Tier 2 |
| **FD-3** | Tech Stack Matrix 5-Domain Classification | Feature D (Profile) | ORIGINAL_REQUEST R4, PROJECT §2 | Tier 1, Tier 2 |
| **FD-4** | Accolades Derivation from Portfolios | Feature D (Honors) | ORIGINAL_REQUEST R4, PROJECT §2 | Tier 1, Tier 2 |
| **FD-5** | Showcase Accolade Badges & Trophy Cabinet | Feature D (Honors) | ORIGINAL_REQUEST R4, PROJECT §2 | Tier 1, Tier 3 |
| **FX-1** | Rating + Critique Interaction | Cross-Feature | PROJECT §Milestones | Tier 3 |
| **FX-2** | Critique Beacon + Hire Beacon Coexistence | Cross-Feature | PROJECT §Milestones | Tier 3 |
| **FX-3** | Showcase Award + Critique + Hire Beacon | Cross-Feature | PROJECT §Milestones | Tier 3 |
| **FX-4** | Hire Status Real-Time Propagation | Cross-Feature | PROJECT §Milestones | Tier 3 |
| **FR-1** | Full Developer End-to-End Lifecycle | Real-World Scenario | PROJECT §Milestones | Tier 4 |
| **FR-2** | Unauthenticated Guest Interactions | Security & RBAC | PROJECT §Milestones | Tier 4 |

---

## 3. 4-Tier Test Case Design Methodology

### Tier 1: Feature Coverage (>=5 test cases per feature)
Verifies nominal, primary behavior ("happy path") for all core functions and interface contracts:
- **T1.B1**: Rating submission parses and accepts all 4 dimensions: `design`, `codeQuality`, `performance`, `documentation`.
- **T1.B2**: Composite score calculation parity calculates arithmetic mean divided by 4: `((design + codeQuality + performance + documentation) / 4).toFixed(2)`.
- **T1.B3**: Visual dimension breakdown meter bars percentage fill calculation: `(score / 5.0) * 100%`.
- **T1.B4**: Structured critique tags categorization accepts valid tags: `ui_suggestion` (💡 UI Suggestion), `bug_spotted` (🐛 Bug Spotted), `performance_tip` (⚡ Performance Tip), `love_detail` (🔥 Love this Detail).
- **T1.B5**: Portfolio submission and model support `requestCritique: boolean` flag, rendering critique beacons.
- **T1.D1**: "Available for Hire" status toggle and persistence (`availableForHire: boolean`).
- **T1.D2**: Beacon rendering state: 🟢 "Available for Hire" (`availableForHire === true`) vs ⚪ "Not Available" (`availableForHire === false`).
- **T1.D3**: Direct Hire Inquiry contact channels generation (`mailto:`, `website`, `twitter`, `linkedin`, `github`) with pre-composed outreach body.
- **T1.D4**: Tech Stack Matrix categorizes developer skills into 5 standard domains (Frontend, Backend, Database, Cloud, AI) and counts project usage frequencies.
- **T1.D5**: Showcase accolades derivation (`deriveDeveloperAccolades`) accurately detects daily and weekly showcase portfolios and outputs structured accolade objects with trophy/flame metadata.

### Tier 2: Boundary & Corner Cases (>=5 test cases per feature)
Verifies defensive engineering, guardrails, boundary values, and error responses:
- **T2.B1**: Score range bounds: accepts exact boundary scores 1.00 and 5.00 cleanly.
- **T2.B2**: Sub-minimum (<1.0) rejection: scores like `0.9` or `0.0` or `-1.0` return HTTP 400 validation error.
- **T2.B3**: Super-maximum (>5.0) rejection: scores like `5.1` or `6.0` return HTTP 400 validation error.
- **T2.B4**: Missing dimension rejection: omitting `documentation` (or any other dimension) returns HTTP 400 with missing field errors.
- **T2.B5**: Comment quality guardrail: critique comment under 10 characters (e.g. `"nice"`, `"fix this"`) is rejected with HTTP 400 Guardrail Violation.
- **T2.B6**: Anti-spam guardrail: repetitive characters (`"sooooooooooo"`) and promotional spam links (`"t.me/crypto"`) are rejected with HTTP 400.
- **T2.B7**: Invalid critique tag rejection: passing unrecognized tag string (e.g. `"random_opinion"`) returns HTTP 400.
- **T2.B8**: Repeated decimal precision rounding: floating point arithmetic with repeating fractions (e.g. 17/4 = 4.25, 11/4 = 2.75, 13/4 = 3.25, 14/4 = 3.50) resolves cleanly to 2 decimal places without precision drift.
- **T2.D1**: Developer with empty skills array (`skills: []`): Tech Stack Matrix handles zero skills without throwing, returning 0 counts across all domains.
- **T2.D2**: Developer with `availableForHire: true` but missing email: Hire Inquiry generator suppresses invalid `mailto:` and falls back to social links (Twitter/X, LinkedIn, GitHub, Website).
- **T2.D3**: Skill string normalization: handles leading/trailing whitespace, mixed casing (e.g. `"  React  "`, `"react"`, `"REACT"`) by normalizing and deduplicating.
- **T2.D4**: Developer with zero showcase awards: `deriveDeveloperAccolades` returns empty array `[]` cleanly without undefined errors.
- **T2.D5**: Developer with multiple showcase awards: correctly maps both daily and weekly winners, preserving award dates and portfolio associations.

### Tier 3: Cross-Feature Combinations (Pairwise Coverage)
Verifies multi-feature interactions and state coherence:
- **T3.X1**: 4D Rating + Structured Critique Comment on the same portfolio: reviewer rates with 4 dimensions and attaches a `bug_spotted` critique.
- **T3.X2**: Critique Beacon on portfolio by an Available for Hire developer vs Not Available developer: verifying independent state of critique beacon and hire availability beacon.
- **T3.X3**: Tri-feature synergy: a portfolio with Weekly Showcase award + Critique Beacon enabled + Author Available for Hire beacon active simultaneously.
- **T3.X4**: Real-time Hire Status update while viewing portfolio cards: updating developer hire availability immediately propagates to portfolio author beacon display.

### Tier 4: Real-World Application Scenarios
Verifies complete end-to-end user journeys:
- **T4.R1**: Full Developer Lifecycle:
  1. Developer joins platform and fills profile with 6+ skills across Frontend, Backend, and AI.
  2. Developer marks status as 🟢 Available for Hire and customizes hire inquiry message.
  3. Developer submits portfolio requesting in-depth critique (`requestCritique = true`).
  4. Reviewer evaluates portfolio with 4D ratings (Design: 4.8, Code: 4.6, Perf: 4.2, Doc: 4.4 -> Composite: 4.50).
  5. Reviewer posts structured critique tagged `performance_tip` recommending bundle optimization.
  6. Platform algorithm / moderator awards portfolio "Daily Showcase" pick (`showcaseType = "daily"`).
  7. Developer profile derives and displays "Daily Showcase Winner" accolade badge on Honors Shelf.
  8. Recruiter discovers portfolio, observes 🟢 Available for Hire beacon, and generates pre-filled hire inquiry email.
- **T4.R2**: Guest / Unauthenticated Security & RFC 7807 Guardrails:
  1. Unauthenticated guest attempts to submit 4D rating -> HTTP 401 Unauthorized with RFC 7807 problem details.
  2. Unauthenticated guest attempts to post critique comment -> HTTP 401 Unauthorized.
  3. Unauthenticated guest browses portfolio detail -> views 4D breakdown meter bars, critique beacon, and hire availability beacon without error.

---

## 4. Authoritative Interface Contracts

### 4.1 Rating Engine Contract (`POST /api/portfolios/[id]/rate`)
- **Request Body Schema**:
  ```ts
  {
    portfolioId: string;
    design: number;        // [1.0, 5.0]
    codeQuality: number;   // [1.0, 5.0]
    performance: number;   // [1.0, 5.0]
    documentation: number; // [1.0, 5.0]
  }
  ```
- **Composite Score Formula**:
  $$\text{compositeScore} = \text{Number}\left(\left(\frac{\text{design} + \text{codeQuality} + \text{performance} + \text{documentation}}{4}\right)\text{.toFixed}(2)\right)$$
- **Response Payload**:
  ```ts
  {
    message: string;
    portfolioId: string;
    score: number; // compositeScore
    breakdown: {
      design: number;
      codeQuality: number;
      performance: number;
      documentation: number;
    };
  }
  ```

### 4.2 Critique Comments Contract (`POST /api/portfolios/[id]/comments`)
- **Request Body Schema**:
  ```ts
  {
    portfolioId: string;
    content: string; // min 10 chars, passing guardrails
    critiqueTag?: "ui_suggestion" | "bug_spotted" | "performance_tip" | "love_detail" | null;
  }
  ```
- **Tag Dictionary**:
  - `ui_suggestion`: 💡 UI Suggestion
  - `bug_spotted`: 🐛 Bug Spotted
  - `performance_tip`: ⚡ Performance Tip
  - `love_detail`: 🔥 Love this Detail
- **Response Payload**:
  ```ts
  {
    message: string;
    comment: {
      id: string;
      portfolioId: string;
      content: string;
      critiqueTag?: string | null;
      authorName: string;
      createdAt: string;
    };
  }
  ```

### 4.3 Developer Profile & Hire Beacon Contract (`/api/profile`)
- **Profile Object Extension**:
  ```ts
  {
    availableForHire: boolean;
    customHireMessage?: string;
  }
  ```
- **PATCH /api/profile Body Schema**:
  ```ts
  {
    availableForHire?: boolean;
    customHireMessage?: string;
    skills?: string[];
    bio?: string;
    company?: string;
    location?: string;
    website?: string;
    github?: string;
    twitter?: string;
    linkedin?: string;
  }
  ```

### 4.4 Showcase Accolades Contract (`src/lib/accolades.ts`)
```ts
export interface ShowcaseAccolade {
  id: string;
  type: "daily" | "weekly";
  title: string;
  portfolioId: string;
  portfolioTitle: string;
  awardedDate: string;
  iconName: "trophy" | "flame";
}

export function deriveDeveloperAccolades(portfolios: Portfolio[]): ShowcaseAccolade[];
```

---

## 5. Coverage Gates & Verification Protocol

1. **Gate 1: Static Type Checking**:
   `npx tsc --noEmit` must pass with 0 TypeScript compilation errors.
2. **Gate 2: Existing Regression Tests**:
   `npm test` must continue to pass cleanly without regressions.
3. **Gate 3: Feature B & D 4-Tier Test Runner**:
   `npx tsx scripts/verify-e2e-feature-b-d.ts` must execute all Tiers 1-4 tests:
   - Tier 1: 10+ test assertions (100% pass)
   - Tier 2: 12+ boundary assertions (100% pass)
   - Tier 3: 4+ cross-feature assertions (100% pass)
   - Tier 4: 2+ comprehensive lifecycle assertions (100% pass)
   - Overall Exit Code: `0`
4. **Gate 4: Build Verification**:
   `npm run build` must complete cleanly.
