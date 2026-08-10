// Turning a travel log into a file the player can keep.
//
// All the DOM and canvas work lives here so `content/travelLog.ts` stays pure and testable. Two
// formats, because they are for different things: the text file is for keeping and pasting, the
// image is for showing someone.

import type { TravelLog } from '../content/travelLog';

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking immediately can cancel the download in some browsers; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string): void {
  download(new Blob([text], { type: 'text/markdown;charset=utf-8' }), filename);
}

const PAGE = { width: 900, margin: 64, lineHeight: 30 };
const PAPER = '#fdf3da';
const INK = '#34263a';
const MUTED = '#6d5a68';
const RULE = 'rgba(52, 38, 58, 0.22)';

/** Greedy word wrap against the measured width of the current font. */
function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines;
}

type Block = { text: string; font: string; colour: string; gapBefore: number; rule?: boolean };

/** Flatten the log into a list of styled blocks, so height can be measured before drawing. */
function blocksFor(log: TravelLog): Block[] {
  const blocks: Block[] = [
    { text: log.title, font: 'bold 34px Georgia, serif', colour: INK, gapBefore: 0 },
    { text: log.subtitle, font: 'italic 19px Georgia, serif', colour: MUTED, gapBefore: 10 }
  ];
  for (const section of log.sections) {
    blocks.push({
      text: section.heading.toUpperCase(),
      font: 'bold 15px Georgia, serif',
      colour: MUTED,
      gapBefore: 34,
      rule: true
    });
    for (const line of section.lines) {
      blocks.push({ text: line, font: '20px Georgia, serif', colour: INK, gapBefore: 10 });
    }
  }
  blocks.push({
    text: `Walk it yourself — ${log.replayUrl}`,
    font: 'italic 17px Georgia, serif',
    colour: MUTED,
    gapBefore: 34,
    rule: true
  });
  return blocks;
}

/**
 * Render the log as a page of writing.
 *
 * Measured in one pass and drawn in a second, so the canvas is exactly as tall as the content
 * rather than a fixed size with the end of a long journey clipped off.
 */
export function renderJournalImage(log: TravelLog): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d')!;
  const usable = PAGE.width - PAGE.margin * 2;
  const blocks = blocksFor(log);

  let height = PAGE.margin;
  const laidOut = blocks.map((block) => {
    measure.font = block.font;
    const lines = wrap(measure, block.text, usable);
    height += block.gapBefore + lines.length * PAGE.lineHeight;
    return { block, lines };
  });
  height += PAGE.margin;

  canvas.width = PAGE.width;
  canvas.height = Math.round(height);

  const context = canvas.getContext('2d')!;
  context.fillStyle = PAPER;
  context.fillRect(0, 0, canvas.width, canvas.height);
  // A warm wash down the page so it reads as paper rather than a screenshot of a text file.
  const wash = context.createLinearGradient(0, 0, 0, canvas.height);
  wash.addColorStop(0, 'rgba(255, 233, 184, 0.55)');
  wash.addColorStop(1, 'rgba(184, 220, 232, 0.30)');
  context.fillStyle = wash;
  context.fillRect(0, 0, canvas.width, canvas.height);

  let y = PAGE.margin;
  context.textBaseline = 'top';
  for (const { block, lines } of laidOut) {
    y += block.gapBefore;
    if (block.rule) {
      context.strokeStyle = RULE;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(PAGE.margin, y - 12);
      context.lineTo(PAGE.width - PAGE.margin, y - 12);
      context.stroke();
    }
    context.font = block.font;
    context.fillStyle = block.colour;
    for (const line of lines) {
      context.fillText(line, PAGE.margin, y);
      y += PAGE.lineHeight;
    }
  }

  return canvas;
}

export async function downloadImage(log: TravelLog, filename: string): Promise<void> {
  const canvas = renderJournalImage(log);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) download(blob, filename);
}
