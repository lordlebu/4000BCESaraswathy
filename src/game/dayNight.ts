// The passing of the day, as a colour wash over the map.
//
// This is the cheapest atmosphere in the game: no extra draw calls beyond one rectangle, no
// per-tile work, and it makes a five minute walk feel like it happened somewhere with weather and
// a sun. `docs/build-plan.md` asks for the cycle to be slow enough that a short session sees one
// gentle shift rather than a strobe, which is the whole design of the timings below.
//
// Deliberately free of Phaser so it can be tested under Node — the scene turns the result into a
// rectangle, and nothing here knows that. It is also the one place in the codebase allowed to care
// about wall-clock time: the determinism rule covers `world/` and `content/`, where a seed must
// always produce the same journey. What the sky looks like while you walk is presentation.

/**
 * One full day: an hour of real time.
 *
 * This started at eight minutes and the test caught it. A 5-10 minute session is the whole point
 * of the slice, and at eight minutes to the day such a session would run through first light,
 * morning, noon, afternoon, evening and night — six changes of light in one short walk, which is
 * the strobe `docs/build-plan.md` warns against rather than the single gentle shift it asks for.
 * At an hour, the same walk sees one change, maybe two.
 */
export const DAY_MS = 60 * 60 * 1000;

/**
 * How far a person covers on foot in a day, and how much ground a tile stands for.
 *
 * Thirty kilometres is a full day's walk with a load, rests and a night's sleep in it — the figure
 * a marching column or a pilgrim route is planned around, not the forty-odd a fit walker can manage
 * once.
 *
 * **The tile got smaller when the maps got bigger.** A kilometre to the tile was read off the
 * game's own prose: `landmarkHint` tells the player a landmark on the far side "will take most of
 * the day", and the map was 36 tiles across. Field maps are now 48 and 64, and the promise had
 * quietly become false — a full in-game day bought 23 steps of ordinary walking while the furthest
 * tile from any shelter measured 72. A traveller could be three days from a roof through no fault
 * of their own, which is not a hard choice, it is a trap.
 *
 * So a tile is now a little over a third of a kilometre and a day buys about eighty steps: more
 * than the 72 that measurement found, so **setting out at dawn always leaves you able to reach
 * shelter**. That is the promise the night system rests on, and it is why this number is derived
 * from the maps rather than picked.
 */
export const KM_PER_DAY = 30;
export const KM_PER_TILE = 0.375;

/**
 * How much of the day one tile costs, in the same milliseconds `phaseAt` takes.
 *
 * `cost` is `travelCost` from `data/biomes.json`: 1 on plains and coast, 2 through forest, wetland,
 * hills and desert, 3 in the mountains. So a day buys thirty tiles of open grassland or ten of
 * mountain, which is roughly the right shape — rough ground does not merely feel slower, it eats
 * the daylight.
 */
export function travelTimeMs(cost: number): number {
  return (DAY_MS * KM_PER_TILE * cost) / KM_PER_DAY;
}

export interface Sky {
  /** Overlay colour, drawn with normal alpha blending over the map. */
  colour: number;
  /** 0 is clear noon; higher is a heavier wash. */
  alpha: number;
  /** For the journal, and for anyone debugging the cycle. */
  label: string;
}

/** Phase 0 is six in the morning, so the cycle can be written in hours a person recognises. */
/**
 * A clock hour as a phase.
 *
 * **Phase 0 is 6 a.m., not midnight** -- the cycle is anchored to first light. Exported because
 * `fatigue.ts` needs to ask whether it is dark, and a second copy of this offset in another file
 * is two things that will disagree. The first version of `isNight` did exactly that, compared
 * against a bare `hour / 24`, and was false at every hour of the day.
 */
export const hoursToPhase = (hour: number): number => (((hour - 6) / 24 + 1) % 1 || 0);

/**
 * Keyframes around the day, written as clock times.
 *
 * They are pinned to real hours rather than laid out by eye because `phaseFromClock` starts a
 * journey at the player's own time of day — with a stylised layout, sitting down at midday opened
 * the map on late-afternoon amber, which is worse than not matching the clock at all.
 *
 * Noon is fully clear on purpose. A tint that never lifts reads as a broken colour profile rather
 * than as light, so the cycle has to pass through "no wash at all" for the rest of it to land.
 * Night holds from nine until nearly five: it is the longest stretch, as it should be.
 *
 * The alphas are deliberately gentle — roughly half what they started at. This wash lands on top of
 * the fog, which is already darkening remembered ground to 40% and unknown ground to 92%, so the
 * two compound. The fog does the darkening; the sky only has to suggest an hour. The test that
 * matters is whether the lit ring around the player stays readable at night, and at these values
 * it does: river, forest and hills are all still told apart.
 */
