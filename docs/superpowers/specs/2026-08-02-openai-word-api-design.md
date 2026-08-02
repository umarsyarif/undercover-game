# Design: OpenAI word generation on Cloudflare Pages

Date: 2026-08-02
Status: awaiting user approval

Supersedes the n8n webhook word source. Incorporates findings from three independent reviews
(codebase fact-check, OpenAI/Cloudflare technical verification, adversarial design review).

---

## 1. Goal

Move AI word-pair generation from a public n8n webhook into a Cloudflare Pages Function that
this repo owns, with the prompt in version control. Fix the correctness bugs found along the
way and delete the dead service layer.

## 2. Situation

`umarsyariif.site` has no DNS — apex and the `n8n.` subdomain both return no A record. The
site is not live and **"Get New Words from API" is already broken in production**. This work is
a restoration, not a hot swap; there are no users to strand and nothing to roll back to.

`umeh.me` is registered (NameCheap, expires 2027-05-15) and already on Cloudflare nameservers.
The apex serves a personal portfolio, apparently from an existing Pages project.
`undercover.umeh.me` is free.

### Decisions

| Decision | Choice |
|---|---|
| Provider | OpenAI |
| Model | `gpt-5.6-luna` ($0.20/M in, $1.20/M out) |
| Hosting | Cloudflare Pages + Pages Functions, single project |
| Domain | `undercover.umeh.me` — apex untouched |
| Old deploy | Docker / nginx / Traefik deleted |
| Abuse control | **Deferred.** Public, unauthenticated. See §9 |
| Player-facing word controls | None. Server-side prompt only |
| Fetch trigger | Unchanged — manual, at pool exhaustion |
| Max pairs per fetch | **20** (was 50) |
| Fix scope | Correctness bugs, dead code, test setup, cosmetic |

`localStorage` is keyed to origin, so moving to `undercover.umeh.me` resets every existing word
pool to the 5 hardcoded defaults. Accepted — the old origin has been dark, so that data is
already stranded.

---

## 3. Architecture

```
Cloudflare Pages project "undercover-game"
  custom domain: undercover.umeh.me
├── /                    static Vite build (dist/)
└── /api/words           Pages Function
                           ↓ OPENAI_API_KEY (encrypted Pages secret)
                         api.openai.com
```

Same origin: no CORS, no build-time endpoint config, one atomic deploy for client + function.

### File changes

```
functions/api/words.ts          NEW     handler
functions/api/prompt.ts         NEW     versioned prompt constant
functions/tsconfig.json         NEW     separate TS project for the function
functions/types.d.ts            NEW     generated: wrangler types
wrangler.toml                   NEW     Pages config
.dev.vars                       NEW     local secret, gitignored
public/_headers                 NEW     security headers (see §8)

src/services/wordService.ts     EDIT    POST /api/words, zod, typed errors, dedupe, timeout
src/types/gameTypes.ts          EDIT    contract types + needsNameEntry on GameState
src/components/WordManagementModal.tsx  EDIT  typed errors, added-count feedback, Indonesian copy
src/App.tsx                     EDIT    render WordManagementModal at top level
src/test/word-service.test.ts   REWRITE against the new contract
src/test/ordering.vitest.ts     RENAME  → ordering.extra.test.ts, so it actually runs (see §11)
vitest.config.ts                EDIT    jsdom + widen include to cover functions/
tsconfig.app.json               EDIT    exclude functions/
package.json                    EDIT    +openai, zod ^3.25.76, +wrangler, dev scripts
package-lock.json               REGEN   required — see §4 blocker
.env                            EDIT    drop VITE_WORD_API_ENDPOINT
.gitignore                      EDIT    .dev.vars
README.md                       EDIT    env-var section + deploy + local dev
docs/DEPLOYMENT.md              REWRITE for Pages

Dockerfile                      DELETE
nginx.conf                      DELETE
docker-compose.yml              DELETE
deploy.sh                       DELETE
docker/                         DELETE
```

