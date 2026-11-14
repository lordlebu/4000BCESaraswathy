// Measure the actual generator and scene plan, including Dwarka as the scale reference.
const fs = require('node:fs');
const path = require('node:path');
async function measure() {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { fieldMap } = await vite.ssrLoadModule('/src/content/places.ts');
    const { buildFieldMap } = await vite.ssrLoadModule('/src/world/fieldMap.ts');
    const { planScene } = await vite.ssrLoadModule('/src/game/scenePlan.ts');
    const { districtAt } = await vite.ssrLoadModule('/src/world/twinCities.ts');
    return ['field_map_dwarka', 'field_map_lothal', 'field_map_twins'].map(id => {
      const built = buildFieldMap(fieldMap(id), { seed: 'twin-review' });
      const plan = planScene(built), world = built.world;
      const cities = world.twinRegion?.districts.map(d => ({
        name: d.name,
        tiles: world.tiles.flat().filter(t => t.biome === 'settlement' && districtAt(world.twinRegion, t)?.id === d.id).length,
        houses: plan.filter(p => p.sheet === 'twinHouses' && !p.name && districtAt(world.twinRegion, p)?.id === d.id).length
      }));
      return { id, width: world.width, height: world.height, centre: world.settlement,
        houseFrame: [80, 88], placements: plan.length, cities };
    });
  } finally { await vite.close(); }
}
module.exports = { measure };
if (require.main === module) measure().then(result => {
  const out = path.resolve(__dirname, '../docs/images/twins/metrics.json');
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}).catch(e => { console.error(e); process.exitCode = 1; });
