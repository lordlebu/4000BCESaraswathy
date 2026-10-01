// The first morning: one quiet line at a time, each gone once it is done.
//
// **Why.** Nothing taught a verb. Walking, talking, cutting, making -- a first-time player was left
// to find each one, and the first play-through found settling not at all. The genre's answer is to
// teach one verb at a time, the first time it is needed, and then never again (A Short Hike, Stardew's
// first morning, Spiritfarer's prologue). So this is a ladder of five steps after the opening, each
// a sentence in the dock, each done the moment the save says so -- not when a button is pressed.
//
// **Why reed rope and not Uma's mat.** Her mat needs a loom frame and a tool that can work: a flint
// knife, an adze, a frame, then the mat. That is a long way from the first minute. So the morning
// ends at a knife, and the mat is pinned as what comes next -- the dock carries it from there.
//
// No arrows, no locks: the player can walk off on the first frame and the line simply waits. Pure,
// and free of React and Phaser; the hints preference turns it off.

export interface CoachFacts {
  /** Whether the traveller has stepped off the tile they started on. */
  moved: boolean;
  knows: (recipeId: string) => boolean;
  made: (recipeId: string) => boolean;
  carried: (id: string) => number;
}

export interface CoachStep {
  id: string;
  line: string;
  done: (f: CoachFacts) => boolean;
}

export const COACH: readonly CoachStep[] = [
  { id: 'walk', line: 'Walk with WASD or the arrow keys, or tap the ground.', done: (f) => f.moved },
  { id: 'uma', line: 'Someone is weaving a mat at the kilns. Go and talk to her.', done: (f) => f.knows('recipe_reed_mat') },
  {
    id: 'reeds',
    line: "Reeds grow at the water's edge. Cut four.",
    done: (f) => f.carried('material_reed_fibre') >= 4 || f.made('recipe_reed_rope')
  },
  { id: 'rope', line: 'Open the workshop and twist the reeds into rope.', done: (f) => f.made('recipe_reed_rope') },
  { id: 'knife', line: 'Flint lies on the hills and the plains. Knap two into a knife.', done: (f) => f.made('recipe_flint_knife') }
];

/** What the first morning has to recommend now, or null once all of it is done. */
export function coachLine(facts: CoachFacts): CoachStep | null {
  return COACH.find((step) => !step.done(facts)) ?? null;
}

/** What is pinned when the morning is done: Uma's mat, the thing the knife was for. */
export const MORNING_GOAL = 'recipe_reed_mat';