---

## 4. Blocking prerequisite: zod

`package-lock.json` pins **zod 3.23.8 exactly**. Its exports map is only `.`, `./package.json`,
`./locales/*`.

`openai` peer-requires `zod ^3.25 || ^4.0`, and `openai/helpers/zod` does an unconditional
`import * as z4 from 'zod/v4'`. That subpath does not exist in 3.23.8. Verified: the bundle
fails with `Could not resolve "zod/v4"` and `Could not resolve "zod/v3"`.

**Bump to `zod@^3.25.76` and regenerate the lockfile before anything else.** The classic
`import { z } from 'zod'` v3 API is unchanged, so no existing client code changes. Do not jump
to zod v4 — that is a breaking change for `src/` for no benefit here.

---

## 5. The contract

Shared types in `src/types/gameTypes.ts`, imported by both the function and the client. The
function importing across the `src/` boundary works with the Pages bundler but requires the
tsconfig split in §7.

```ts
// POST /api/words
interface WordApiRequest {
  count: number;          // 1..20
  avoid?: string[];       // civilian AND undercover words, max 60 entries
}

// 200
interface WordApiResponse {
  data: Array<{ civilian: string; undercover: string }>;
}

// 4xx / 5xx
interface WordApiError {
  error: 'invalid_request' | 'upstream_error' | 'bad_response' | 'server_error';
  message: string;        // fixed Indonesian string per code — never derived from err.message
}
```

`avoid` carries **both halves** of recent pairs, not just civilian words. Reason: the model can
otherwise return `{civilian:'Teh', undercover:'Kopi'}` against a stored `{civilian:'Kopi',
undercover:'Teh'}` — a different tuple, an identical round for players.

---

## 6. The Pages Function

`functions/api/words.ts`, exporting `onRequestPost: PagesFunction<Env>`.

### Request validation — security-critical

`avoid` is interpolated into the prompt, so it is attacker-controlled model input. Without a
server-side bound, `{"count":1,"avoid":["<300KB>"]}` makes input tokens unbounded and
attacker-chosen, which dwarfs the `count` output ceiling. The same vector injects instructions —
structured output constrains the response *shape*, not the *strings*.

```ts
const RequestSchema = z.object({
  count: z.number().int().min(1).max(20),
  avoid: z.array(z.string().min(1).max(40)).max(60).optional(),
});
```

Additionally: reject bodies over 8 KB before parsing; strip characters outside `[A-Za-z\s-]`
from each `avoid` entry; interpolate `avoid` as a JSON array inside a fenced block, not as prose.

### OpenAI call

| Setting | Value | Rationale |
|---|---|---|
| API | Responses API, `client.responses.parse()` + `zodTextFormat` | Current OpenAI recommendation over Chat Completions. Note `text.format`, **not** `response_format` |
| Model | `gpt-5.6-luna` | Cheapest current model with structured-output support. `gpt-4.1-nano` is cheaper but shuts down 2026-10-23 |
| `reasoning.effort` | `low` | GPT-5.6 defaults to `medium` if omitted |
| `max_output_tokens` | **25_000** | Reasoning tokens count against this. At 4000 the request can return `status: incomplete` with zero visible output — billed, nothing returned |
| `timeout` | 45_000 | SDK default is **10 minutes**. Sits inside the client's 60s abort (§8), so the function fails first and returns a typed error rather than the client dying blind |
| `maxRetries` | 1 | SDK default is 2 |
| `temperature` | **not set** | Rejected on reasoning models unless effort is `none` |

Variety therefore comes entirely from the prompt and the `avoid` list. `avoid` is load-bearing,
not bookkeeping.

### Response schema

Strict structured output constrains the schema: root must be an **object**, not a bare array;
no `.optional()` anywhere; `additionalProperties: false` is applied automatically.

