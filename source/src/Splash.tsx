import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { C, F, R, Text } from './ui';

// The artwork is split in two layers: the pot with the "Kitchen Kaki" wordmark, and everything around it.
const SURROUND = require('../assets/splash-surround.png');
const POT = require('../assets/splash-pot.png');
const ART_W = 1048;
const ART_H = 1570;
const ART_RATIO = ART_H / ART_W;
// Where the pot layer sits inside the artwork (pixels in the 942 x 1422 artwork).
const POT_BOX = { x: 190, y: 495, w: 680, h: 805 };
// The point the utensils and ingredients gather around, as a percentage of the artwork.
const CENTRE = '50% 56%';

const useNative = Platform.OS !== 'web';

/** Lets other screens ("Replay the intro", after joining a family) bring the welcome screen back. */
let replay: (() => void) | null = null;
export const onReplaySplash = (fn: () => void) => { replay = fn; return () => { replay = null; }; };
export const playSplash = () => replay?.();

/** How long the gathering takes; the sparkles and bubbles begin once it has finished. */
const GATHER_MS = 1300;

/** Fades and rises into place, after `delay` ms. */
function useRise(delay: number, distance = 24) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
  }, [v, delay]);
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] };
}

/** A sparkle that grows, turns and fades, again and again, once everything has settled. */
function Sparkle({ x, y, size, delay, color = '#FFFFFF' }: { x: number; y: number; size: number; delay: number; color?: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(GATHER_MS + delay),
      Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: useNative }),
      Animated.timing(v, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: useNative }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, opacity: v,
      transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }],
    }}>
      <View style={{ width: size, height: size / 7, borderRadius: size / 14, backgroundColor: color, position: 'absolute', top: size * 0.43 }} />
      <View style={{ width: size / 7, height: size, borderRadius: size / 14, backgroundColor: color, position: 'absolute', left: size * 0.43 }} />
    </Animated.View>
  );
}

/** A stew bubble: swells up out of the stew, floats a little higher and pops (fades), over and over. */
function Bubble({ x, y, size, delay, rise = 26 }: { x: number; y: number; size: number; delay: number; rise?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // wait for everything to settle, then bubble forever: swell, rise, pop, start again from the stew
    const run = Animated.sequence([
      Animated.delay(GATHER_MS + delay),
      Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: useNative }),
        Animated.delay(500),
      ])),
    ]);
    run.start();
    return () => run.stop();
  }, [v, delay]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, borderRadius: size / 2,
      marginLeft: -size / 2, marginTop: -size / 2, backgroundColor: '#F2A93B', borderWidth: 1.5, borderColor: '#D98A1F',
      opacity: v.interpolate({ inputRange: [0, 0.18, 0.72, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [rise, -10] }) },
        { scale: v.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.3, 1, 1.12] }) },
      ],
    }} />
  );
}

/**
 * Welcome screen. The pot and "Kitchen Kaki" rise a little from below into place while the utensils and
 * ingredients drift in towards them; once everything has stopped, the sparkles twinkle and the stew bubbles.
 */
export default function Splash({ onStart }: { onStart: () => void }) {
  const { width, height } = useWindowDimensions();
  const artW = Math.min(width, (height * 0.7) / ART_RATIO, 560);
  const artH = artW * ART_RATIO;
  const k = artW / ART_W; // artwork pixels -> screen points

  const gather = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(gather, { toValue: 1, duration: GATHER_MS, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
  }, [gather]);

  const tagline = useRise(GATHER_MS - 300);
  const button = useRise(GATHER_MS - 50);

  return (
    <View style={{ flex: 1, backgroundColor: '#FDF0DF', alignItems: 'center', overflow: 'hidden' }}>
      <View style={{ width: artW, height: artH }}>
        {/* utensils and ingredients: start larger and further out, then close in and stop */}
        <Animated.Image
          source={SURROUND}
          accessibilityLabel="Tomatoes, garlic, herbs and kitchen utensils"
          resizeMode="stretch"
          style={{
            width: artW, height: artH,
            opacity: gather.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 1, 1] }),
            transformOrigin: CENTRE,
            transform: [{ scale: gather.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] }) }],
          }}
        />
        {/* the pot and wordmark: rise a little from below */}
        <Animated.Image
          source={POT}
          accessibilityLabel="Kitchen Kaki, a smiling chef-hat pot"
          resizeMode="stretch"
          style={{
            position: 'absolute', left: POT_BOX.x * k, top: POT_BOX.y * k, width: POT_BOX.w * k, height: POT_BOX.h * k,
            opacity: gather.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [{ translateY: gather.interpolate({ inputRange: [0, 1], outputRange: [70 * k * 2, 0] }) }],
          }}
        />
        <Sparkle x={17.5} y={5.5} size={30} delay={0} />
        <Sparkle x={78.6} y={6.7} size={34} delay={800} />
        <Sparkle x={8} y={61.5} size={38} delay={1400} />
        <Sparkle x={90} y={61.5} size={38} delay={400} />
        <Sparkle x={12.7} y={57} size={22} delay={1100} />
        <Sparkle x={86.5} y={45} size={26} delay={2000} color={C.saffron} />
        <Bubble x={53.6} y={33.3} size={13} delay={0} rise={30} />
        <Bubble x={49.3} y={35.5} size={10} delay={600} rise={26} />
        <Bubble x={56.7} y={36.3} size={11} delay={1200} rise={26} />
        <Bubble x={52.3} y={38.6} size={8} delay={1800} rise={20} />
      </View>

      <View style={{ position: 'absolute', left: 32, right: 32, bottom: 40, alignItems: 'center', gap: 20, maxWidth: 520 }}>
        <Animated.View style={tagline}>
          <Text style={{ fontFamily: F.semi, fontSize: 17, lineHeight: 24, textAlign: 'center' }}>Your Smart Recipe Planner{'\n'}& Kitchen Companion</Text>
        </Animated.View>
        <Animated.View style={[button, { alignSelf: 'stretch' }]}>
          <Pressable onPress={onStart} accessibilityRole="button" style={({ pressed }) => [s.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
            <Text style={{ color: '#F7F2E4', fontFamily: F.xbold, fontSize: 18 }}>Let's get cooking!</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cta: { height: 58, borderRadius: R.pill, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
});
