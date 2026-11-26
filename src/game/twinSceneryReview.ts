import type {ReliefStyle} from './twinRelief';

export interface TwinSceneryReview {
  relief?: ReliefStyle;
  civic?: boolean;
  outlying?: boolean;
}

/** These treatments are previewed in development before owner selection. */
export function twinSceneryReview(search: string): TwinSceneryReview {
  const value = new URLSearchParams(search).get('twinScenery');
  switch (value) {
    case 'rounded': case 'terraces': case 'alpine': return {relief:value};
    case 'highlands': return {relief:'combined'};
    case 'civic': return {civic:true};
    case 'outlying': return {outlying:true};
    case 'all': return {relief:'combined',civic:true,outlying:true};
    default: return {};
  }
}
