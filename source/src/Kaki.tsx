import React from 'react';
import { Image, View, ViewStyle } from 'react-native';
import { C, F, Text } from './ui';

/** The Kitchen Kaki pot mascot on its own, with no background. `size` is its width. */
export function KakiBadge({ size = 34 }: { size?: number }) {
  return (
    <Image source={require('../assets/logo-pot.png')} accessibilityLabel="Kitchen Kaki" resizeMode="contain" style={{ width: size, height: size * (661 / 767) }} />
  );
}

/** Kitchen Kaki's little speech bubble: the app's friendly voice. "Kaki" is Singlish for buddy. */
export function KakiSays({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 }, style]}>
      <KakiBadge size={38} />
      <View style={{ flexShrink: 1, backgroundColor: C.card, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: C.line }}>
        <Text style={{ lineHeight: 21 }}>{children}</Text>
      </View>
    </View>
  );
}

/** "Morning" / "Afternoon" / "Evening", for greetings. */
export function partOfDay(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}
