import enkiduPortrait from '../../assets/twins/enkidu-portrait.webp?no-inline';
import type { EventStranger } from '../content/events';
import { art, artNames } from './art';

const caravanPortraits = import.meta.glob<string>('../../assets/twins/caravan/portraits/*.webp', {
  eager: true, query: '?no-inline&url', import: 'default'
});

const portraits = new Map([
  ...artNames('faces').map((id) => [id, art('faces', id)!] as const),
  ...Object.entries(caravanPortraits).map(([path, url]) => [path.split('/').at(-1)!.slice(0, -5), url] as const),
  ['enkidu', enkiduPortrait]
]);

export function paintedFaceFor(stranger: EventStranger): string {
  const { portraitId } = stranger.look;
  const portrait = portraits.get(portraitId);
  if (!portrait) throw new Error(`Missing assigned NPC portrait: ${portraitId}`);
  return portrait;
}

export interface StrangerFaceProps {
  stranger: EventStranger;
  size?: number;
  variant?: 'portrait' | 'action';
}

export function StrangerFace({ stranger, size = 40, variant = 'portrait' }: StrangerFaceProps) {
  const className = variant === 'action' ? 'tile-action-portrait' : 'person-portrait';
  return (
    <img
      className={`${className} is-painted stranger-face`}
      src={paintedFaceFor(stranger)}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
