import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {isFailure} from '../core/network/failure';
import type {NetworkEntry} from '../types';
import {NetworkDetail} from './NetworkDetail';
import {formatDuration, formatTime, pathOf, statusLabel} from './format';
import {useStoreSnapshot} from './hooks';
import {colors} from './theme';

export function NetworkTab() {
  const {network} = useStoreSnapshot();
  const [query, setQuery] = useState('');
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return network.filter(
      e =>
        (!failuresOnly || isFailure(e)) &&
        (q === '' || e.url.toLowerCase().includes(q)),
    );
  }, [network, query, failuresOnly]);

  const selected = selectedId
    ? network.find(e => e.id === selectedId)
    : undefined;
  if (selected) {
    return (
      <NetworkDetail entry={selected} onBack={() => setSelectedId(undefined)} />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.filters}>
        <TextInput
          testID="ai-reporter-search"
          accessibilityLabel="Search requests by URL"
          placeholder="Search URL"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>Failures only</Text>
          <Switch
            testID="ai-reporter-failures-toggle"
            accessibilityLabel="Failures only"
            value={failuresOnly}
            onValueChange={setFailuresOnly}
          />
        </View>
      </View>
      <FlatList
        data={rows}
        keyExtractor={e => e.id}
        renderItem={({item}) => (
          <Row entry={item} onPress={() => setSelectedId(item.id)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No requests recorded.</Text>
        }
      />
    </View>
  );
}

function Row({entry, onPress}: {entry: NetworkEntry; onPress: () => void}) {
  const failed = isFailure(entry);
  const status = statusLabel(entry);
  return (
    <Pressable
      testID={`ai-reporter-row-${entry.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${entry.method} ${pathOf(entry.url)}, ${status}`}
      onPress={onPress}
      style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.method}>{entry.method}</Text>
        <Text style={styles.path} numberOfLines={1}>
          {pathOf(entry.url)}
        </Text>
        <Text style={[styles.status, failed && styles.failed]}>{status}</Text>
      </View>
      <Text style={styles.meta}>
        {formatDuration(entry.duration)} · {formatTime(entry.startTime)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  filters: {padding: 8, borderBottomWidth: 1, borderColor: colors.border},
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: colors.text,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  toggleLabel: {color: colors.text},
  empty: {padding: 24, textAlign: 'center', color: colors.muted},
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  rowTop: {flexDirection: 'row', alignItems: 'center'},
  method: {fontWeight: '700', color: colors.primary, width: 56},
  path: {flex: 1, color: colors.text},
  status: {fontWeight: '700', color: colors.success, marginLeft: 8},
  failed: {color: colors.danger},
  meta: {color: colors.muted, fontSize: 12, marginTop: 2},
});
