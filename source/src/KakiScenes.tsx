import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { BadgeKey } from './i18n-kitchen';

/*
 * The Kitchen Kaki pot doing different things. Every badge, rank and thank-you sticker is the same pot
 * (the logo artwork) with its own props drawn around it in the same thick-outline cartoon style:
 * a graduation cap, a bamboo steamer, flames, a trophy, a crown, a bunch of balloons.
 * Props are drawn on a 100 x 100 grid; the pot sits in the middle of it.
 */

const POT = require('../assets/logo-pot.png');
const POT_RATIO = 661 / 767;

const OL = '#3A2E22'; // the pot's outline brown
const GOLD = '#E0A21A';
const HONEY = '#F5B93A';
const TOM = '#E05A33';
const SAGE = '#9AA64B';
const LEAF = '#6E7A3A';
const BASIL = '#2F4030';
const CREAM = '#FFF6DC';
const WOOD = '#C98A52';
const STEEL = '#B9BDB5';
const PINK = '#F59A86';

type P = { x: number; y: number; s?: number };

const Heart = ({ x, y, s = 1, fill = TOM }: P & { fill?: string }) => (
  <Path transform={`translate(${x} ${y}) scale(${s})`} d="M0 3 C-9 -4 -7 -11 -2 -11 C0 -11 0 -9 0 -8 C0 -9 0 -11 2 -11 C7 -11 9 -4 0 3Z"
    fill={fill} stroke={OL} strokeWidth={1.6 / s} strokeLinejoin="round" />
);
const Spark = ({ x, y, s = 1, fill = '#FFFFFF' }: P & { fill?: string }) => (
  <Path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8Z"
    fill={fill} stroke={OL} strokeWidth={1.2 / s} strokeLinejoin="round" />
);
const Flower = ({ x, y, s = 1, fill = PINK }: P & { fill?: string }) => (
  <G transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, 72, 144, 216, 288].map((a) => (
      <Circle key={a} cx={4.2 * Math.cos((a * Math.PI) / 180)} cy={4.2 * Math.sin((a * Math.PI) / 180)} r={3.4} fill={fill} stroke={OL} strokeWidth={1.2} />
    ))}
    <Circle r={2.6} fill={HONEY} stroke={OL} strokeWidth={1.2} />
  </G>
);
const Trophy = ({ x, y, s = 1 }: P) => (
  <G transform={`translate(${x} ${y}) scale(${s})`}>
    <Path d="M-9 -8 Q-16 -8 -14 -1 Q-12 3 -8 3" fill="none" stroke={OL} strokeWidth={4} strokeLinecap="round" />
    <Path d="M-9 -8 Q-16 -8 -14 -1 Q-12 3 -8 3" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M9 -8 Q16 -8 14 -1 Q12 3 8 3" fill="none" stroke={OL} strokeWidth={4} strokeLinecap="round" />
    <Path d="M9 -8 Q16 -8 14 -1 Q12 3 8 3" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M-10 -11 H10 V-3 Q10 8 0 8 Q-10 8 -10 -3Z" fill={GOLD} stroke={OL} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M-5 -8 V-2" stroke="#FFE9A8" strokeWidth={2} strokeLinecap="round" />
    <Rect x={-2} y={8} width={4} height={5} fill={GOLD} stroke={OL} strokeWidth={1.5} />
    <Rect x={-7} y={13} width={14} height={4} rx={1.5} fill={GOLD} stroke={OL} strokeWidth={1.5} />
  </G>
);
const Spoon = ({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) => (
  <G transform={`translate(${x} ${y}) rotate(${rot})`}>
    <Line x1={0} y1={6} x2={0} y2={30} stroke={OL} strokeWidth={6.4} strokeLinecap="round" />
    <Line x1={0} y1={6} x2={0} y2={30} stroke={WOOD} strokeWidth={3.4} strokeLinecap="round" />
    <Ellipse cx={0} cy={-2} rx={6.4} ry={8.4} fill={WOOD} stroke={OL} strokeWidth={1.8} />
    <Ellipse cx={0} cy={-2} rx={3.6} ry={5.4} fill="#D9A06B" />
  </G>
);
const Whisk = ({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) => (
  <G transform={`translate(${x} ${y}) rotate(${rot})`}>
    <Line x1={0} y1={8} x2={0} y2={30} stroke={OL} strokeWidth={6.4} strokeLinecap="round" />
    <Line x1={0} y1={8} x2={0} y2={30} stroke="#D9743E" strokeWidth={3.4} strokeLinecap="round" />
    <Ellipse cx={0} cy={-3} rx={7.5} ry={11} fill="none" stroke={OL} strokeWidth={3} />
    <Ellipse cx={0} cy={-3} rx={7.5} ry={11} fill="none" stroke={STEEL} strokeWidth={1.3} />
    <Ellipse cx={0} cy={-3} rx={3.4} ry={11} fill="none" stroke={OL} strokeWidth={3} />
    <Ellipse cx={0} cy={-3} rx={3.4} ry={11} fill="none" stroke={STEEL} strokeWidth={1.3} />
  </G>
);
const Flame = ({ x, y, s = 1 }: P) => (
  <G transform={`translate(${x} ${y}) scale(${s})`}>
    <Path d="M0 8 C-10 8 -11 -2 -4 -11 C-3 -5 0 -4 0 -4 C0 -10 3 -15 6 -19 C11 -10 13 -4 10 2 C9 6 5 8 0 8Z" fill={TOM} stroke={OL} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M0 8 C-5 8 -5 2 -1 -2 C0 1 1 2 2 1 C4 4 5 8 0 8Z" fill={HONEY} />
  </G>
);

type Scene = { back?: React.ReactNode; front?: React.ReactNode };

const BADGE_SCENES: Record<BadgeKey, Scene> = {
  // a graduation cap on the chef's hat, and an open book
  firstLesson: {
    front: (
      <G>
        <Path d="M22 24 V33 Q34 40 46 33 V24" fill={BASIL} stroke={OL} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M8 22 L34 12 L60 22 L34 32 Z" fill={BASIL} stroke={OL} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M34 22 L54 24 V36" fill="none" stroke={GOLD} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={54} cy={38} r={2.8} fill={GOLD} stroke={OL} strokeWidth={1.4} />
        <Path d="M60 78 Q69 73 75 78 V92 Q69 87 60 92Z" fill="#FFFFFF" stroke={OL} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M75 78 Q81 73 90 78 V92 Q81 87 75 92Z" fill="#FFFFFF" stroke={OL} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M64 81 Q69 79 72 81 M64 85 Q69 83 72 85 M78 81 Q82 79 86 81 M78 85 Q82 83 86 85" stroke={TOM} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      </G>
    ),
  },
  // steam curling up and a ladle
  soups: {
    front: (
      <G>
        {[54, 64, 74].map((x, i) => (
          <G key={x}>
            <Path d={`M${x} ${20 - i} q-5 -4 0 -8 t0 -8`} fill="none" stroke={OL} strokeWidth={4.6} strokeLinecap="round" />
            <Path d={`M${x} ${20 - i} q-5 -4 0 -8 t0 -8`} fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />
          </G>
        ))}
        <Line x1={92} y1={52} x2={78} y2={76} stroke={OL} strokeWidth={5.6} strokeLinecap="round" />
        <Line x1={92} y1={52} x2={78} y2={76} stroke={STEEL} strokeWidth={2.8} strokeLinecap="round" />
        <Ellipse cx={74} cy={81} rx={7.5} ry={5.5} fill={STEEL} stroke={OL} strokeWidth={1.8} />
        <Ellipse cx={74} cy={80} rx={4.6} ry={2.8} fill={HONEY} />
      </G>
    ),
  },
  // a bamboo steamer worn as a hat
  slow: {
    front: (
      <G transform="translate(56 22)">
        <Path d="M-22 4 H22 V15 H-22Z" fill="#E3C28A" stroke={OL} strokeWidth={1.9} strokeLinejoin="round" />
        {[-15, -7.5, 0, 7.5, 15].map((x) => <Line key={x} x1={x} y1={4} x2={x} y2={15} stroke="#B8914F" strokeWidth={1.3} />)}
        <Path d="M-20 -6 H20 V4 H-20Z" fill="#EBCF9D" stroke={OL} strokeWidth={1.9} strokeLinejoin="round" />
        {[-13, -6.5, 0, 6.5, 13].map((x) => <Line key={x} x1={x} y1={-6} x2={x} y2={4} stroke="#B8914F" strokeWidth={1.3} />)}
        <Path d="M-22 -6 Q0 -26 22 -6 Z" fill="#E3C28A" stroke={OL} strokeWidth={1.9} strokeLinejoin="round" />
        <Circle cx={0} cy={-17} r={2.8} fill="#B8914F" stroke={OL} strokeWidth={1.4} />
      </G>
    ),
  },
  // flames under the pot, and a chilli
  wok: {
    back: (
      <G>
        <Flame x={28} y={91} s={0.95} />
        <Flame x={72} y={91} s={0.95} />
        <Flame x={50} y={92} s={1.15} />
      </G>
    ),
    front: (
      <G>
        <Path d="M74 12 Q92 10 92 30 Q82 22 74 20Z" fill="#D8432A" stroke={OL} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M74 12 Q70 8 66 10" fill="none" stroke={LEAF} strokeWidth={3} strokeLinecap="round" />
        <Spark x={90} y={56} s={0.7} fill={HONEY} />
      </G>
    ),
  },
  // a trophy, with a heart and sparkles
  favourite: {
    front: (
      <G>
        <Trophy x={80} y={76} s={0.9} />
        <Heart x={86} y={16} s={0.9} />
        <Spark x={62} y={12} s={0.8} fill={HONEY} />
        <Spark x={10} y={58} s={0.7} fill="#FFFFFF" />
      </G>
    ),
  },
  // a compass and a dotted trail
  explorer: {
    front: (
      <G>
        <Path d="M6 90 Q22 78 14 62 Q8 52 18 46" fill="none" stroke={WOOD} strokeWidth={2} strokeDasharray="1 5" strokeLinecap="round" />
        <Circle cx={80} cy={78} r={12} fill={CREAM} stroke={OL} strokeWidth={2} />
        <Circle cx={80} cy={78} r={8.4} fill="none" stroke={GOLD} strokeWidth={1.4} />
        <Path d="M80 78 L87 69 L83 80Z" fill={TOM} stroke={OL} strokeWidth={1.2} strokeLinejoin="round" />
        <Path d="M80 78 L73 87 L77 76Z" fill={BASIL} stroke={OL} strokeWidth={1.2} strokeLinejoin="round" />
        <Circle cx={80} cy={78} r={1.6} fill={OL} />
        <Spark x={92} y={58} s={0.6} fill="#FFFFFF" />
      </G>
    ),
  },
  // a calendar with a tick
  steady: {
    front: (
      <G>
        <Rect x={66} y={64} width={26} height={26} rx={4} fill="#FFFFFF" stroke={OL} strokeWidth={2} />
        <Path d="M66 68 a4 4 0 0 1 4 -4 H88 a4 4 0 0 1 4 4 V73 H66Z" fill={TOM} stroke={OL} strokeWidth={2} strokeLinejoin="round" />
        <Line x1={73} y1={61} x2={73} y2={67} stroke={OL} strokeWidth={2.6} strokeLinecap="round" />
        <Line x1={85} y1={61} x2={85} y2={67} stroke={OL} strokeWidth={2.6} strokeLinecap="round" />
        <Path d="M72 81 L77 86 L87 77" fill="none" stroke={BASIL} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        <Spark x={92} y={50} s={0.6} fill={HONEY} />
      </G>
    ),
  },
  // a little globe
  cuisines: {
    front: (
      <G>
        <Circle cx={80} cy={77} r={13} fill="#DDEBD6" stroke={OL} strokeWidth={2} />
        <Path d="M71 72 q5 -6 10 -2 q3 5 -2 8 q-7 2 -8 -6Z" fill={SAGE} stroke={OL} strokeWidth={1.2} strokeLinejoin="round" />
        <Path d="M82 82 q5 -2 8 2 q-3 5 -8 3Z" fill={SAGE} stroke={OL} strokeWidth={1.2} strokeLinejoin="round" />
        <Path d="M80 64 Q89 77 80 90" fill="none" stroke={OL} strokeWidth={1} opacity={0.5} />
        <Spark x={91} y={56} s={0.6} fill="#FFFFFF" />
        <Spark x={66} y={60} s={0.5} fill={HONEY} />
      </G>
    ),
  },
  // thanks: hearts and a flower
  thanked: {
    front: (
      <G>
        <Heart x={78} y={22} s={1.1} />
        <Heart x={91} y={38} s={0.7} fill={PINK} />
        <Heart x={64} y={11} s={0.65} fill={PINK} />
        <Path d="M80 94 Q80 86 80 80" stroke={OL} strokeWidth={4} fill="none" strokeLinecap="round" />
        <Path d="M80 94 Q80 86 80 80" stroke={LEAF} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Flower x={80} y={76} s={1.05} />
      </G>
    ),
  },
};

/** The rank scenes: a spoon, then spoon and whisk, a whisk with a sparkle, a rosette, and a crown with laurels. */
const RANK_SCENES: Scene[] = [
  { front: <G><Spoon x={80} y={64} rot={-30} /></G> },
  { front: <G><Spoon x={84} y={64} rot={-28} /><Whisk x={14} y={66} rot={26} /></G> },
  { front: <G><Whisk x={80} y={62} rot={-28} /><Spark x={90} y={28} s={0.9} fill={HONEY} /><Spark x={12} y={62} s={0.7} /></G> },
  {
    front: (
      <G>
        <Path d="M72 82 L66 98 L74 94 L78 98 L80 84Z" fill={LEAF} stroke={OL} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M82 84 L86 98 L92 92 L96 94 L90 80Z" fill={SAGE} stroke={OL} strokeWidth={1.6} strokeLinejoin="round" />
        <Circle cx={82} cy={76} r={11} fill={GOLD} stroke={OL} strokeWidth={2} />
        <Circle cx={82} cy={76} r={6.6} fill={HONEY} stroke="#B8791B" strokeWidth={1.2} />
        <Spark x={90} y={52} s={0.7} />
      </G>
    ),
  },
  {
    back: (
      <G>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (Math.PI * (0.62 + i * 0.1));
          const lx = 50 - 40 * Math.cos(a - 0.1), ly = 52 + 40 * Math.sin(a - 0.1);
          const rx = 50 + 40 * Math.cos(a - 0.1);
          return (
            <G key={i}>
              <Ellipse cx={lx} cy={ly} rx={5} ry={2.4} transform={`rotate(${-30 + i * 22} ${lx} ${ly})`} fill={SAGE} stroke={OL} strokeWidth={1.2} />
              <Ellipse cx={rx} cy={ly} rx={5} ry={2.4} transform={`rotate(${30 - i * 22} ${rx} ${ly})`} fill={SAGE} stroke={OL} strokeWidth={1.2} />
            </G>
          );
        })}
      </G>
    ),
    front: (
      <G>
        <Path d="M30 26 L33 8 L42 17 L50 5 L58 17 L67 8 L70 26 Z" fill={GOLD} stroke={OL} strokeWidth={2} strokeLinejoin="round" />
        <Rect x={30} y={24} width={40} height={5} rx={2} fill={HONEY} stroke={OL} strokeWidth={1.6} />
        <Circle cx={50} cy={17} r={2.4} fill={TOM} stroke={OL} strokeWidth={1.2} />
        <Circle cx={37} cy={20} r={1.8} fill={TOM} stroke={OL} strokeWidth={1} />
        <Circle cx={63} cy={20} r={1.8} fill={TOM} stroke={OL} strokeWidth={1} />
        <Spark x={84} y={30} s={0.7} fill={HONEY} />
      </G>
    ),
  },
];