```ts
const WordPairs = z.object({
  pairs: z.array(z.object({
    civilian: z.string().min(1).max(20),
    undercover: z.string().min(1).max(20),
  })).length(count),
}).refine(r => r.pairs.every(p =>
  p.civilian.toLowerCase() !== p.undercover.toLowerCase()));
```

The length cap keeps long words from breaking the `GameCard` layout. The refine rejects
identical pairs, which would make an unplayable round.

### Prompt

`functions/api/prompt.ts` — an exported constant. In git, diffable, testable.

- Role, Indonesian output only, no proper nouns or brand names.
- Core rule: pairs must be **close but distinguishable**. `Kopi`/`Teh` works. `Kopi`/`Meja` is
  useless — nobody can bluff with it.
- 4 good examples with a one-line reason each.
- 3 bad examples with the reason they fail: too far apart, too similar, proper noun.
- The `avoid` list as a fenced JSON array, labelled as already in use.

### Error mapping

| Cause | Response |
|---|---|
| Body too large, fails `RequestSchema` | 400 `invalid_request` |
| `RateLimitError`, `InternalServerError`, `APIConnectionError`, `APIUserAbortError` | 502 `upstream_error` |
| `response.status === 'incomplete'` | 502 `bad_response` |
| `output_parsed === null`, or fails the zod refine | 502 `bad_response` |
| `LengthFinishReasonError`, `ContentFilterFinishReasonError` | 502 `bad_response` |
| `BadRequestError` | 500 `server_error` — a 400 from OpenAI is our schema bug, not their outage |
| Anything else | 500 `server_error` |

`LengthFinishReasonError` and `ContentFilterFinishReasonError` are **not exported from the root
`openai` entry** — import from `openai/core/error`. These are exactly what the parse helpers
throw, so a mapping built on the root exports would miss them.

`message` is a fixed string per error code. Never derive it from `err.message`, and log the real
error with `console.error` only.

### Runtime config

`nodejs_compat` is **not** required. Verified: the SDK bundles for workerd at 107 KB gzipped with
zero `node:` builtins; OpenAI's own Cloudflare ecosystem test has the flag commented out.

A `wrangler.toml` containing only `compatibility_flags` is **silently ignored** by the Pages
build — the function then deploys without them and fails at request time, so the deploy looks
green. The file must be Pages-flavoured:

```toml
name = "undercover-game"
pages_build_output_dir = "./dist"
compatibility_date = "2026-08-02"
```

---

## 7. TypeScript, tests, local dev

`tsconfig.app.json` has `"include": ["src"]` and `npm run build` runs `tsc -b`, so **`functions/`
would never be typechecked**. Likewise `vitest.config.ts` has `include: ['src/**/*...']`, so a
function unit test would silently never run.

- `npx wrangler types --path='./functions/types.d.ts'`
- `functions/tsconfig.json` with `"types": ["./types.d.ts"]`
- `tsconfig.app.json` gains `"exclude": ["functions/**/*"]`
- a `tsconfig.functions.json` project reference so `tsc -b` covers it
- `vitest.config.ts` include widened to `['src/**/*.{test,spec}.*', 'functions/**/*.{test,spec}.*']`

**Local dev:** plain `vite dev` does not serve `/api/words`. Run Vite on 5173, then
`npx wrangler pages dev --proxy 5173`, and develop at `:8788` — this keeps HMR. Do not use the
`wrangler pages dev -- <command>` positional form; it is deprecated. A developer who opens :5173
out of habit gets a 404 from `/api/words`; note this in the README.

---

## 8. Client changes

`WordService.fetchNewWords(count)`:

- `fetch('/api/words')` — relative, no env var
- `AbortController`, 60s timeout (20 pairs on a reasoning model can take a while)
- send `avoid`: both halves of the 30 most recent pairs, capped at 60 strings
- zod-parse the response
- dedupe against storage on the **sorted lowercase tuple**, so reversed pairs are caught
- return the number actually added

`WordManagementModal`:

