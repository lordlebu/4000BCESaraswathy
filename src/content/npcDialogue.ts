import { TWIN_MAP } from '../world/twinGeneration';
import type { BiomeId } from '../world/types';
import { tileHash } from '../world/rng';
import type { CampActivity, CampSlot } from './campLife';
import campLifeData from '../../data/camp-life.json';
import { ELAMITE_DIALOGUE } from './elamiteDialogue';
import type { CampKind } from './encampments';
import type { Standing } from './standing';
import type { StrangerCulture } from './travellers';

const LABELS = {
  greeting: 'Say hello',
  people: 'Ask about home',
  work: 'Ask about the work',
  ground: 'Ask about the land',
  camp: 'Ask about camp',
  homeland: 'Ask about their homeland',
  textiles: 'Ask about textiles',
  craft: 'Ask about pottery and seals',
  animal: 'Ask about the animal',
  westernRoad: 'Ask about the western road',
  hutel: 'Ask about Hutel',
  parting: 'Wish them well',
  news: 'Ask for local news'
};

type Topic = keyof typeof LABELS;
type LocalTopic = Exclude<Topic, 'news'>;

export interface AmbientTopic {
  id: Topic;
  label: string;
  line: string;
  historyKey: string;
  day: number;
}

type Context = { map?: string; occupation?: string; familiar?: boolean } & (
  | { road: true; culture: StrangerCulture | null; biome: BiomeId; standing: Standing; warm: boolean }
  | { road: false; kind: CampKind; slot: CampSlot; activity?: CampActivity; elamite?: boolean; cook?: boolean });

interface Line {
  id: string;
  topic: LocalTopic;
  text: string;
  fits?: (context: Context) => boolean;
  immediate?: boolean;
}

const familiar = (c: Context) => c.familiar !== false;
const warmRoad = (c: Context) => c.road && c.warm;
const culture = (id: StrangerCulture) => (c: Context) => c.road && c.culture === id;
const ground = (...biomes: BiomeId[]) => (c: Context) => c.road && biomes.includes(c.biome);
const camp = (kind: CampKind, slot: CampSlot) => (c: Context) => !c.road && c.kind === kind && c.slot === slot;
const doing = (...activities: CampActivity[]) => (c: Context) => !c.road && c.activity !== undefined && activities.includes(c.activity);

const regional = (map: string) => (c: Context) => c.map === map;
const work = (role: string) => (c: Context) => c.occupation?.toLowerCase().includes(role) === true;

const REGIONAL: readonly Line[] = [
  { id: 'lothal-tide', topic: 'ground', text: '“The tide leaves a dry crust on the flats. Follow the shell line back before it turns.”', fits: (c) => regional('field_map_lothal')(c) && ground('coast', 'wetland', 'river')(c) },
  { id: 'lothal-reeds', topic: 'work', text: '“Tie the reeds in short bundles here. A long one catches every mangrove branch on the path.”', fits: (c) => regional('field_map_lothal')(c) && work('carrier')(c) },
  { id: 'narmada-stone', topic: 'ground', text: '“On the plateau the bare stone stays warm after sunset. You can feel the change when you step off it.”', fits: regional('field_map_narmada') },
  { id: 'narmada-monsoon', topic: 'people', text: '“We know the rain is coming when the wind carries the smell of the plateau down to the river.”', fits: regional('field_map_narmada') },
  { id: 'dwarka-wheels', topic: 'work', text: '“Sand in the wheel finds a way past any cloth. I listen for the first squeak when we set off.”', fits: (c) => regional('field_map_dwarka')(c) && work('carrier')(c) },
  { id: 'dwarka-shore', topic: 'ground', text: '“The coast wind brings salt a long way inland. Look at the side of the stones that faces the sea.”', fits: regional('field_map_dwarka') },
  { id: 'aravali-heights', topic: 'ground', text: '“Cloud can cover the far end of the span before you’re halfway across. Wait for a gap and count the pillars.”', fits: regional('field_map_aravali') },
  { id: 'aravali-home', topic: 'people', text: '“At home the first one to see clear sky through the notch starts the fire for the rest of us.”', fits: regional('field_map_aravali') }
];

