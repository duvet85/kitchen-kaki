import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image, Pressable, Text as RNText, ScrollView, StyleSheet, TextProps, TextStyle, View, ViewStyle, useWindowDimensions,
} from 'react-native';

/*
 * Visual identity (Kitchen Kaki brand): Vibrant Tomato, Sage Green, Honey Gold, Oat & Cream and Dark Basil.
 * Dark Basil carries primary actions and text, because white on Sage Green is too faint to read.
 * Everything is rounded: pill buttons, soft cards, friendly Nunito type.
 */
export const C = {
  bg: '#F7F2E4', // Oat & Cream
  card: '#FFFFFF',
  ink: '#2F4030', // Dark Basil
  muted: '#5E6B54',
  faint: '#66705B',
  line: '#E8DFC8',
  brand: '#2F4030', // Dark Basil: primary buttons, hero cards
  brandDeep: '#1F2D22',
  brandSoft: '#E4E8CF', // pale sage
  accent: '#E05A33', // Vibrant Tomato, used for "new"
  accentSoft: '#FDE3D8',
  chilli: '#C94A25', // deeper tomato: white text on it passes contrast
  chilliSoft: '#FDE4D9',
  saffron: '#F5B93A', // Honey Gold
  saffronSoft: '#FDF0CC',
  gold: '#E0A21A',
  sage: '#9AA64B', // Sage Green, for fills and decoration (not for small text)
  green: '#6E7A3A', // darker sage that is readable as text
  greenSoft: '#E9EDCF',
  red: '#B3261E',
  redSoft: '#FBE4E1',
  amber: '#9A5B00',
  amberSoft: '#FFEBC2',
};

/** Shared roundness, so every screen feels like the same soft, friendly app. */
export const R = { card: 22, pill: 28, chip: 22, field: 18 };

/** Nunito is the brand's rounded typeface. */
export const F = {
  display: 'Nunito_800ExtraBold',
  displayX: 'Nunito_900Black',
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semi: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  xbold: 'Nunito_800ExtraBold',
};

const familyFor = (w?: TextStyle['fontWeight']) => {
  const n = Number(w === 'bold' ? 700 : w === 'normal' || !w ? 400 : w);
  return n >= 800 ? F.xbold : n >= 700 ? F.bold : n >= 600 ? F.semi : n >= 500 ? F.medium : F.regular;
};

/** Text that maps fontWeight onto the loaded font files (custom fonts ignore fontWeight on Android). */
export function Text({ style, ...rest }: TextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const { fontWeight, ...other } = flat;
  return <RNText {...rest} style={[{ color: C.ink, fontSize: 14 }, other, { fontFamily: flat.fontFamily ?? familyFor(fontWeight) }]} />;
}

/** 'kaki-pot' is the Kitchen Kaki pot (ratings use pots, not stars); 'kaki-pot-off' is the faded, empty one. */
export type IconName = keyof typeof Ionicons.glyphMap | 'kaki-pot' | 'kaki-pot-off';
const POT_IMG = require('../assets/logo-pot.png');
export const Icon = ({ name, size = 18, color = C.ink }: { name: IconName; size?: number; color?: string }) => (
  name === 'kaki-pot' || name === 'kaki-pot-off'
    ? <Image source={POT_IMG} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no"
        style={{ width: size * 1.2, height: size * 1.2 * (661 / 767), opacity: name === 'kaki-pot-off' ? 0.4 : 1 }} />
    : <Ionicons name={name} size={size} color={color} />
);

/** "1 pot", "4 pots": how a rating reads in a sentence. */
export const pots = (n: number) => `${n} pot${n === 1 ? '' : 's'}`;

/** Tablet = the shorter screen side is at least 600 (iPad, Android tablets), or a wide window. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600 || width >= 900;
  const landscape = width > height;
  /** phone on its side: little height, so navigation moves to a side rail */
  const short = landscape && height < 500;
  const rail = isTablet || (landscape && width >= 640);
  const railWidth = rail ? (short ? 84 : 104) : 0;
  const contentWidth = Math.min(width - railWidth, 1160) - (isTablet ? 64 : 32);
  return { isTablet, width, height, landscape, short, rail, railWidth, cols: (min: number) => Math.max(1, Math.floor((contentWidth + 16) / (min + 16))) };
}

