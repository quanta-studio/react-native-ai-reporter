import React, {useState} from 'react';
import {Modal, Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {store} from '../core/runtime';
import type {InspectorTab} from '../types';
import {LogsTab} from './LogsTab';
import {NetworkTab} from './NetworkTab';
import {useUiState} from './hooks';
import {colors} from './theme';
import {uiState} from './uiState';

/** The next package adds a Report tab by appending to this list. */
export const DEFAULT_TABS: InspectorTab[] = [
  {key: 'network', title: 'Network', render: () => <NetworkTab />},
  {key: 'logs', title: 'Logs', render: () => <LogsTab />},
];

export function Inspector({tabs = DEFAULT_TABS}: {tabs?: InspectorTab[]}) {
  const {isOpen} = useUiState();
  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const active = tabs.find(t => t.key === activeKey) ?? tabs[0];
  const clearable = active.key === 'network' || active.key === 'logs';

  return (
    <Modal
      visible={isOpen}
      presentationStyle="fullScreen"
      animationType="slide"
      onRequestClose={uiState.close}>
      <SafeAreaView style={styles.root} testID="ai-reporter-inspector">
        <View style={styles.header}>
          <Text style={styles.title}>Reporter</Text>
          {clearable ? (
            <Pressable
              testID="ai-reporter-clear"
              accessibilityRole="button"
              accessibilityLabel={`Clear ${active.title}`}
              onPress={() => store.clear(active.key as 'network' | 'logs')}
              style={styles.action}>
              <Text style={styles.actionText}>Clear</Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="ai-reporter-close"
            accessibilityRole="button"
            accessibilityLabel="Close inspector"
            onPress={uiState.close}
            style={styles.action}>
            <Text style={styles.actionText}>Close</Text>
          </Pressable>
        </View>
        <View style={styles.tabs}>
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              testID={`ai-reporter-tab-${tab.key}`}
              accessibilityRole="tab"
              accessibilityLabel={tab.title}
              accessibilityState={{selected: tab.key === active.key}}
              onPress={() => setActiveKey(tab.key)}
              style={[styles.tab, tab.key === active.key && styles.tabActive]}>
              <Text
                style={[
                  styles.tabText,
                  tab.key === active.key && styles.tabTextActive,
                ]}>
                {tab.title}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.body}>{active.render()}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: {flex: 1, fontSize: 18, fontWeight: '700', color: colors.text},
  action: {paddingHorizontal: 10, paddingVertical: 6},
  actionText: {color: colors.primary, fontWeight: '600'},
  tabs: {flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border},
  tab: {flex: 1, alignItems: 'center', paddingVertical: 10},
  tabActive: {borderBottomWidth: 2, borderColor: colors.primary},
  tabText: {color: colors.muted, fontWeight: '600'},
  tabTextActive: {color: colors.primary},
  body: {flex: 1},
});
