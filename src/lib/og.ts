// Open Graph card generation. Satori lays out a small element tree, resvg
// turns the resulting SVG into a PNG, and the landscape contours are reused
// from the same build-time geometry the hero figure uses, so a shared link
// looks like the site.
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { buildLandscape } from './landscape/figure';

const W = 1200;
const H = 630;

const fontDir = path.join(process.cwd(), 'src/assets/og-fonts');
const font = (f: string) => fs.readFileSync(path.join(fontDir, f));

const fonts = [
  { name: 'Lato', data: font('lato-400.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'Lato', data: font('lato-700.woff'), weight: 700 as const, style: 'normal' as const },
  { name: 'Lato', data: font('lato-400-italic.woff'), weight: 400 as const, style: 'italic' as const },
  { name: 'Mono', data: font('commit-mono-400.woff'), weight: 400 as const, style: 'normal' as const },
];

const PAPER = '#fbfaf6';
const INK = '#1b1a17';
const INK3 = '#66635b';
const BLUE = '#1772d0';
const ORANGE = '#f09228';

/** The landscape, scaled into a band across the foot of the card. */
function landscapeStrip(): string {
  const f = buildLandscape();
  const { w, h } = f.view;
  const paths = f.contours
    .map(
      (c) =>
        `<path d="${c.d}" fill="none" stroke="${BLUE}" stroke-opacity="${c.index ? 0.5 : 0.22}" stroke-width="${c.index ? 1.4 : 0.9}"/>`,
    )
    .join('');
  const traj = f.trajectory
    .map((s) => `<path d="${s.d}" fill="none" stroke="${ORANGE}" stroke-opacity="${s.opacity * 0.9}" stroke-width="2.4" stroke-linejoin="round"/>`)
    .join('');
  const marks = [...f.minima, ...f.saddles]
    .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${INK}" opacity="0.5"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${W}" height="${Math.round((W * h) / w)}">${paths}<path d="${f.mep}" fill="none" stroke="${INK3}" stroke-width="1.6" stroke-dasharray="2 6"/>${traj}${marks}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export interface OgInput {
  /** small mono label above the title, e.g. "research" or "note" */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** mono chips along the foot, e.g. venue and status */
  chips?: string[];
  name: string;
  site: string;
}

export async function renderOg(input: OgInput): Promise<Buffer> {
  const strip = landscapeStrip();
  const titleSize = input.title.length > 74 ? 48 : input.title.length > 46 ? 58 : 68;

  const tree = {
    type: 'div',
    props: {
      style: {
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: PAPER,
        fontFamily: 'Lato',
        position: 'relative',
      },
      children: [
        // the landscape, bled across the lower half and faded back
        {
          type: 'img',
          props: {
            src: strip,
            width: 860,
            height: Math.round((860 * 542) / 600),
            // anchored off the lower-right corner, so the deepest basin and the
            // path through it sit under the chips rather than under the title
            style: { position: 'absolute', left: 560, top: 96, opacity: 0.55 },
          },
        },
        // a wash so the type stays readable over it
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(100deg, ${PAPER} 42%, rgba(251,250,246,0.9) 60%, rgba(251,250,246,0.25) 100%)`,
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              padding: '58px 68px',
              position: 'relative',
            },
            children: [
              input.eyebrow && {
                type: 'div',
                props: {
                  style: { fontFamily: 'Mono', fontSize: 23, color: INK3, marginBottom: 20, letterSpacing: '0.01em' },
                  children: input.eyebrow,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: titleSize,
                    lineHeight: 1.14,
                    color: INK,
                    letterSpacing: '-0.018em',
                    maxWidth: 900,
                    display: 'flex',
                  },
                  children: input.title,
                },
              },
              input.subtitle && {
                type: 'div',
                props: {
                  style: {
                    fontSize: 27,
                    lineHeight: 1.42,
                    color: INK3,
                    marginTop: 24,
                    maxWidth: 760,
                    display: 'flex',
                  },
                  children: input.subtitle,
                },
              },
              { type: 'div', props: { style: { flexGrow: 1 } } },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: 16 },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { fontSize: 27, fontWeight: 700, color: INK },
                        children: input.name,
                      },
                    },
                    {
                      type: 'div',
                      props: { style: { fontFamily: 'Mono', fontSize: 22, color: INK3 }, children: input.site },
                    },
                    { type: 'div', props: { style: { flexGrow: 1 } } },
                    ...(input.chips ?? []).map((c) => ({
                      type: 'div',
                      props: {
                        style: {
                          fontFamily: 'Mono',
                          fontSize: 20,
                          color: INK3,
                          border: `1px solid #cdc8b9`,
                          borderRadius: 4,
                          padding: '6px 12px',
                        },
                        children: c,
                      },
                    })),
                  ],
                },
              },
            ].filter(Boolean),
          },
        },
      ],
    },
  };

  const svg = await satori(tree as never, { width: W, height: H, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng());
}
