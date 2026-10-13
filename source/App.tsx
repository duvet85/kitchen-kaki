import {
  Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import FamilyScreen from './src/screens/FamilyScreen';
import HomeScreen from './src/screens/HomeScreen';
import HealthScreen from './src/screens/HealthScreen';
import HelperScreen from './src/screens/HelperScreen';
import KitchenScreen from './src/screens/KitchenScreen';
import PlanScreen from './src/screens/PlanScreen';
import RatingsScreen from './src/screens/RatingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { AiProvider } from './src/ai/AiProvider';
import { AskKakiButton } from './src/screens/AskKaki';
import Splash from './src/Splash';
import { KakiBadge } from './src/Kaki';
import { StateProvider, useApp } from './src/state';
import { C, F, Icon, IconName, Text, useLayout } from './src/ui';

const TABS: { key: string; icon: IconName; iconOn: IconName; label: string; Screen: () => React.JSX.Element }[] = [
  { key: 'home', icon: 'home-outline', iconOn: 'home', label: 'Home', Screen: HomeScreen },
  { key: 'family', icon: 'people-outline', iconOn: 'people', label: 'Family', Screen: FamilyScreen },
  { key: 'plan', icon: 'calendar-outline', iconOn: 'calendar', label: 'Menu', Screen: PlanScreen },
  { key: 'helper', icon: 'restaurant-outline', iconOn: 'restaurant', label: 'Helper', Screen: HelperScreen },
  { key: 'kitchen', icon: 'ribbon-outline', iconOn: 'ribbon', label: 'Kitchen', Screen: KitchenScreen },
  { key: 'ratings', icon: 'star-outline', iconOn: 'star', label: 'Ratings', Screen: RatingsScreen },
  { key: 'health', icon: 'heart-outline', iconOn: 'heart', label: 'Health', Screen: HealthScreen },
  { key: 'settings', icon: 'settings-outline', iconOn: 'settings', label: 'Settings', Screen: SettingsScreen },
];

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
    ...Ionicons.font,
  });
  const [welcomed, setWelcomed] = useState(false);
  if (!fontsLoaded) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.brand} /></View>;
  }
  if (!welcomed) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Splash onStart={() => setWelcomed(true)} />
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider>
      <AiProvider>
        <StateProvider>
          <Shell />
        </StateProvider>
      </AiProvider>
    </SafeAreaProvider>
  );
}

/** A helper's phone only shows what the helper needs. */
const HELPER_TABS = ['helper', 'kitchen', 'settings'];

function Shell() {
  const { family } = useApp();
  const tabs = family?.role === 'helper' ? TABS.filter((t) => HELPER_TABS.includes(t.key)) : TABS;
  const [picked, setTab] = useState('home');
  const tab = tabs.some((t) => t.key === picked) ? picked : tabs[0].key;
  const { rail, short, railWidth } = useLayout();
  const Active = tabs.find((t) => t.key === tab)!.Screen;
  const showKaki = family?.role !== 'helper' && tab !== 'settings';

  if (rail) {
    // Tablets, and phones held sideways: navigation rail on the left, content fills the rest.
    return (
      <>
          <StatusBar style="dark" />
          <View style={{ flex: 1, flexDirection: 'row', backgroundColor: C.bg }}>
            <SafeAreaView edges={['top', 'bottom', 'left']} style={{ width: railWidth, backgroundColor: C.card, borderRightWidth: 1, borderColor: C.line }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {!short && <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <KakiBadge size={56} />
                <Text style={{ fontFamily: F.display, fontSize: 12, marginTop: 6, color: C.brandDeep }}>Kaki</Text>
              </View>}
              <View style={{ gap: short ? 0 : 6, paddingTop: 8 }}>
                {tabs.map((t) => {
                  const on = tab === t.key;
                  return (
                    <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ alignItems: 'center', gap: short ? 2 : 4, paddingVertical: short ? 4 : 8 }}>
                      <View style={{ paddingHorizontal: short ? 16 : 20, paddingVertical: short ? 4 : 6, borderRadius: 18, backgroundColor: on ? C.saffron : 'transparent' }}>
                        <Icon name={on ? t.iconOn : t.icon} size={short ? 21 : 24} color={on ? C.brandDeep : C.faint} />
                      </View>
                      <Text style={{ fontSize: short ? 11 : 12, color: on ? C.brandDeep : C.faint, fontWeight: on ? '700' : '500' }}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              </ScrollView>
            </SafeAreaView>
            <SafeAreaView edges={['top', 'right']} style={{ flex: 1 }}>
              <Active />
              {showKaki && <AskKakiButton />}
            </SafeAreaView>
          </View>
      </>
    );
  }

  return (
    <>
      
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
          <StatusBar style="dark" />
          <View style={{ flex: 1 }}>
            <Active />
              {showKaki && <AskKakiButton />}
          </View>
        </SafeAreaView>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.card, borderTopWidth: 2, borderColor: C.line, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 6, paddingTop: 8, paddingBottom: 4 }}>
            {tabs.map((t) => {
              const on = tab === t.key;
              return (
                <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: on ? C.saffron : 'transparent' }}>
                    <Icon name={on ? t.iconOn : t.icon} size={21} color={on ? C.brandDeep : C.faint} />
                  </View>
                  <Text style={{ fontSize: 11, color: on ? C.brandDeep : C.faint, fontWeight: on ? '700' : '500' }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      
    </>
  );
}
