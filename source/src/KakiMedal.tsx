import React from 'react';
import { View } from 'react-native';
import { PotScene, SceneKey } from './KakiScenes';
import { BadgeKey } from './i18n-kitchen';

/*
 * Medals for the helper's badges and ranks. Each is a round gold frame, like the app's logo badge, with the Kitchen Kaki
 * pot doing something different inside it: wearing a graduation cap, a bamboo steamer or a crown, standing over flames.
 * A badge she hasn't earned yet is the same picture, faded, so she can see what to aim for.
 */

const GOLD = '#E0A21A';
const CREAM = '#FFF6DC';

/** Ring colour for each rank, from sage (starting out) up to gold (head cook). */
const RANK_RING = ['#9AA64B', '#C8A23A', '#E05A33', '#2F4030', GOLD];

function Medal({ size, ring, earned, scene }: { size: number; ring: string; earned: boolean; scene: SceneKey }) {
  const border = Math.max(3, Math.round(size * 0.08));
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: earned ? ring : '#D9D2BF', padding: border }}>
        <View style={{ flex: 1, borderRadius: size / 2, backgroundColor: earned ? CREAM : '#F1ECDD' }} />
      </View>
      <View style={{ position: 'absolute', left: 0, top: 0 }}>
        <PotScene scene={scene} size={size} muted={!earned} />
      </View>
    </View>
  );
}

/** One of the helper's badges. */
export function BadgeMedal({ kind, earned = true, size = 56 }: { kind: BadgeKey; earned?: boolean; size?: number }) {
  return <Medal size={size} ring={GOLD} earned={earned} scene={{ badge: kind }} />;
}

/** A kitchen rank: the ring changes colour with each step up, and the pot's props get grander. */
export function RankMedal({ index, size = 64 }: { index: number; size?: number }) {
  const i = Math.max(0, Math.min(RANK_RING.length - 1, index));
  return <Medal size={size} ring={RANK_RING[i]} earned scene={{ rank: i }} />;
}
