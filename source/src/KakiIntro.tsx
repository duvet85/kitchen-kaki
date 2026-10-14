import { cookL } from './cook';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { KakiBadge } from './Kaki';
import { C, F, Icon, IconName, R, Text } from './ui';

const useNative = Platform.OS !== 'web';

/** Eases a 0 -> 1 value in after `delay` ms, with a little overshoot when `spring` is set. */
function usePop(delay: number, spring = false) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = spring
      ? Animated.spring(v, { toValue: 1, delay, friction: 5, tension: 70, useNativeDriver: useNative })
      : Animated.timing(v, { toValue: 1, duration: 450, delay, easing: Easing.out(Easing.cubic), useNativeDriver: useNative });
    anim.start();
    return () => anim.stop();
  }, [v, delay, spring]);
  return v;
}

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'chatbubble-ellipses-outline', title: 'Tell me what changed', text: 'Type it the way you would say it, like "Dad has a fever" or "no prawns at the shop". Or tap one of the ideas at the bottom.' },
  { icon: 'swap-horizontal-outline', title: 'I rework the menu', text: "I swap the affected dishes for ones that fit, using what's already in the kitchen where I can, and add anything new to the shopping run." },
  { icon: 'checkmark-circle-outline', title: 'You have the final say', text: `Look at my suggestion, then tap "Make these changes". Your ${cookL()} will see a note about what changed.` },
];

function Step({ icon, title, text, delay }: { icon: IconName; title: string; text: string; delay: number }) {
  const v = usePop(delay);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }], flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.saffronSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color={C.brandDeep} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 15 }}>{title}</Text>
        <Text style={{ color: C.muted, fontSize: 13.5, lineHeight: 19, marginTop: 1 }}>{text}</Text>
      </View>
    </Animated.View>
  );
}

/**
 * Kaki pops up out of the bottom of the chat, gives a little wave and says hello in a speech bubble.
 * The first time, he also explains how to use Ask Kaki; after that a "How does this work?" link brings the tips back.
 */
export default function KakiIntro({ hasPlan, tips, onShowTips }: { hasPlan: boolean; tips: boolean; onShowTips: () => void }) {
  const pot = usePop(0, true);
  const bubble = usePop(550, true);
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // after popping up, a quick wobble, as if waving hello
    const anim = Animated.sequence([
      Animated.delay(450),
      Animated.timing(wave, { toValue: 1, duration: 160, useNativeDriver: useNative }),
      Animated.timing(wave, { toValue: -1, duration: 220, useNativeDriver: useNative }),
      Animated.timing(wave, { toValue: 1, duration: 220, useNativeDriver: useNative }),
      Animated.timing(wave, { toValue: 0, duration: 160, useNativeDriver: useNative }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [wave]);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, overflow: 'hidden', paddingTop: 8 }}>
        <Animated.View style={{
          opacity: pot.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: pot.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) },
            { scale: pot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            { rotate: wave.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] }) },
          ],
        }}>
          <KakiBadge size={104} />
        </Animated.View>

        <Animated.View style={{
          flex: 1, marginBottom: 14, opacity: bubble, transformOrigin: '0% 100%',
          transform: [{ scale: bubble.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        }}>
          {/* the little tail of the speech bubble, pointing at the pot */}
          <View style={{ position: 'absolute', left: -7, bottom: 22, width: 14, height: 14, backgroundColor: C.card, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: C.line, transform: [{ rotate: '45deg' }] }} />
          <View style={{ backgroundColor: C.card, borderRadius: R.card, borderWidth: 2, borderColor: C.line, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.brandDeep }}>Hey Kaki! 👋</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, marginTop: 4 }}>
              {hasPlan
                ? "I'm your kitchen buddy for when plans change. Tell me what's up and I'll rework this week's menu."
                : "I'm your kitchen buddy for when plans change. Make a weekly menu on the Menu tab first, then come back and tell me what's up."}
            </Text>
          </View>
        </Animated.View>
      </View>

      {tips ? (
        <View style={{ marginTop: 10, backgroundColor: C.card, borderRadius: R.card, borderWidth: 2, borderColor: C.line, padding: 16, gap: 14 }}>
          <Text style={{ fontSize: 11, fontFamily: F.bold, color: C.chilli, letterSpacing: 1.4 }}>HOW TO USE ASK KAKI</Text>
          {STEPS.map((s, i) => <Step key={s.title} {...s} delay={1000 + i * 250} />)}
        </View>
      ) : (
        <Pressable onPress={onShowTips} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 6, paddingVertical: 8, paddingHorizontal: 4 }}>
          <Text style={{ color: C.brandDeep, fontFamily: F.bold, fontSize: 13, textDecorationLine: 'underline' }}>How does this work?</Text>
        </Pressable>
      )}
    </View>
  );
}