const ROAD: readonly Line[] = [
  { id: 'first-road-greeting', topic: 'greeting', text: '“Good road to you. Have you come far today?”', fits: (c) => c.familiar === false },
  { id: 'long-stride', topic: 'greeting', text: '“There you are. I thought I knew that stride.”', fits: familiar },
  { id: 'cool-morning', topic: 'greeting', text: '“I thought I might catch you before the road forks.”', fits: familiar },
  { id: 'name-ahead', topic: 'greeting', text: '“Your name got here before you did.”', fits: (c) => familiar(c) && c.road && c.warm && c.standing !== 'stranger' },
  { id: 'yard', topic: 'people', text: '“At home we judge the hour by which side of the yard is in shade. Out here I have to look up.”', fits: warmRoad },
  { id: 'courtyard', topic: 'people', text: '“Someone in our courtyard always keeps a jar by the door for whoever comes through.”', fits: culture('harappan') },
  { id: 'ridge-fires', topic: 'people', text: '“On a clear night at home, you can count the families along the ridge by their hearths.”', fits: culture('maru') },
  { id: 'reed-mat', topic: 'people', text: '“At home you offer a visitor a reed mat first. A name can wait until they’ve sat down.”', fits: culture('kia') },
  { id: 'load', topic: 'work', text: '“Put the heavy things against your back. Tie them with a knot you can undo one-handed.”', fits: culture('harappan') },
  { id: 'goats', topic: 'work', text: '“Count the goats when they lie down. Count them again when they stand up. That second count is the one I trust.”', fits: culture('maru') },
  { id: 'lamps', topic: 'work', text: '“An old wick is still worth saving. Twist it into a fresh one and the flame takes quicker.”', fits: culture('kia') },
  { id: 'exchange', topic: 'work', text: '“Twine or a little salt will get you a better welcome than a heavy thing nobody wants to carry.”' },
  { id: 'river-edge', topic: 'ground', text: '“Watch the reeds when the river rises. The current takes them first, and then it widens its bed.”', fits: ground('river', 'wetland', 'coast') },
  { id: 'dry-ridge', topic: 'ground', text: '“That ridge keeps the wind all day. I’d stop on the far side if I wanted to hear myself think.”', fits: ground('hills', 'mountains') },
  { id: 'trees', topic: 'ground', text: '“Under these trees, you feel the rain twice. Once in the open and again after you think it’s over.”', fits: ground('forest') },
  { id: 'roads', topic: 'ground', text: '“Between the two cities, I let the road take me round the wet ground. A dry boot saves more time than a shortcut.”', fits: regional(TWIN_MAP) },
  { id: 'dust', topic: 'ground', text: '“The dust stays in the ruts after the rain. Walk on the shoulder and you can see who passed before you.”', fits: ground('plains', 'desert', 'settlement', 'landmark') },
  { id: 'shade-ahead', topic: 'parting', text: '“May the next stretch have shade where you need it.”' },
  { id: 'see-you', topic: 'parting', text: '“I’ll know to look for you on this road now.”' }
];

const COOK: readonly Line[] = [
  { id: 'cave-cook-hearth', topic: 'camp', text: '“The hearth is here because the smoke leaves by the upper crack.”' },
  { id: 'cave-cook-meal', topic: 'camp', text: '“Bring a bowl over. Nobody has to earn a place beside the fire.”', fits: doing('meal'), immediate: true },
  { id: 'cave-cook-visits', topic: 'work', text: '“I cook here a little while, then take my pot to another household.”' },
  { id: 'cave-cook-water', topic: 'people', text: '“If you bring news of the water jars, I will listen while this warms.”' },
  { id: 'cave-cook-parting', topic: 'parting', text: '“Leave the threshold clear when you go. The evening walkers will need it.”' }
];