/** Thank-you stickers: the pot celebrating, one picked at random. */
export const STICKERS = ['hearts', 'sparkle', 'flowers', 'trophy', 'party', 'thumbs', 'sun', 'rainbow', 'balloons', 'star'] as const;
export type StickerKey = (typeof STICKERS)[number];

const STICKER_SCENES: Record<StickerKey, Scene> = {
  hearts: { front: <G><Heart x={78} y={20} s={1.2} /><Heart x={90} y={38} s={0.75} fill={PINK} /><Heart x={20} y={14} s={0.8} /><Heart x={8} y={34} s={0.55} fill={PINK} /></G> },
  sparkle: { front: <G><Spark x={80} y={18} s={1.3} fill={HONEY} /><Spark x={14} y={22} s={1} /><Spark x={92} y={52} s={0.8} /><Spark x={8} y={56} s={0.7} fill={HONEY} /><Spark x={86} y={86} s={0.8} /><Spark x={16} y={88} s={0.9} /></G> },
  flowers: {
    front: (
      <G>
        <Path d="M76 94 L80 70 M84 94 L88 72 M80 94 L72 74" stroke={OL} strokeWidth={4.4} strokeLinecap="round" fill="none" />
        <Path d="M76 94 L80 70 M84 94 L88 72 M80 94 L72 74" stroke={LEAF} strokeWidth={2} strokeLinecap="round" fill="none" />
        <Flower x={80} y={66} s={1.05} fill={PINK} />
        <Flower x={90} y={69} s={0.9} fill={HONEY} />
        <Flower x={71} y={71} s={0.9} fill="#FFFFFF" />
        <Path d="M72 92 Q82 100 92 92 L90 84 Q82 88 74 84Z" fill={TOM} stroke={OL} strokeWidth={1.8} strokeLinejoin="round" />
      </G>
    ),
  },
  trophy: { front: <G><Trophy x={80} y={74} s={1.05} /><Spark x={62} y={12} s={0.9} fill={HONEY} /><Spark x={92} y={42} s={0.7} /><Spark x={12} y={50} s={0.7} /></G> },
  party: {
    front: (
      <G>
        <Path d="M20 30 L30 2 L42 30Z" fill={TOM} stroke={OL} strokeWidth={2} strokeLinejoin="round" />
        <Path d="M23 22 L38 22 M26 14 L35 14" stroke={HONEY} strokeWidth={2.4} strokeLinecap="round" />
        <Circle cx={30} cy={2} r={3} fill={HONEY} stroke={OL} strokeWidth={1.4} />
        {[[72, 14, TOM], [88, 24, HONEY], [64, 30, SAGE], [92, 46, TOM], [10, 50, SAGE], [14, 74, HONEY], [86, 80, SAGE], [76, 92, TOM]].map(([x, y, c], i) => (
          <Rect key={i} x={x as number} y={y as number} width={5} height={3} rx={1} fill={c as string} transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
        <Path d="M60 8 q4 8 -2 14 M92 60 q-6 4 -4 12" stroke={PINK} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      </G>
    ),
  },
  thumbs: {
    front: (
      <G>
        <Rect x={64} y={73} width={11} height={19} rx={3} fill={TOM} stroke={OL} strokeWidth={2} />
        <Path d="M75 76 H84 Q92 76 92 82 Q92 88 86 88 H88 Q92 88 91 92 Q90 95 86 95 H75Z M76 76 L80 66 Q81 59 86 61 Q89 64 86 72 L84 76"
          fill={CREAM} stroke={OL} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Spark x={88} y={54} s={0.7} fill={HONEY} />
        <Spark x={12} y={20} s={0.8} />
      </G>
    ),
  },
  sun: {
    back: (
      <G>
        <Circle cx={50} cy={52} r={36} fill="#FFE9A8" opacity={0.7} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <Line key={i} x1={50 + 38 * Math.cos(a)} y1={52 + 38 * Math.sin(a)} x2={50 + 47 * Math.cos(a)} y2={52 + 47 * Math.sin(a)} stroke={HONEY} strokeWidth={3.4} strokeLinecap="round" />;
        })}
      </G>
    ),
  },
  rainbow: {
    back: (
      <G>
        {[[40, TOM], [34, HONEY], [28, SAGE]].map(([r, c]) => (
          <Path key={c as string} d={`M${50 - (r as number)} 62 A${r} ${r} 0 0 1 ${50 + (r as number)} 62`} fill="none" stroke={c as string} strokeWidth={6} />
        ))}
        <Ellipse cx={14} cy={64} rx={9} ry={5} fill="#FFFFFF" stroke={OL} strokeWidth={1.6} />
        <Ellipse cx={86} cy={64} rx={9} ry={5} fill="#FFFFFF" stroke={OL} strokeWidth={1.6} />
      </G>
    ),
  },
  balloons: {
    front: (
      <G>
        <Path d="M72 26 L82 60 M86 22 L84 60 M94 36 L86 60" stroke={OL} strokeWidth={1.4} fill="none" />
        <Ellipse cx={72} cy={20} rx={7.5} ry={9.5} fill={TOM} stroke={OL} strokeWidth={1.8} />
        <Ellipse cx={87} cy={15} rx={7.5} ry={9.5} fill={HONEY} stroke={OL} strokeWidth={1.8} />
        <Ellipse cx={95} cy={31} rx={6.5} ry={8.5} fill={SAGE} stroke={OL} strokeWidth={1.8} />
        <Path d="M70 17 q-2 3 0 6 M85 12 q-2 3 0 6" stroke="#FFFFFF" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </G>
    ),
  },
  star: {
    front: (
      <G>
        <Path d="M80 6 L85 18 L98 19 L88 28 L91 41 L80 34 L69 41 L72 28 L62 19 L75 18Z" fill={HONEY} stroke={OL} strokeWidth={2} strokeLinejoin="round" />
        <Spark x={12} y={22} s={0.9} />
        <Spark x={92} y={64} s={0.7} fill={HONEY} />
        <Spark x={10} y={80} s={0.6} />
      </G>
    ),
  },
};

