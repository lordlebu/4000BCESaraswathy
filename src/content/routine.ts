// What a creature is doing when you find it.
//
// The cheapest way to multiply a map is to make the same ground read differently at a
// different hour, and until now it did not: `creatureAction` printed one sentence per species
// forever, so a marsh-lurker at dawn and a marsh-lurker in a midnight storm were the same
// paragraph. Weather and the day cycle both already exist; nothing was reading them.
//
// Free of React and Phaser like the rest of `content/`, and free of the clock too — it takes a
// `WorldMoment`, so the same function answers for the map, the journal and a test.
//
// **Where the rhythm comes from.** Canon does not say whether a species is nocturnal. It could
// — `activity: diurnal | nocturnal | crepuscular` on fauna would be the right field — but that
// is 256 entities to author, and inventing a claim per species here would be the engine
// writing canon. So the rhythm is derived from the species id: fixed per creature, the same in
// every journey and on every machine, and replaceable the day canon carries the field. A
// marsh-lurker is always nocturnal; which third of the species are is arbitrary but stable.

import { tileHash } from '../world/rng';
import type { Creature } from '../world/types';

export type Rhythm = 'diurnal' | 'nocturnal' | 'crepuscular';

/** What the animal is doing. `sheltering` and `resting` mean you find sign rather than the animal. */
export type Routine = 'feeding' | 'hunting' | 'calling' | 'resting' | 'sheltering';

/** When the day is quiet for each rhythm, and when it is busy. */
const AWAKE: Record<Rhythm, string[]> = {
  diurnal: ['morning', 'afternoon'],
  nocturnal: ['night'],
  crepuscular: ['dawn', 'evening']
};

/**
 * The species' own clock. Keyed on its id, not on the world seed: the same animal keeps the
 * same habits from one journey to the next, which is what makes it knowable.
 */
export function rhythmOf(creature: Creature): Rhythm {
  const order: Rhythm[] = ['diurnal', 'nocturnal', 'crepuscular'];
  return order[tileHash(creature.id, 0, 0, 'rhythm') % order.length]!;
}

/**
 * What it is doing, given the hour and the sky.
 *
 * Weather wins over the clock, because it does: a storm empties a marsh whatever the time.
 * Mist is the interesting one — it hides the animal and leaves the sound, so a creature that
 * would be feeding is heard calling instead.
 */
export function routineFor(
  creature: Creature,
  moment: { timeOfDay: string; weather: string } | null
): Routine {
  if (!moment) return 'feeding';
  const rhythm = rhythmOf(creature);
  const awake = AWAKE[rhythm].includes(moment.timeOfDay);

  if (moment.weather === 'storm') return 'sheltering';
  if (!awake) return moment.weather === 'rain' ? 'sheltering' : 'resting';
  if (moment.weather === 'mist') return 'calling';
  return rhythm === 'nocturnal' ? 'hunting' : 'feeding';
}

/** One line for the journal. Written for a reader, not assembled from fragments. */
export function describeRoutine(creature: Creature, routine: Routine): string {
  const name = creature.name.toLowerCase();
  switch (routine) {
    case 'feeding':
      return `The ${name} is feeding, and has not decided yet whether you matter.`;
    case 'hunting':
      return `The ${name} is working, and it is better at this hour than you are.`;
    case 'calling':
      return `You cannot see the ${name}. You can hear it, which in this mist is the whole of it.`;
    case 'resting':
      return `The ${name} is asleep somewhere close. The signs are fresh; the animal is not here.`;
    case 'sheltering':
      return `Nothing is out in this. The ${name} has gone wherever it goes, and left tracks filling with water.`;
  }
}

/**
 * Whether the animal itself is present, or only its sign.
 *
 * A sleeping or sheltering creature cannot be sketched. That is the point of the mechanic:
 * coming back at a better hour is how you get it, and being told so is not a punishment.
 */
export function isPresent(routine: Routine): boolean {
  return routine === 'feeding' || routine === 'hunting' || routine === 'calling';
}

/**
 * The whole line: what it is doing, and — when it is not here — which hour would be better.
 *
 * The hint has to travel with the description rather than with the sketch attempt. It lived on
 * the attempt first, which meant the only way to learn when to return was to press a button
 * that is disabled precisely when you need the answer.
 */
export function noteFor(
  creature: Creature,
  moment: { timeOfDay: string; weather: string } | null
): string {
  const routine = routineFor(creature, moment);
  const line = describeRoutine(creature, routine);
  return isPresent(routine) ? line : `${line} Try ${whenAwake(creature)}.`;
}

/** When to come back, for a UI that would rather give a reason than a refusal. */
export function whenAwake(creature: Creature): string {
  const times = AWAKE[rhythmOf(creature)];
  return times.length === 2 ? `${times[0]} or ${times[1]}` : times[0]!;
}
