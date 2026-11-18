import React, {useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {isFailure} from '../core/network/failure';
import type {Insets, LauncherOptions} from '../types';
import {useStoreSnapshot, useUiState} from './hooks';
import {LAUNCHER_SIZE, colors} from './theme';
import {uiState} from './uiState';

const MARGIN = 8;
const DRAG_THRESHOLD = 4;

const DEFAULT_INSETS: Insets = {
  top: Platform.OS === 'ios' ? 47 : 24,
  right: 0,
  bottom: Platform.OS === 'ios' ? 34 : 0,
  left: 0,
};

export function Launcher({options = {}}: {options?: LauncherOptions}) {
  const {width, height} = useWindowDimensions();
  const {isOpen} = useUiState();
  const snapshot = useStoreSnapshot();
  const insets = useMemo<Insets>(
    () => ({...DEFAULT_INSETS, ...options.insets}),
    [options.insets],
  );

  const badge = snapshot.network.filter(
    e => isFailure(e) && !uiState.isSeen(e.id),
  ).length;

  const layout = useRef({width, height, insets});
  layout.current = {width, height, insets};

  const initial = useRef({
    x: width - LAUNCHER_SIZE - MARGIN,
    y: options.initialTop ?? height / 2,
  }).current;
  const pan = useRef(new Animated.ValueXY(initial)).current;
  const current = useRef({...initial});
  const start = useRef({...initial});

  useEffect(() => {
    const id = pan.addListener(v => {
      current.current = v;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  const clampY = (y: number) => {
    const l = layout.current;
    return Math.min(
      Math.max(y, l.insets.top + MARGIN),
      l.height - l.insets.bottom - LAUNCHER_SIZE - MARGIN,
    );
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: () => {
        start.current = {...current.current};
      },
      onPanResponderMove: (_e, g) => {
        pan.setValue({
          x: start.current.x + g.dx,
          y: clampY(start.current.y + g.dy),
        });
      },
      onPanResponderRelease: (_e, g) => {
        const l = layout.current;
        const x = start.current.x + g.dx;
        const left = x + LAUNCHER_SIZE / 2 < l.width / 2;
        const snapX = left
          ? l.insets.left + MARGIN
          : l.width - l.insets.right - LAUNCHER_SIZE - MARGIN;
        Animated.spring(pan, {
          toValue: {x: snapX, y: clampY(start.current.y + g.dy)},
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  if (options.hidden || isOpen) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        style={[styles.holder, {transform: pan.getTranslateTransform()}]}
        {...responder.panHandlers}>
        <Pressable
          testID="ai-reporter-launcher"
          accessibilityRole="button"
          accessibilityLabel="Open AI Reporter inspector"
          onPress={uiState.open}
          style={styles.button}>
          <Text style={styles.glyph}>AI</Text>
        </Pressable>
        {badge > 0 ? (
          <View
            testID="ai-reporter-launcher-badge"
            accessibilityLabel={`${badge} failed requests`}
            style={styles.badge}
            pointerEvents="none">
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  holder: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    zIndex: 9999,
    elevation: 9999,
  },
  button: {
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    borderRadius: LAUNCHER_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {color: colors.onPrimary, fontWeight: '700', fontSize: 16},
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: colors.onPrimary, fontSize: 11, fontWeight: '700'},
});
