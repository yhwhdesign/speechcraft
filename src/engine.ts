/**
 * SpeechCraft engine.
 *
 * Two generation paths share one input shape:
 *
 *   buildDraft(input)  → deterministic draft, no API key needed. Assembles the
 *                        user's own memories into a real structure, so the
 *                        product works (and can be tested) before any account
 *                        is connected.
 *   buildPrompt(input) → the prompt used by /api/generate when an OpenAI key is
 *                        configured. Same structure, better prose.
 *
 * The deterministic path is deliberately not "fake AI": it is a template engine
 * that uses the speaker's material, and the UI labels it as a starting draft.
 */

export type Occasion = 'best-man' | 'maid-of-honor' | 'father' | 'vows' | 'eulogy' | 'toast'
export type Tone = 'funny' | 'heartfelt' | 'balanced'

export interface SpeechInput {
  occasion: Occasion
  speaker: string
  honoree: string
  partner: string
  relationship: string
  trait: string
  memories: string[]
  tone: Tone
  minutes: number
}

export interface Draft {
  openers: string[]
  sections: { label: string; text: string }[]
  close: string
  words: number
  seconds: number
}

export const OCCASIONS: { id: Occasion; label: string; blurb: string }[] = [
  { id: 'best-man', label: 'Best man', blurb: 'Funny, warm, a little dangerous' },
  { id: 'maid-of-honor', label: 'Maid of honor', blurb: 'Warm, funny, gets the room' },
  { id: 'father', label: 'Parent of the couple', blurb: 'Proud, steady, short' },
  { id: 'vows', label: 'Wedding vows', blurb: 'Promises, not a roast' },
  { id: 'toast', label: 'Toast or roast', blurb: 'Birthdays, retirements, going away' },
  { id: 'eulogy', label: 'Eulogy', blurb: 'Gentle, specific, no jokes' },
]

const OPENERS: Record<Occasion, ((i: SpeechInput) => string)[]> = {
  'best-man': [
    (i) =>
      `Good evening. For anyone who doesn't know me, I'm ${i.speaker} — ${i.honoree}'s ${i.relationship}. I've been told to keep this short, so let me say the important part first: ${i.honoree}, you are marrying up.`,
    (i) =>
      `I've known ${i.honoree} long enough to have seen ${i.trait}. And somehow, ${i.partner} looked at that and said yes.`,
    () =>
      `Being asked to be best man is a strange honour. You're essentially told: stand next to this person, hold the rings, and try not to say anything that follows them into the rest of their life.`,
  ],
  'maid-of-honor': [
    (i) =>
      `Hi everyone — I'm ${i.speaker}, and ${i.honoree} is my ${i.relationship}. I have known her long enough to remember exactly how she looked when she told me about ${i.partner}.`,
    (i) =>
      `${i.honoree} and I have been through a lot together, and the thing I keep coming back to is how she is always the calm one. Tonight, I'm the nervous one.`,
    () =>
      `Every maid of honour has a job: hold the bouquet, fix the dress, and tell the bride the truth. Two of those are easy. It's the toast that gets you.`,
  ],
  father: [
    (i) =>
      `When ${i.honoree} was small, I used to think about this day and very deliberately not think about it. Now it's here, and I find I have quite a lot to say.`,
    (i) =>
      `I'm ${i.speaker}, ${i.honoree}'s father. Twenty-five years ago my main job was making sure this child didn't eat sand. Tonight my job is to make a speech and hand her over looking calm.`,
    (i) =>
      `There's a moment every parent waits for, when you realise your kid has become someone you'd choose to know. I had that moment with ${i.honoree} — and then ${i.partner || 'the right person'} walked in.`,
  ],
  vows: [
    (i) =>
      `${i.honoree}, I've written this down because I know I'll forget the words the moment I look at you.`,
    (i) =>
      `I'm not going to promise you a perfect life, ${i.honoree}. I'm going to promise you a specific one.`,
    (i) =>
      `${i.honoree} — I didn't expect to be here, saying this, in front of everyone. And I can't imagine anywhere else I'd rather be.`,
  ],
  eulogy: [
    (i) =>
      `I'm ${i.speaker}, and ${i.honoree} was my ${i.relationship}. I want to tell you about the person I actually knew — not the summary.`,
    (i) =>
      `Most eulogies try to make the person sound like a saint. ${i.honoree} would have found that hilarious. So let me tell you the truth instead.`,
    (i) =>
      `There are people who fill a room and people who fill a life. ${i.honoree} did both, quietly, and almost never on purpose.`,
  ],
  toast: [
    (i) => `I'll keep this short, because ${i.honoree} has heard me be long before and it never ends well.`,
    (i) =>
      `We're here for ${i.honoree}, which means tonight is officially not about me, and I've been asked to pretend that's fine.`,
    (i) =>
      `There are two kinds of people: people who make a plan, and ${i.honoree}. I've spent years learning to be more like the second one.`,
  ],
}

