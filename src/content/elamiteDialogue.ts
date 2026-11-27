import type { CampActivity, CampSlot } from './campLife';

interface ElamiteLine {
  text: string;
  slot?: CampSlot;
  activity?: CampActivity;
}

export const ELAMITE_DIALOGUE = {
  greeting: [
    { text: 'You came back. The edge of that mat is still dry.' },
    { text: 'I know your step now. Come round where you can see the fire.' },
    { text: 'We have a little shade left. Will you sit?' },
    { text: 'Hold there a moment. I want to hear what you saw on the road.' }
  ],
  homeland: [
    { text: 'At home we speak Elamite beside the fire. Harappan serves us well on this road.' },
    { text: 'When the western rain comes, the hills show every little fold.' },
    { text: 'I still count the length of a road by how many hills stand between me and home.' },
    { text: 'My aunt used to say that a house has two doors: the one you build, and the one a guest opens.' },
    { text: 'I learned your word for water before I learned how to say my own name here.' },
    { text: 'The first garden I knew was behind a wall that cast its shade the length of the house.' }
  ],
  textiles: [
    { text: 'Feel where this edge is folded. The wind cannot find a loose end there.' },
    { text: 'The blue threads are the fewest. That is why you see them first.' },
    { text: 'We roll the bedding against the weave. It comes out flat when you need it.' },
    { text: 'That reddish cloth has weathered three summers. It looked brighter when I was younger, too.' }
  ],
  craft: [
    { text: 'The seal shows whose bundle it was when it left. The knot tells you if it ever opened.' },
    { text: 'You burnish the jar while the clay will still take a mark, then leave it alone.' },
    { text: 'A thumbprint is enough to tell me who closed the clay. The pattern is for everybody else.' },
    { text: 'The pots with wide mouths are for the things we share. A narrow neck keeps the road out.' },
    { text: 'I keep a small weight wrapped in wool. The larger stones knock it out of true.', slot: 'watch' }
  ],
  animal: [
    { text: 'Give her space at the trough. Once she has had her fill, she comes over to see who is there.', slot: 'runner' },
    { text: 'The wool is thickest along her shoulders. I check the harness underneath it at every halt.', slot: 'runner' },
    { text: 'The first time I heard her sigh in her sleep, I thought the wagon had split.', slot: 'runner' },
    { text: 'She will wait for all three of us to be ready. Then she gives us a very long look.' },
    { text: 'She rests with her head toward the road. That way she can watch us load without standing up.' }
  ],
  westernRoad: [
    { text: 'Look for dry ripples in the sand. Where they fade to a smooth skin, the wheels go deep.' },
    { text: 'If the wind comes off the west at dusk, we tie the shade cloth twice.' },
    { text: 'We turn the wagon on wide ground, even if it means going on a bit farther.', slot: 'runner' },
    { text: 'On the way back I know the bends by the shadows they cast. Nothing looks quite the same.' },
    { text: 'The first person awake takes a few steps down the road. The dust tells us if it rained up ahead.', slot: 'leader' }
  ],
  camp: [
    { text: 'Set your feet outside the ropes. The peg beside you is the one I have still to drive.', activity: 'pitch' },
    { text: 'Leave your bowl by the hearth. There is enough for another ladle.', activity: 'meal' },
    { text: 'Those stones are holding heat from last night. I will coax the fire up before anyone asks.', activity: 'relight' },
    { text: 'We put the small jars inside the large ones before we lift them.', activity: 'strike' },
    { text: 'The loaded wagon faces out, and everybody leaves a passage between the hearth and the trough.' },
    { text: 'By the second evening everybody has found the spot where they like to sit.' }
  ],
  hutel: [
    { text: 'Hutel at Southern Landing keeps a place for a boat even after he has given up waiting for it.' },
    { text: 'When Hutel answers me in Harappan, he is being kind to the person standing between us.' },
    { text: 'If you see Hutel before we leave, tell him the west road was dry. He will ask about the low bend.' }
  ],
  parting: [
    { text: 'We roll the canopy first. The hearth stones stay where they are.' },
    { text: 'Come by before the last ropes go on. There is always time to say goodbye.' },
    { text: 'The wheels will be pointing west by the time the afternoon shade reaches the fire.', activity: 'strike' },
    { text: 'If you meet us again, come straight to the fire. We will know you.' }
  ]
} satisfies Record<string, readonly ElamiteLine[]>;