- render `error.message` from the typed shape
- report the added count: *"12 dari 20 sudah ada, 8 ditambahkan"*
- if **zero** were added, keep the modal open with an error. Today `handleFetchNewWords` calls
  `onWordsUpdated()` then `onClose()` unconditionally, and the `{success:false, reason:'no-words'}`
  return is discarded by both `useWordManagement.ts:85` and `App.tsx:78-81` — so an all-duplicate
  response closes the modal silently and leaves the user exactly where they started
- translate the copy to Indonesian ("All Words Used!", "Reuse Existing Words" are the only
  English strings in an otherwise Indonesian UI)

`public/_headers` — Pages sends no security headers by default. Traefik and the root `nginx.conf`
set HSTS, frameDeny, nosniff, Referrer-Policy and a CSP today. (Note: the Dockerfile actually
copies `docker/nginx.conf`, which has none of them, so the CSP was never deployed. This is a gap
to close, not a regression to preserve.)

---

## 9. Deferred: abuse control

`/api/words` ships public and unauthenticated. Same origin does not authenticate. This is an
accepted decision, recorded so it is not mistaken for an oversight.

Quantified, at 20 pairs on `gpt-5.6-luna`: ~750 input + ~600 output ≈ **$0.001/request**.

The real backstop is the **Workers Free plan's 100,000 requests/day**, account-wide — roughly
**$90/day / $2,700/month** of OpenAI exposure. Two consequences worth stating:

1. That cap is shared with the portfolio Pages project on the apex. A drain on the game takes
   the portfolio down too.
2. Nothing in this design detects abuse. The first signal is the invoice.

Available later, in increasing effort: a hard monthly budget cap plus a low email alert on a
project-scoped OpenAI key (no code, and it is the only control that bounds dollars); a WAF rate
limiting rule (free plan: 1 rule, path-only, IP-keyed, fixed 10s window and 10s block — stops a
naive `curl` loop, not rotating IPs); Turnstile.

---

## 10. Bug fixes

### 10.1 Win conditions

`useGameState.checkWinConditions` (`src/hooks/useGameState.ts:176`) is what the app calls.
`GameLogic.checkWinConditions` (`src/services/gameLogic.ts:77`) is a second, divergent
implementation that **the live app never calls** — its only callers are `win-conditions.test.ts`
and the dead `gameService.ts`.

They disagree. For 1 civilian + 1 Mr. White + 0 undercovers, the live one returns `null` because
line 193 requires `activeUndercovers.length > 0`. The game does not freeze — the two survivors
can keep voting — but it fails to end when it should.

**Fix:** infiltrators win at 1 civilian whether the survivor is undercover or Mr. White.
**Then reconcile the two implementations** — delete `GameLogic.checkWinConditions` or have
`useGameState` delegate to it — and point the tests at the reachable path. As written, adding
tests to `win-conditions.test.ts` would validate a function the UI never runs.

Scope note: 1 civilian + 1 undercover is **already tested and already passes**. Only the
Mr. White case is broken.

### 10.2 Mr. White wrong guess

Change the destination from `voting` to `description` (`src/hooks/useGamePhases.ts:164`) —
`description` matches `docs/GAME_RULE.md`; a re-vote adds no new information.

**Keep the `checkWinConditions()` call.** An earlier draft proposed deleting it as a stale-state
read. That was wrong: the elimination is committed in `handleEliminatePlayer`, then the user
confirms a modal and types a guess, so the closure is at least two renders later and already has
`isEliminated: true`. It is also the only win check on that path. Deleting it produces a wrong
winner — 2 civilians + 1 undercover + Mr. White, Mr. White eliminated in round 2 and guesses
wrong, survivors are 1 civilian + 1 undercover (undercover has won), but the app runs another
round and declares **civilians** the winner.

```ts
const winner = checkWinConditions();
if (!winner) {
  updateGameState({ mrWhiteGuess: '', phase: 'description', round: gameState.round + 1,
                    eliminatedPlayer: null, selectedPlayerToEliminate: null });
}
```