/** Lays children out in equal columns; one column on phones. */
export function Grid({ cols, gap = 16, children }: { cols: number; gap?: number; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (cols <= 1) return <>{items}</>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2, alignItems: 'flex-start' }}>
      {items.map((child, i) => (
        <View key={i} style={{ width: `${100 / cols}%`, paddingHorizontal: gap / 2 }}>{child}</View>
      ))}
    </View>
  );
}

/** The Kitchen Kaki pot (the design's artwork), used for friendly empty states and success moments. */
export function Mascot({ size = 96 }: { size?: number }) {
  return <Image source={require('../assets/logo-pot.png')} style={{ width: size, height: size * (661 / 767) }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

/** A warm, friendly "nothing here yet" card with the pot. */
export function EmptyState({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={[s.card, { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 22, backgroundColor: C.brandSoft, overflow: 'hidden', gap: 8 }]}>
      <Mascot size={110} />
      {title ? <Text style={{ fontFamily: F.display, fontSize: 18, color: C.ink, textAlign: 'center' }}>{title}</Text> : null}
      <Text style={{ color: C.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 420 }}>{children}</Text>
    </View>
  );
}

export function Screen({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: string; children: React.ReactNode }) {
  const { isTablet } = useLayout();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingHorizontal: isTablet ? 32 : 16, paddingTop: isTablet ? 28 : 12, paddingBottom: 110 }}>
      <View style={{ width: '100%', maxWidth: 1160, alignSelf: 'center' }}>
        {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text style={[s.h1, isTablet && { fontSize: 40 }]}>{title}</Text>
        {subtitle ? <Text style={[s.sub, isTablet && { fontSize: 16, maxWidth: 640 }]}>{subtitle}</Text> : null}
        {children}
      </View>
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  // a card with its own fill (hero cards) gets no contrasting outline
  const own = style?.backgroundColor;
  return <View style={[s.card, own ? { borderColor: own } : null, style]}>{children}</View>;
}

export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}

export function P({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.p, style]}>{children}</Text>;
}

export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.label, style]}>{children}</Text>;
}

export function Button({
  label, onPress, kind = 'primary', small, disabled, icon,
}: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'quiet'; small?: boolean; disabled?: boolean; icon?: IconName }) {
  const palette = {
    primary: [C.brand, '#F7F2E4'],
    ghost: [C.brandSoft, C.brandDeep],
    danger: [C.redSoft, C.red],
    quiet: ['transparent', C.brand],
  } as const;
  const [bg, fg] = palette[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        small && { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18 },
      ]}
    >
      {icon && <Icon name={icon} size={small ? 15 : 18} color={fg} />}
      <Text style={{ color: fg, fontWeight: '800', fontSize: small ? 13 : 16 }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [s.iconBtn, pressed && { backgroundColor: C.line }]}>
      <Icon name={icon} size={17} color={C.brand} />
    </Pressable>
  );
}

type Tone = 'plain' | 'good' | 'warn' | 'bad' | 'brand' | 'new';
const TONES: Record<Tone, [string, string]> = {
  plain: ['#EFE7D2', C.muted],
  good: [C.greenSoft, C.green],
  warn: [C.amberSoft, C.amber],
  bad: [C.redSoft, C.red],
  brand: [C.brandSoft, C.brandDeep],
  new: [C.accentSoft, C.accent],
};

export function Chip({
  label, tone = 'plain', selected, onPress, icon,
}: { label: string; tone?: Tone; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  let [bg, fg] = TONES[tone];
  let border = bg;
  if (onPress) {
    [bg, fg, border] = selected ? [C.brand, '#F7F2E4', C.brand] : [C.card, C.ink, C.line];
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[s.chip, { backgroundColor: bg, borderColor: border }, onPress && { paddingVertical: 9, paddingHorizontal: 16, borderRadius: R.chip, minHeight: 40 }]}
    >
      {icon && <Icon name={icon} size={12} color={fg} />}
      <Text style={{ color: fg, fontSize: onPress ? 14 : 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }, style]}>{children}</View>;
}