const KEYFRAMES: { at: number; sky: Sky }[] = [
  { at: hoursToPhase(6), sky: { colour: 0xffb08a, alpha: 0.13, label: 'first light' } },
  { at: hoursToPhase(8), sky: { colour: 0xfff6e0, alpha: 0.04, label: 'morning' } },
  { at: hoursToPhase(12), sky: { colour: 0xffffff, alpha: 0.0, label: 'noon' } },
  { at: hoursToPhase(16), sky: { colour: 0xffd9a0, alpha: 0.07, label: 'afternoon' } },
  { at: hoursToPhase(19), sky: { colour: 0xe08050, alpha: 0.17, label: 'evening' } },
  { at: hoursToPhase(21), sky: { colour: 0x2a3568, alpha: 0.3, label: 'night' } },
  { at: hoursToPhase(4.5), sky: { colour: 0x2a3568, alpha: 0.3, label: 'night' } },
  { at: 1.0, sky: { colour: 0xffb08a, alpha: 0.13, label: 'first light' } }
];

function mixChannel(from: number, to: number, shift: number, t: number): number {
  const a = (from >> shift) & 0xff;
  const b = (to >> shift) & 0xff;
  return Math.round(a + (b - a) * t) << shift;
}

function mix(from: Sky, to: Sky, t: number): Sky {
  return {
    colour: mixChannel(from.colour, to.colour, 16, t) | mixChannel(from.colour, to.colour, 8, t) | mixChannel(from.colour, to.colour, 0, t),
    alpha: from.alpha + (to.alpha - from.alpha) * t,
    // Names belong to the half of the transition they are nearer to, so the journal never says
    // "night" while the map is plainly still amber.
    label: t < 0.5 ? from.label : to.label
  };
}

/**
 * Where in the day a given number of elapsed milliseconds falls. Wraps.
 *
 * `startPhase` is where the journey begins. Left at zero, every session would open at first light
 * and — since a walk lasts ten minutes against an hour-long day — no player would ever see dusk or
 * night, which is most of what the cycle is for.
 */
export function phaseAt(elapsedMs: number, startPhase = 0): number {
  const raw = startPhase + elapsedMs / DAY_MS;
  return ((raw % 1) + 1) % 1;
}

/**
 * The phase matching the player's own clock, so the world opens at roughly the hour they are
 * actually in: start at dusk and the map is amber. It costs nothing and it is the sort of small
 * courtesy this game is made of.
 *
 * Only the starting point comes from the wall clock; the cycle then runs at its own pace. Nothing
 * in `world/` or `content/` can see this, so seeds stay deterministic.
 */
export function phaseFromClock(now = new Date()): number {
  const secondsIntoDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  // Shift so that phase 0 (first light) lands at about 6am rather than midnight.
  return (((secondsIntoDay / 86_400 - 0.25) % 1) + 1) % 1;
}

/**
 * Where a journey should open, honouring an `?hour=` override.
 *
 * Playtesting a day/night cycle is otherwise painful: whoever is testing sees only their own hour,
 * so an evening that looks wrong at nine at night cannot be checked at ten in the morning. Anything
 * unparseable or out of range falls back to the real clock, so a typo in the URL never leaves the
 * map stuck at midnight.
 */
export function startPhaseFor(hourParam: string | null, now = new Date()): number {
  if (hourParam === null || hourParam.trim() === '') return phaseFromClock(now);
  const hour = Number(hourParam);
  if (!Number.isFinite(hour) || hour < 0 || hour >= 24) return phaseFromClock(now);

  const whole = Math.floor(hour);
  const minutes = Math.round((hour - whole) * 60);
  const at = new Date(now);
  at.setHours(whole, minutes, 0, 0);
  return phaseFromClock(at);
}

/** The wash to draw over the map at this point in the day. */
export function skyAt(phase: number): Sky {
  const p = ((phase % 1) + 1) % 1;
  for (let i = 0; i < KEYFRAMES.length - 1; i += 1) {
    const from = KEYFRAMES[i]!;
    const to = KEYFRAMES[i + 1]!;
    if (p >= from.at && p <= to.at) {
      const span = to.at - from.at;
      return mix(from.sky, to.sky, span === 0 ? 0 : (p - from.at) / span);
    }
  }
  return KEYFRAMES[0]!.sky;
}