Same commit: `handleEliminationConfirm`'s non-Mr.-White branch (`useGamePhases.ts:135-140`) sets
**no phase at all** when there is no winner, leaving the player stranded on the voting screen
with only the header back arrow as an exit.

### 10.3 Round counter — requires a state split

`round` is a phase-flow sentinel, not a counter. `useGamePhases.ts:21` branches on `round === 1`
to show the name-input modal; lines 57 and 72 use `round > 1` to assign `cardIndex` and open the
turn modal; `App.tsx:141` hardsets `round: 2` with the comment *"Set round to 2 to skip name
input phase"*.

Making it a real counter without splitting the concern breaks "continue with same players" —
either the label is off by one forever, or the name-input modal reappears for every player and
the turn modal stops firing.

**Fix:** add `needsNameEntry: boolean` to `GameState`; use it at `useGamePhases.ts:21/57/72`;
`handleContinueWithSamePlayers` sets `{ round: 1, needsNameEntry: false }`.

Also required, and not a one-line change:

- `continueToNextRound` (`useGamePhases.ts:183`) exists but is **never called** by `App.tsx`. The
  increment has to be wired, not edited.
- `VotingPhase` has no `round` prop at all — it hardcodes `round={1}` at line 38. Needs a prop
  signature change plus a new argument at `App.tsx:318`.
- The increment fires **on re-entry to `description`**, not in `handleGoToVoting`. So a round
  number labels one full describe→vote cycle, and the voting screen shows the round the players
  are currently voting on rather than the next one.

### 10.4 Modal never renders at game-over

`WordManagementModal` is rendered only in the `setup` and `card-selection` branches, but
`handleContinueWithSamePlayers` opens it from `game-over` (`App.tsx:113`) when the pool is empty.
The flag flips, nothing renders, the button looks broken, and the modal then pops open
unexpectedly on the setup screen after the user escapes via "Back to Setup".

This is the **default end-of-session experience** once the pool runs dry. Fix: render
`<WordManagementModal>` once at the top level of `App`.

### 10.5 Remaining fixes

| Fix | Location |
|---|---|
| Stop mutating player objects — `[...players]` is shallow, `updatedPlayers[i].name = x` mutates the original | `useGamePhases.ts:26,41,55` |
| Delete `console.log(roles)` — prints the full role assignment to devtools | `gameLogic.ts:48` |
| Delete debug logs | `App.tsx:396-398`; `useGamePhases.ts:145,146,147,150` |
| `GameStatus.getLabel()` — both branches return the same string | `GameStatus.tsx:24` |
| Remove unused `getOrderedPlayers` (two copies) | `App.tsx:44`, `useGameState.ts:156` |
| vitest `environment: 'node'` → `'jsdom'` (jsdom already installed) | `vitest.config.ts` |
| `README.md:51` still documents `VITE_WORD_API_ENDPOINT` under Development, not the deployment section | `README.md` |
| "Reuse Existing Words" mid-setup calls `initializeGame`, which regenerates players with `name: ''` — **wiping every name already entered** | `useWordManagement.ts:35` |

### 10.6 Dead code

**4,148 lines** across 12 files, verified unreachable from `src/main.tsx` by import-graph BFS:

`AppWithServices.tsx` (493), `AppLegacy.tsx` (36), `containers/GameContainer.tsx` (223),
`components/GameUI.tsx` (381), `components/GameServiceExample.tsx` (473),
`hooks/useGameService.ts` (505), `services/gameService.ts` (368),
`services/gameStateManager.ts` (355), `services/gameActionService.ts` (498),
`services/types.ts` (428), `utils/gameHelpers.ts` (244), `types/containerTypes.ts` (144)

