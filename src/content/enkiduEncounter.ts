import { TWIN_MAP } from '../world/twinGeneration';
import { ENKIDU_FOLLOWS, ENKIDU_ID, ENKIDU_JOINED, ENKIDU_MET, ENKIDU_STRANGER } from './enkidu';
import type { GameEvent } from './events';

export function enkiduEncounter(flags: readonly string[]): GameEvent {
  const met = flags.includes(ENKIDU_MET);
  const following = flags.includes(ENKIDU_FOLLOWS);
  const reunited = flags.includes(ENKIDU_JOINED);
  return {
    id: 'woven:enkidu',
    subjectId: ENKIDU_ID,
    title: 'Enkidu',
    occasion: 'road',
    once: false,
    art: reunited ? 'woven-enkidu-recruitment' : 'woven-enkidu-meeting',
    conditions: { shelter: [], fieldMaps: [TWIN_MAP], fromDay: 0, requires: [], pois: [], camps: [] },
    stranger: ENKIDU_STRANGER,
    prose: following ? 'Enkidu pats the dust off his goggles and looks back down the road.'
      : reunited ? 'Enkidu lifts his goggles when he sees you. He has been watching the boats come in.'
        : met ? 'Enkidu lifts his goggles and waves from beside the wagon.'
          : 'A pangolin in a pilot cap waves beside the western wagon. “Enkidu,” he says, adjusting his bronze goggles. “Have you walked far?”',
    choices: [
      following
        ? { id: 'dismiss', label: 'Part ways for now', line: 'Enkidu heads back to his spot at Southern Landing.', needs: [], grants: [], clears: [ENKIDU_FOLLOWS] }
        : { id: 'invite', outcomeArt: 'woven-enkidu-recruitment', label: 'Invite Enkidu to travel', line: 'Enkidu pulls his goggles down and falls into step.', needs: [], grants: [], sets: [ENKIDU_MET, ENKIDU_JOINED, ENKIDU_FOLLOWS] },
      { id: 'talk', label: following ? 'Talk about the road' : 'Talk with Enkidu', line: 'Enkidu tells you which boats he can recognise by their wake.', needs: [], grants: [], sets: [ENKIDU_MET] }
    ]
  };
}