export type SceneKey = { badge: BadgeKey } | { rank: number } | { sticker: StickerKey };

function sceneFor(k: SceneKey): Scene {
  if ('badge' in k) return BADGE_SCENES[k.badge];
  if ('rank' in k) return RANK_SCENES[Math.max(0, Math.min(RANK_SCENES.length - 1, k.rank))];
  return STICKER_SCENES[k.sticker];
}

/** The pot with its props. Fills a `size` x `size` square; props may spill a little past the pot. */
export function PotScene({ scene, size, muted }: { scene: SceneKey; size: number; muted?: boolean }) {
  const sc = sceneFor(scene);
  const w = size * 0.66;
  const layer = (n: React.ReactNode) => (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">{n}</Svg>
  );
  return (
    <View style={{ width: size, height: size, opacity: muted ? 0.32 : 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {sc.back ? layer(sc.back) : null}
      <Image source={POT} resizeMode="contain" style={{ position: 'absolute', left: (size - w) / 2, top: size * 0.5 - (w * POT_RATIO) / 2 + size * 0.02, width: w, height: w * POT_RATIO }} />
      {sc.front ? layer(sc.front) : null}
    </View>
  );
}

/** A random sticker, different from `not` when possible. */
export function randomSticker(not?: string): StickerKey {
  const pool = STICKERS.filter((s) => s !== not);
  return pool[Math.floor(Math.random() * pool.length)];
}

export const isSticker = (s?: string): s is StickerKey => !!s && (STICKERS as readonly string[]).includes(s);

/** A thank-you sticker: the pot celebrating on a white, die-cut disc, turned a little like a real sticker. */
export function KakiSticker({ id, size = 84, tilt = -6 }: { id: StickerKey; size?: number; tilt?: number }) {
  return (
    <View accessibilityLabel="A sticker of Kitchen Kaki" style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: '#E8DFC8', transform: [{ rotate: `${tilt}deg` }],
      shadowColor: '#2F4030', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2,
    }}>
      <PotScene scene={{ sticker: id }} size={size * 0.9} />
    </View>
  );
}
