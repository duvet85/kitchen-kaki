import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { C, F, Text } from './ui';

/** Shows the intro again (for example after someone joins the family). */
let listener: (() => void) | null = null;
export const playSplash = () => listener?.();

const HOLD_MS = 1150;
const FADE_MS = 380;

/** Kitchen Kaki's intro: the logo settles in, then the whole screen fades away after about 1.5 seconds. It never blocks taps once it is gone. */
export default function Splash() {
  const [run, setRun] = useState(1);
  const [on, setOn] = useState(true);
  useEffect(() => { listener = () => { setOn(true); setRun((n) => n + 1); }; return () => { listener = null; }; }, []);
  return on ? <Intro key={run} onDone={() => setOn(false)} /> : null;
}

function Intro({ onDone }: { onDone: () => void }) {
  const pop = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(pop, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.delay(HOLD_MS - 520),
      Animated.timing(out, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => onDone());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View pointerEvents="auto" accessibilityLabel="Kitchen Kaki" style={[StyleSheet.absoluteFill, { backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', opacity: out, zIndex: 100 }]}>
      <Animated.View style={{ alignItems: 'center', opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }, { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
        <Image source={require('../assets/splash-icon.png')} style={{ width: 260, height: 260 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={{ color: '#fff', fontFamily: F.displayX, fontSize: 34, marginTop: -6 }}>Kitchen Kaki</Text>
        <View style={{ height: 3, width: 44, borderRadius: 2, backgroundColor: C.saffron, marginTop: 10 }} />
        <Text style={{ color: '#D9E4F7', fontSize: 15, marginTop: 10 }}>Your kitchen buddy</Text>
      </Animated.View>
    </Animated.View>
  );
}