Docs describing the dead layer as current: `docs/SERVICE_LAYER_GUIDE.md`,
`docs/ARCHITECTURE_IMPROVEMENTS.md`, **and `src/services/README.md`** (287 lines).
`docs/CARD_ORDERING_IMPLEMENTATION.md` is mixed — accurate about the live `GameLogic` ordering
methods, stale about `AppWithServices`/`GameContainer`. Edit rather than delete.

`src/test/continue-with-same-players.test.ts` — **rewrite, do not delete.** It is on the delete
list because it imports the dead `GameActionService`, but only 1 of its 4 tests does; the other 3
are hand-copied reimplementations of live logic. More importantly it is the **only** coverage of
the continue-with-same-players flow, which §10.3 is about to change. Rewrite it against
`useGamePhases`/`App` before touching `round`.

---

## 11. Testing

Baseline: 22 pass, `word-service.test.ts` fails to load with `ReferenceError: window is not
defined`. Under jsdom it is **25 pass**, not 22 — the three hidden tests pass against the
*current* implementation, and all three assert the old contract (`VITE_WORD_API_ENDPOINT`, the
literal string `'API endpoint not configured'`). So the jsdom switch and the wordService rewrite
conflict: land them in the same commit with the test rewritten.

`src/test/ordering.vitest.ts` **never runs** — its filename does not match vitest's
`*.{test,spec}.*` glob. It is a *superset* of `ordering.test.ts` (13 tests vs 3), including the
"Mr. White is never first" rule and edge cases. **Rename it to `ordering.extra.test.ts` so it
runs**, then fold `ordering.test.ts`'s 3 tests into it if they are genuinely redundant. Keeping
the more thorough suite is the point; leaving it invisible is not an option.

New coverage:

- Win conditions on the **reachable** path: 1 civilian + 1 Mr. White (currently broken),
  1 civilian + both roles.
- Mr. White guess flow: correct → `game-over` with `winner: 'mrwhite'`; wrong → `description`
  **and** the win check still fires.
- Continue-with-same-players, before the `needsNameEntry` split.
- Function unit test with the OpenAI call mocked: request validation, `avoid` sanitization,
  error mapping, `incomplete` and `null` handling.

---

## 12. Sequencing

The only hard ordering constraint is that the Docker deletion comes last, after a Pages preview
is confirmed working. Everything else is convenience, but the dependencies are real.

1. **zod bump + lockfile regen.** Nothing else builds without it.
2. **Zero-dependency fixes** — debug logs, `GameStatus` label, unused functions, jsdom switch
   (with the `word-service.test.ts` tests updated or quarantined). All green.
3. **Win conditions** — §10.1, then §10.2 (which depends on 10.1's corrected condition), plus the
   `handleEliminationConfirm` routing fix. Reconcile the two implementations here.
4. **Rewrite `continue-with-same-players.test.ts`** against live code.
5. **`needsNameEntry` split + round counter + mutation fix** — §10.3 and the mutation fix touch
   the same lines of `useGamePhases.ts` and will conflict textually if split.
6. **Modal render fix** — §10.4.
7. **Dead-code deletion** — §10.6. Last of the fixes, so tests are not deleted before the
   behavior they cover is settled.
8. **Function + wordService rewrite**, including the `word-service.test.ts` rewrite. Deploy to a
   Pages **preview** URL and verify `/api/words` end to end.
9. **Attach `undercover.umeh.me`**, verify.
10. **Delete Docker / Traefik / nginx.**

---

## 13. Out of scope, flagged

`docker/dynamic_conf.yml` contains a committed basicAuth hash (`admin:$apr1$ruca84Hq$...`, with a
"change this!" comment). Deleting the file does not remove it from git history. Weak hash,
pointing at a host that no longer resolves, so low urgency — but it is there.

`umarsyariif.site` is unregistered and hardcoded in `docker-compose.yml:13`, `nginx.conf:3`,
`docs/DEPLOYMENT.md`, and `docker/dynamic_conf.yml`. Those files are all deleted by this work, but
the references remain in git history and anyone can register the domain.
