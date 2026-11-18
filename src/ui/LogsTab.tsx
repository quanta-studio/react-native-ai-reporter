import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import type {LogEntry} from '../types';
import {formatTime} from './format';
import {useStoreSnapshot} from './hooks';
import {colors, mono} from './theme';

export function LogsTab() {
  const {logs} = useStoreSnapshot();
  return (
    <FlatList
      testID="ai-reporter-logs-list"
      data={logs}
      keyExtractor={l => l.id}
      renderItem={({item}) => <LogRow entry={item} />}
      ListEmptyComponent={<Text style={styles.empty}>No logs recorded.</Text>}
    />
  );
}

function LogRow({entry}: {entry: LogEntry}) {
  return (
    <View
      testID={`ai-reporter-log-${entry.id}`}
      accessibilityLabel={`${entry.kind}: ${entry.message}`}
      style={styles.row}>
      <Text style={[styles.kind, entry.kind === 'warn' && styles.warn]}>
        {entry.kind.toUpperCase()}
        {entry.isFatal ? ' (fatal)' : ''} · {formatTime(entry.timestamp)}
      </Text>
      <Text selectable style={styles.message}>
        {entry.message}
      </Text>
      {entry.stack ? (
        <Text selectable style={styles.stack}>
          {entry.stack}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {padding: 24, textAlign: 'center', color: colors.muted},
  row: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  kind: {fontWeight: '700', color: colors.danger, fontSize: 12},
  warn: {color: colors.warning},
  message: {color: colors.text, marginTop: 2},
  stack: {
    fontFamily: mono,
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
});