/** Food tile: the dish's emoji on a soft tint, the app's stand-in for a photo. */
const CUISINE_TINT: Record<string, string> = {
  chinese: '#FFD9D2', malay: '#F3DDF0', indian: '#FFE8B8', peranakan: '#FFD9E3', western: '#E3EAD2', japanese: '#E9DBF5', korean: '#FFDCC8', thai: '#DDE8D0',
};
export function Thumb({ emoji, cuisine, size = 52 }: { emoji: string; cuisine?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: CUISINE_TINT[cuisine ?? ''] ?? C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontSize: size * 0.5 }}>{emoji}</RNText>
    </View>
  );
}

const AVATAR = ['#2F4030', '#C94A25', '#9A5B00', '#6E7A3A', '#8C4A2F', '#B8501F'];
export function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: AVATAR[index % AVATAR.length], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: F.display, fontSize: 18 }}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

export function Notice({ tone, icon, children }: { tone: 'good' | 'warn' | 'bad' | 'brand'; icon: IconName; children: React.ReactNode }) {
  const [bg, fg] = TONES[tone];
  return (
    <View style={{ flexDirection: 'row', gap: 8, backgroundColor: bg, borderRadius: 10, padding: 10, marginTop: 8, alignItems: 'flex-start' }}>
      <View style={{ marginTop: 1 }}><Icon name={icon} size={16} color={fg} /></View>
      <Text style={{ color: fg, flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' }}>{children}</Text>
    </View>
  );
}

export function Bar({ value, color = C.brand, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: C.line, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ height, width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export const chillies = (n: number) => (n === 0 ? 'Not spicy' : '🌶️'.repeat(n));

export function Stepper({ value, onChange, min, max, format }: { value: number; onChange: (v: number) => void; min: number; max: number; format?: (v: number) => string }) {
  const btn = (icon: IconName, next: number, disabled: boolean) => (
    <Pressable onPress={() => onChange(next)} disabled={disabled} accessibilityLabel={icon === 'remove' ? 'Less' : 'More'}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
      <Icon name={icon} size={18} color={C.brand} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#EFE7D2', borderRadius: 24, padding: 4 }}>
      {btn('remove', Math.max(min, value - 1), value <= min)}
      <Text style={{ minWidth: 84, textAlign: 'center', fontWeight: '700', fontSize: 15 }}>{format ? format(value) : value}</Text>
      {btn('add', Math.min(max, value + 1), value >= max)}
    </View>
  );
}

export const s = StyleSheet.create({
  eyebrow: { fontSize: 11, fontFamily: F.bold, color: C.chilli, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 6 },
  h1: { fontSize: 32, fontFamily: F.displayX, color: C.ink, letterSpacing: -0.6, marginTop: 2 },
  sub: { fontSize: 14, color: C.muted, marginTop: 6, marginBottom: 6, lineHeight: 20 },
  h2: { fontSize: 17, fontFamily: F.display, color: C.ink, marginBottom: 4, letterSpacing: -0.2 },
  p: { fontSize: 14, color: C.ink, lineHeight: 21 },
  card: {
    backgroundColor: C.card, borderRadius: R.card, padding: 16, marginTop: 12, borderWidth: 2, borderColor: C.line,
    shadowColor: '#2F4030', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  btn: { borderRadius: R.pill, minHeight: 48, paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: C.brandSoft },
  chip: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 9, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: { borderWidth: 2, borderColor: C.line, borderRadius: R.field, padding: 13, fontSize: 15, backgroundColor: C.card, color: C.ink, fontFamily: F.medium },
  label: { fontSize: 11, fontFamily: F.bold, color: C.muted, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.2 },
});
