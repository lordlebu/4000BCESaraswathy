import { readFileSync, readdirSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const artNames = folder => new Set(readdirSync(new URL(`../src/ui/${folder}/`, import.meta.url))
  .filter(file => /\.(png|svg|webp|jpe?g)$/i.test(file))
  .map(file => file.replace(/(?:\.\d+)?\.[^.]+$/, '')));
const events = artNames('events');
const places = artNames('places');
const has = (names, id) => names.has(id) || names.has(`${id}-painted`);
const { points_of_interest: points } = read('../data/canon/places.json');
const { discoveries } = read('../data/canon/knowledge.json');
const byId = new Map(points.map(point => [point.id, point]));
const fallback = point => point && has(places, point.id) ? 'parent-place'
  : point && has(places, `kind-${point.kind}`) ? 'place-kind' : 'text-only';
const rows = points.flatMap(point => (point.sub_locations ?? []).map(sub => ({
  kind: 'sub-location', id: `${point.id}-${sub.id}`, place: point.id,
  prose: sub.arrival ? 'authored' : 'transition',
  art: has(events, `${point.id}-${sub.id}`) ? 'dedicated' : fallback(point)
})));
for (const discovery of discoveries) {
  const locations = new Set(discovery.found_at ?? []);
  for (const point of points) if (point.discoveries?.includes(discovery.id)) locations.add(point.id);
  for (const place of locations) rows.push({
    kind: 'discovery', id: discovery.id, place,
    prose: `${discovery.levels.filter(level => level.prompt).length}/${discovery.levels.length} authored prompts`,
    art: has(events, discovery.id) ? 'dedicated' : fallback(byId.get(place))
  });
}
console.log(JSON.stringify(rows, null, 2));
