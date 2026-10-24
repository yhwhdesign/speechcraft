# SpeechCraft

Write the speech you have to give — best man, maid of honour, parent of the couple, vows, a
toast, or a eulogy. Answer six questions, get three openings free, then the full draft with
cue cards and a read-aloud timer.

Everything runs in the browser. No account, no server, no API key.

---

## Status

**Working**

- Six occasions, guided intake (names, relationship, one defining trait, three memories, tone, length)
- Three free openings, paywalled body and close
- Printable cue cards, read-aloud timer, copy-to-clipboard
- Draft and answers persist through a refresh (localStorage)
- Mobile-first layout, no horizontal overflow at 390 px

**Not built yet**

- Real payments. The price buttons call a local unlock in test mode.
- The LLM pass. `buildPrompt()` in `src/engine.ts` is written and unused.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5177, plus a LAN URL for your phone
npm run build    # typecheck + static bundle in dist/
```

---

## How it works

```
index.html → src/main.tsx → App.tsx → engine.ts
                              └── base.css (layout, type, controls)
                              └── styles.css (palette, speech-specific styles)
```

`App.tsx` owns the three-step state machine (`start → details → draft`) and all persistence.
`engine.ts` is a pure module: input in, `Draft` out. No React, no DOM, no network.

### The engine

`buildDraft(input)` assembles the speech from the user's own material:

- **Openings** — three variants per occasion, each using the speaker's name, the honoree's
  name and the supplied trait.
- **Body** — four sections (how we got here / the thing about them / what I actually want to
  say / the one I keep coming back to). At a one-minute target the second memory section is
  dropped so the speech fits.
- **Close** — the toast.

User-typed memories go through `cap()`, which strips trailing punctuation and capitalises
the first letter, so a pasted sentence drops into the template without producing
`I remember We shared a bunk bed..`.

Read-aloud time is `words / 130` — a deliberately slow speaking pace, so the estimate is
generous rather than optimistic.

### Persistence

State hydrates from localStorage via lazy `useState` initialisers, not an effect. An effect
that restores after mount races the effect that saves on mount and wipes the draft — that
bug was found and fixed during verification.

Storage key: `speechcraft.v1`.

---

## Pricing

| Product | Price |
|---|---|
| One speech | $9.99 |
| Wedding party pack (up to 5 speakers) | $19.99 |

Both buttons currently call `onUnlock()`, which unlocks locally. To make it real: create
Stripe Payment Links, redirect back with a session id, and verify that session **server-side**
before unlocking. A `?paid=1` query flag is not an entitlement. See
[PROJECT.md](../PROJECT.md) in the workspace archive for the full launch checklist.

---

## Extending it

**Another occasion** — add an entry to `OCCASIONS` and a matching array in `OPENERS` inside
`src/engine.ts`. `buildDraft` handles the rest.

**Another tone** — extend the `Tone` union and the `funnyLine` / `warmLine` branches in
`buildDraft`.

**Real prose** — wire `buildPrompt()` to a server endpoint that holds the API key. Never call
a model directly from the browser with a key in the bundle.

---

## Honest limitations

- The template engine is competent, not surprising. The user's memories do the heavy lifting.
- Eulogies are written gently, but no template can know the person. The UI should keep
  encouraging edits.
- Nothing here is advice, and nothing is guaranteed to land in a room.

---

## Deploy

Cloudflare Pages, free and licensed for commercial use:

```bash
npm run build
npx wrangler pages deploy dist --project-name speechcraft
```

Vercel's Hobby tier is not licensed for commercial use — previews only, or pay for Pro.

---

## Branches

- `dev` — all work happens here
- `main` — production

---

## Verification

2026-10-23: build clean under strict TypeScript; full flow tested in the browser (form →
3 openers → paywall → unlock → 4 sections + close); draft restored after reload; 46 kB
gzipped shared bundle plus ~6 kB app code.
