import React from 'react';
import {Pressable, ScrollView, Share, StyleSheet, Text, View} from 'react-native';
import type {HeaderMap, NetworkEntry} from '../types';
import {
  formatDuration,
  prettyBody,
  statusLabel,
  toCurl,
  toShareText,
} from './format';
import {colors, mono} from './theme';

function Section({title, children}: {title: string; children: string}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text selectable style={styles.mono}>
        {children}
      </Text>
    </View>
  );
}

const headerText = (h: HeaderMap) =>
  Object.keys(h)
    .map(k => `${k}: ${h[k]}`)
    .join('\n') || '(none)';

function share(message: string) {
  Share.share({message}).catch(() => undefined);
}

export function NetworkDetail({
  entry,
  onBack,
}: {
  entry: NetworkEntry;
  onBack: () => void;
}) {
  return (
    <View style={styles.flex} testID="ai-reporter-detail">
      <View style={styles.bar}>
        <Button id="back" label="Back" onPress={onBack} />
        <Button
          id="share"
          label="Share"
          onPress={() => share(toShareText(entry))}
        />
        <Button
          id="share-curl"
          label="Share as cURL"
          onPress={() => share(toCurl(entry))}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Request">
          {`${entry.method} ${entry.url}\nStatus: ${statusLabel(
            entry,
          )}\nState: ${entry.state}\nStarted: ${new Date(
            entry.startTime,
          ).toISOString()}\nDuration: ${formatDuration(entry.duration)}`}
        </Section>
        <Section title="Request headers">
          {headerText(entry.requestHeaders)}
        </Section>
        <Section title="Request body">
          {prettyBody(entry.requestBody) || '(empty)'}
        </Section>
        <Section title="Response headers">
          {headerText(entry.responseHeaders)}
        </Section>
        <Section title="Response body">
          {prettyBody(entry.responseBody) || '(empty)'}
        </Section>
        {entry.truncated ? (
          <Text style={styles.note}>A body was truncated.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Button({
  id,
  label,
  onPress,
}: {
  id: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`ai-reporter-${id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  bar: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  button: {paddingHorizontal: 10, paddingVertical: 6, marginRight: 8},
  buttonText: {color: colors.primary, fontWeight: '600'},
  content: {padding: 12},
  section: {marginBottom: 16},
  sectionTitle: {fontWeight: '700', color: colors.text, marginBottom: 4},
  mono: {
    fontFamily: mono,
    fontSize: 12,
    color: colors.text,
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
  },
  note: {color: colors.warning},
});