/**
 * Make a user-typed memory safe to drop into a sentence: strip trailing
 * punctuation, then capitalise the first letter so it can open one.
 * Fragments still read acceptably, which is the point.
 */
function cap(text: string): string {
  const trimmed = text.trim().replace(/[.!?]+$/, '')
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function memoryOrFallback(memories: string[], index: number, fallback: string): string {
  const value = (memories[index] ?? '').trim()
  return value.length > 0 ? value : fallback
}

export function buildDraft(input: SpeechInput): Draft {
  const { occasion, honoree, partner, trait, memories, tone, minutes } = input

  const targetWords = Math.max(140, Math.round(minutes * 130))
  const funnyLine =
    tone === 'funny'
      ? ` I'd say I'm joking, but everyone in this room has met ${honoree}.`
      : ''
  const warmLine =
    tone === 'heartfelt'
      ? ` And the truth is, I don't say this enough out loud.`
      : ''

  const m1 = memoryOrFallback(
    memories,
    0,
    `the first time we properly spent time together, which somehow turned into years`,
  )
  const m2 = memoryOrFallback(
    memories,
    1,
    `how ${honoree} handles a bad day, which is to act like it's a minor administrative inconvenience`,
  )
  const m3 = memoryOrFallback(
    memories,
    2,
    `an ordinary afternoon that neither of us realised at the time would be the one we'd remember`,
  )

  const traitLine = trait.trim() || 'the most stubborn person I have ever loved'

  if (occasion === 'vows') {
    return finalise(
      [
        `I promise to keep noticing you — not just the big things, but the way you take your coffee, the sound you make when you're reading something good, the look you give me when I'm about to say something stupid.`,
        `I promise to be the person you can be tired around. That's the unglamorous part of love, ${honoree}, and it's the part I'm actually good at.`,
        `I promise to keep choosing you on the days it isn't automatic — because anyone can show up when it's easy.`,
        `And I promise to remember this: ${m3}. That's what I'm saying yes to. Not a perfect future. A specific one, with you in it.`,
      ].join('\n\n'),
      openersFor(input),
    )
  }

  if (occasion === 'eulogy') {
    const sections = [
      {
        label: 'Who they actually were',
        text: `${cap(traitLine)}. If you knew ${honoree}, you already know what I mean — and if you didn't, that's the thing I most wanted you to hear.`,
      },
      {
        label: `The memory I keep returning to`,
        text: `${cap(m1)}. I've told that story more times than anyone asked me to. I'm not going to stop telling it.`,
      },
      {
        label: 'What they would have made of this',
        text: `${honoree} would have been quietly uncomfortable with this much attention, and would have found a way to turn half of it into a joke by dinner.`,
      },
      {
        label: 'What we carry forward',
        text: `The part of ${honoree} that doesn't end is the part we repeat. In the way we answer the phone, in the recipes, in the jokes only our family understands.`,
      },
    ]
    return {
      openers: openersFor(input),
      sections,
      close: `${honoree} — thank you for the specific, ordinary life you gave us.`,
      ...measure(sections, `${honoree} — thank you for the specific, ordinary life you gave us.`),
    }
  }

  const sections: { label: string; text: string }[] = [      {
        label: 'How we got here',
        text: `${cap(m1)}. At the time it was just a normal day. Looking back, it's the day I started thinking of ${honoree} as permanent.${warmLine}`,
      },
      {
        label: `The thing about ${honoree}`,
        text: `${cap(traitLine)}. ${cap(m2)}. That's not a flaw, exactly. It's more of an operating system.${funnyLine}`,
      },
    {
      label: 'What I actually want to say',
      text: `${partner ? `${partner}, ` : ''}here's what you're getting. You're getting someone who will show up — not always on time, not always with the right words, but always. ${honoree} never once let me be the only person in the room who cared about something.`,
    },      {
        label: 'The one I keep coming back to',
        text: `${cap(m3)}. I don't need to explain why it matters. Everyone who knows ${honoree} is already smiling at something similar of their own.`,
      },
  ]

  // Word target: drop the second memory paragraph on very short speeches.
  const kept = targetWords < 220 ? [sections[0], sections[2], sections[3]] : sections
  const close = `So — to ${honoree}${partner ? ` and ${partner}` : ''}. Whatever comes next, you'll deserve it, and I'll be there to say I told you so.`

  return {
    openers: openersFor(input),
    sections: kept,
    close,
    ...measure(kept, close),
  }
}

function openersFor(input: SpeechInput): string[] {
  const pick = OPENERS[input.occasion]
  return pick.map((fn) => fn(input))
}

function measure(sections: { label: string; text: string }[], close: string) {
  const words = [...sections.map((s) => s.text), close]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
  return { words, seconds: Math.round((words / 130) * 60) }
}

function finalise(text: string, openers: string[]): Draft {
  const sections = [{ label: 'The promises', text }]
  const close = 'These are the ones I mean.'
  return { openers, sections, close, ...measure(sections, close) }
}

/** Human-readable duration for the UI ("2 min 14 sec"). */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} sec`
  return `${m} min ${s.toString().padStart(2, '0')} sec`
}

/**
 * Prompt for the optional LLM path. Rules that matter: never invent facts,
 * never exceed the time budget, match the requested tone, and write for the ear
 * (short sentences, no stage directions).
 */
export function buildPrompt(input: SpeechInput): { system: string; user: string } {
  const system = [
    'You write speeches people actually deliver out loud.',
    'Rules: use only the facts supplied; never invent names, events or details.',
    'Write for the ear: short sentences, contractions, no stage directions, no emoji.',
    'Match the requested tone exactly. For eulogies, never use jokes or clichés.',
    'Return exactly three labelled parts: OPENINGS (three one-sentence options),',
    'BODY (the speech, in paragraphs), CLOSE (one or two sentences).',
  ].join(' ')

  const targetWords = Math.round(input.minutes * 130)
  const user = [
    `Occasion: ${input.occasion}`,
    `Speaker: ${input.speaker}`,
    `Honoree: ${input.honoree}`,
    input.partner ? `Partner: ${input.partner}` : '',
    `Relationship: ${input.relationship}`,
    `One defining trait: ${input.trait}`,
    `Memories supplied: ${input.memories.filter(Boolean).join(' | ') || '(none)'}`,
    `Tone: ${input.tone}`,
    `Target length: ${targetWords} words (about ${input.minutes} minutes at speaking pace)`,
  ]
    .filter(Boolean)
    .join('\n')

  return { system, user }
}

export function draftToText(draft: Draft): string {
  const body = draft.sections.map((s) => `${s.label}\n${s.text}`).join('\n\n')
  return `${body}\n\n${draft.close}`
}
