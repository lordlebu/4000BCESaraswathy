import { effectiveCampKind, hospitalityFlag, type Encampment, type HospitalityKind } from './encampments';
import type { GameEvent } from './events';

const nights: Record<HospitalityKind, { title: string; welcome: string; morning: string }> = {
  drovers: {
    title: 'Among the sleeping herd',
    welcome: 'The watchkeeper folds a blanket beside the enclosure. “Sleep here. I’ll hear the goats if they stir.”',
    morning: 'The bells stirred before the light. Someone had kept the fire alive under the ash.'
  },
  pilgrims: {
    title: 'Beneath the prayer shelter',
    welcome: 'One of the pilgrims straightens a woven mat beneath the shelter. “Take this side. The little lamp can stay lit.”',
    morning: 'The lamp was out by dawn, and the pilgrims had already folded their mats.'
  },
  adventurers: {
    title: 'A place beside the packs',
    welcome: 'An adventurer moves a pack away from the embers. “There’s room beside mine. Just watch where you put your boots.”',
    morning: 'We woke among the packs while the fire was still warm enough to stir.'
  },
  dacoits: {
    title: 'An uneasy hospitality',
    welcome: 'The watchkeeper points to a mat inside the shelter. “You can stay. Leave the path to the bank clear for the watch.”',
    morning: 'We slept until morning. The person on watch nodded once as we folded the mat.'
  },
  elamite: {
    title: 'Beneath the western shelter',
    welcome: 'The wagon handler spreads a mat by the felt dome. “She’ll sleep once the fire burns low.” The woolly Croc lowers its head to the ground.',
    morning: 'The wagon was quiet in the early light. Someone had set a bowl of water beside the embers.'
  }
};

export function hospitalityOffer(camp: Encampment, fieldMapId: string): GameEvent {
  const kind = effectiveCampKind(camp);
  const night = nights[kind];
  return {
    id: `woven:camp-sleep:${camp.id}`,
    subjectId: camp.id,
    title: night.title,
    prose: night.welcome,
    occasion: 'night',
    art: `woven-camp-sleep-${kind}`,
    conditions: { shelter: ['camp'], fieldMaps: [fieldMapId], fromDay: 0, requires: [], pois: [], camps: [] },
    once: true,
    choices: [
      { id: 'stay', label: 'Stay the night', line: night.morning, needs: [], grants: [], sets: [hospitalityFlag(camp)] },
      { id: 'leave', label: 'Leave for now', line: '', needs: [], grants: [] }
    ]
  };
}

export function caravanWitnessEvent(camp: Encampment, moment: 'arrival' | 'departure', fieldMapId: string): GameEvent {
  const arriving = moment === 'arrival';
  return {
    id: `woven:elamite-${moment}:${camp.id}`,
    subjectId: camp.id,
    title: arriving ? 'A wagon from the west' : 'The wheels turn west',
    prose: arriving
      ? 'Two woolly humps appear above the scrub. The wagon handler lifts a hand as the caravan takes the bend.'
      : 'The last folded cloth goes aboard. The handler brings the Croc around, and the wheels follow their tracks west.',
    occasion: 'road',
    art: `woven-camp-elamite-${moment}`,
    conditions: { shelter: [], fieldMaps: [fieldMapId], fromDay: 0, requires: [], pois: [], camps: [] },
    once: true,
    choices: [{ id: 'watch', label: arriving ? 'Greet the caravan' : 'Wave farewell',
      line: arriving ? 'The handler waves from the wagon.' : 'The handler turns and waves from the wagon.', needs: [], grants: [] }]
  };
}
