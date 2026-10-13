import React from 'react';
import { View, ViewStyle } from 'react-native';
import { C, F, Text } from './ui';

/** Kitchen Kaki's little speech bubble: the app's friendly voice. "Kaki" is Singlish for buddy. */
export function KakiSays({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 }, style]}>
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontFamily: F.displayX, fontSize: 15 }}>K</Text>
      </View>
      <View style={{ flexShrink: 1, backgroundColor: C.card, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.line }}>
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
