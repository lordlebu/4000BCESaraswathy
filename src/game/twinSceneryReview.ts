import type {ReliefStyle} from './twinRelief';

export interface TwinSceneryReview {
  relief?: ReliefStyle;
  civic?: boolean;
  outlying?: boolean;
  landmarks?: boolean;
}

export const TWIN_SCENERY = {relief:'combined',civic:true,outlying:true,landmarks:true} as const;

/** Development comparisons can isolate a treatment or show the original scenery. */
export function twinSceneryReview(search: string): TwinSceneryReview {
  const value = new URLSearchParams(search).get('twinScenery');
  switch (value) {
    case 'rounded': case 'terraces': case 'alpine': return {relief:value};
    case 'highlands': return {relief:'combined'};
    case 'civic': return {civic:true};
    case 'outlying': return {outlying:true};
    case 'original': return {};
    default: return TWIN_SCENERY;
  }
}