const CAMP: readonly Line[] = [
  ...Object.entries(campLifeData.kinds).flatMap(([kind, entry]) =>
    Object.entries(entry.says).map(([slot, text]): Line => ({
      id: `welcome-${kind}-${slot}`, topic: 'camp', text: `“${text}”`,
      fits: (c) => !c.road && c.kind === kind && c.slot === slot
    }))
  ),
  { id: 'first-light-fold', topic: 'work', text: '“I leave the bend in the thorn fence until last. No sense closing the gate with half the herd outside it.”', fits: camp('drovers', 'leader') },
  { id: 'fold-trade', topic: 'work', text: '“I take skins to the road. Salt comes back lighter and the goats will walk a long way for it.”', fits: camp('drovers', 'runner') },
  { id: 'fold-watch', topic: 'camp', text: '“The goats will tell me if something moves out there. I keep close enough to hear the first one stand up.”', fits: camp('drovers', 'watch') },
  { id: 'pilgrims-way', topic: 'camp', text: '“We hang the strips where the path turns. You can see one move in the wind long before you see the shelter.”', fits: camp('pilgrims', 'leader') },
  { id: 'pilgrims-oil', topic: 'work', text: '“I ask for oil when I go down to the road. The cloth we have here can always spare another wick.”', fits: camp('pilgrims', 'runner') },
  { id: 'pilgrims-light', topic: 'camp', text: '“I keep the cairn lamp low. It only has to light the last few steps.”', fits: camp('pilgrims', 'watch') },
  { id: 'survey', topic: 'work', text: '“We agree about where we slept. Ask us which bend in the river that was, and you’ll get three maps.”', fits: camp('adventurers', 'leader') },
  { id: 'venture-road', topic: 'work', text: '“I go down to the road to ask who’s come through. A wet hem often tells me more about a crossing than the directions do.”', fits: camp('adventurers', 'runner') },
  { id: 'venture-packs', topic: 'camp', text: '“I keep the packs where I can reach them in the dark. It saves waking the others when the weather turns.”', fits: camp('adventurers', 'watch') },
  { id: 'peg', topic: 'camp', text: '“Mind the loose corner there. I’m about to pull it taut.”', fits: doing('pitch'), immediate: true },
  { id: 'bowl', topic: 'camp', text: '“Keep your bowl near. The good bits settle, so I’ll stir it again before you take more.”', fits: doing('meal'), immediate: true },
  { id: 'coals', topic: 'camp', text: '“Give the coals a moment. There’s enough heat in them to start the fire again.”', fits: doing('relight'), immediate: true },
  { id: 'strike', topic: 'camp', text: '“I’ll get the last peg when the cloth is folded. It puts up a fight if you give the wind an edge to catch.”', fits: doing('strike'), immediate: true },
  { id: 'cool-coals', topic: 'camp', text: '“We leave the stones in a ring once the fire goes cold. It saves the next people looking for them.”' },
  { id: 'spare-seat', topic: 'greeting', text: '“You found your way back. Take the dry side of the fire.”' },
  { id: 'hearth', topic: 'people', text: '“Give people three nights around a fire and they’ll have a favourite place to sit, same as at home.”' },
  { id: 'light-left', topic: 'parting', text: '“Give us a wave at the turn. That’s the last place we can see you from here.”' },
  { id: 'next-fire', topic: 'parting', text: '“Travel easy. Say hello if you see our fire again.”' }
];

const ELAMITE_TOPICS = Object.keys(ELAMITE_DIALOGUE) as (keyof typeof ELAMITE_DIALOGUE)[];
const ELAMITE: readonly Line[] = ELAMITE_TOPICS.flatMap((topic) =>
  ELAMITE_DIALOGUE[topic].map((line, index) => ({
    id: `elamite-${topic}-${index}`, topic, text: `“${line.text}”`,
    immediate: 'activity' in line,
    fits: (context: Context) => !context.road &&
      (!('slot' in line) || context.slot === line.slot) &&
      (!('activity' in line) || context.activity === line.activity)
  }))
);

export function ambientTopics(
  speaker: string,
  context: Context,
  day: number,
  history: Readonly<Record<string, number>> = {},
  news?: { id: string; text: string }
): AmbientTopic[] {
  const key = (id: string) => `ambient:${speaker}:${id}`;
  const topic = (id: Topic, line: string, historyKey: string): AmbientTopic => ({
    id, label: LABELS[id], line, historyKey, day
  });
  const elamite = !context.road && context.elamite === true;
  const intro: LocalTopic = context.road ? 'greeting' : 'camp';
  const subjects: LocalTopic[] = context.road
    ? ['work', 'ground', 'people', 'parting']
    : elamite ? ELAMITE_TOPICS.filter((id) => id !== intro) : ['work', 'greeting', 'people', 'parting'];
  const rank = (id: string, at = 0) => tileHash(speaker, at, 0, id);
  subjects.sort((a, b) => rank(a, day) - rank(b, day));
  const local = [...(context.road ? ROAD : elamite ? ELAMITE : context.cook ? COOK : CAMP), ...REGIONAL]
    .filter((line) => !line.fits || line.fits(context));
  const options = news ? [topic('news', news.text, key(news.id))] : [];
  const age = (line: Line) => day - (history[key(line.id)] ?? -Infinity);
  for (const id of [intro, ...subjects]) {
    if (!context.road && !familiar(context) && id === 'greeting') continue;
    const choices = local.filter((line) => line.topic === id && (id === intro || age(line) === 0 || age(line) >= 3));
    choices.sort((a, b) =>
      Number(Boolean(b.immediate)) - Number(Boolean(a.immediate)) ||
      Number(age(b) === 0) - Number(age(a) === 0) ||
      Number(age(b) === Infinity) - Number(age(a) === Infinity) ||
      rank(a.id) - rank(b.id)
    );
    const line = choices[0];
    if (line) options.push(topic(id, line.text, key(line.id)));
    if (options.length === 3) break;
  }
  return options;
}
