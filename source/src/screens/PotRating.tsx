import React from 'react';
import { View } from 'react-native';
import { predictedStars } from '../engine/planner';
import { useApp } from '../state';
import { AppState, Recipe } from '../types';
import { C, Icon, Text, pots } from '../ui';

/** What to show for a dish: the family's own rating, else a guess from the members' quizzes, else nothing yet. */
export function potView(r: Recipe, state: AppState): { n: number; kind: 'family' | 'guess' | 'none' } {
  const fam = state.ratings[r.id];
  if (fam) return { n: fam, kind: 'family' };
  const guesses = state.members.map((m) => predictedStars(r, m, state)).filter((x): x is number => x != null);
  if (guesses.length) return { n: Math.round(guesses.reduce((a, b) => a + b, 0) / guesses.length), kind: 'guess' };
  return { n: 0, kind: 'none' };
}

/** Five pots, filled for the rating, with words so it is clear what the number means. Used wherever a dish is being chosen. */
export function PotRating({ recipe, size = 16 }: { recipe: Recipe; size?: number }) {
  const { state } = useApp();
  const v = potView(recipe, state);
  const words = v.kind === 'family' ? `Family: ${pots(v.n)}` : v.kind === 'guess' ? `Likely ${pots(v.n)} (guess)` : 'Not rated yet';
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityLabel={v.kind === 'family' ? `Family rating: ${pots(v.n)}` : v.kind === 'guess' ? `Likely ${pots(v.n)}, a guess from the quiz` : 'Not rated yet'}>
      <View style={{ flexDirection: 'row', gap: 1, opacity: v.kind === 'guess' ? 0.7 : 1 }}>
        {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name={n <= v.n ? 'kaki-pot' : 'kaki-pot-off'} size={size} />)}
      </View>
      <Text style={{ color: v.kind === 'family' ? C.ink : C.muted, fontSize: 12, fontWeight: v.kind === 'family' ? '700' : '400', flexShrink: 1 }}>{words}</Text>
    </View>
  );
}
