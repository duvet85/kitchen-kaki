import React, { useRef, useState } from 'react';
import { PanResponder, Platform, View, useWindowDimensions } from 'react-native';
import { C, F, Icon, Text } from '../ui';

export type Drag<T> = { item: T; label: string; x: number; y: number; moved: boolean } | null;

/**
 * Drag and drop between days: hold the handle, drag the dish down onto a day in the bar that appears at the bottom, let go.
 * A tap on the handle (no dragging) opens the same bar to tap a day instead.
 */
export function useDragMove<T>(days: { day: number; label: string; sub: string; blocked?: (item: T) => boolean }[], onDrop: (item: T, day: number) => void) {
  const [drag, setDrag] = useState<Drag<T>>(null);
  const [tapped, setTapped] = useState<{ item: T; label: string } | null>(null);
  const { width, height } = useWindowDimensions();
  const BAR = 96;
  const ref = useRef(drag); ref.current = drag;
  const at = (x: number, y: number) => {
    if (y < height - BAR - 24) return null;
    const i = Math.floor((x / width) * days.length);
    return days[Math.max(0, Math.min(days.length - 1, i))];
  };

  const handle = (item: T, label: string) => {
    const pr = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => setDrag({ item, label, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, moved: false }),
      onPanResponderMove: (e, g) => setDrag({ item, label, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, moved: Math.abs(g.dx) + Math.abs(g.dy) > 8 }),
      onPanResponderRelease: (e) => {
        const d = ref.current;
        setDrag(null);
        if (!d) return;
        if (!d.moved) { setTapped({ item, label }); return; }
        const hit = at(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (hit && !hit.blocked?.(item)) onDrop(item, hit.day);
      },
      onPanResponderTerminate: () => setDrag(null),
    });
    return (
      <View {...pr.panHandlers} accessibilityRole="button" accessibilityLabel={`Move ${label} to another day`}
        style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }, Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab', userSelect: 'none' } as object) : null]}>
        <Icon name="move" size={18} color={C.brand} />
      </View>
    );
  };

  const live = drag?.moved ? drag : null;
  const over = live ? at(live.x, live.y) : null;
  const pinned = Platform.OS === 'web' ? ('fixed' as 'absolute') : 'absolute';
  const bar = (live || tapped) ? (
    <>
      {live && (
        <View pointerEvents="none" style={{ position: pinned, left: live.x - 90, top: live.y - 76, width: 180, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.brandDeep, opacity: 0.92, zIndex: 1001 }}>
          <Text numberOfLines={1} style={{ color: '#fff', fontFamily: F.semi, textAlign: 'center' }}>{live.label}</Text>
        </View>
      )}
      <View style={{ position: pinned, left: 0, right: 0, bottom: 0, height: BAR + 24, backgroundColor: C.card, borderTopWidth: 2, borderColor: C.brand, zIndex: 1000, paddingTop: 6 }}>
        <Text style={{ textAlign: 'center', color: C.muted, fontSize: 12, fontWeight: '700' }}>
          {live ? 'Drop it on a day' : `Move ${tapped!.label} to:`}
        </Text>
        <View style={{ flexDirection: 'row', flex: 1, padding: 6, gap: 4 }}>
          {days.map((d) => {
            const item = (live?.item ?? tapped?.item) as T;
            const no = d.blocked?.(item);
            const hot = over?.day === d.day && !no;
            return (
              <View key={d.day} onStartShouldSetResponder={() => !live && !no} onResponderRelease={() => { if (tapped && !no) { onDrop(tapped.item, d.day); setTapped(null); } }}
                accessibilityRole="button" accessibilityLabel={`Move to ${d.label}`} accessibilityState={{ disabled: !!no }}
                style={{ flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: hot ? C.brand : C.line, backgroundColor: hot ? C.brandSoft : no ? C.bg : '#fff', opacity: no ? 0.45 : 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 15 }}>{d.label}</Text>
                <Text style={{ fontSize: 10, color: C.faint }}>{no ? 'here' : d.sub}</Text>
              </View>
            );
          })}
        </View>
        {tapped && <Text onPress={() => setTapped(null)} accessibilityRole="button" style={{ textAlign: 'center', color: C.brand, fontWeight: '700', paddingBottom: 8 }}>Cancel</Text>}
      </View>
    </>
  ) : null;
  // on the web the bar goes straight into the page body, so it sits at the bottom of the screen above everything else
  const portal = (el: React.ReactElement | null) => {
    if (!el || Platform.OS !== 'web' || typeof document === 'undefined') return el;
    const { createPortal } = require('react-dom') as { createPortal: (el: React.ReactElement, to: Element) => React.ReactElement };
    return createPortal(el, document.body);
  };
  return { handle, bar: portal(bar), dragging: !!live };
}
