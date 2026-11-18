import React from 'react';
import {Button, SafeAreaView, ScrollView, StyleSheet, Text} from 'react-native';
import {AiReporterProvider} from '@quanta-studio/react-native-ai-reporter';

// Public echo service, for manual testing only.
const ECHO = 'https://httpbin.org';

async function run(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.warn(`${label} failed`, error);
  }
}

function plainXhr() {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `${ECHO}/get?source=xhr`);
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.send();
}

export default function App() {
  return (
    <AiReporterProvider getCurrentRoute={() => 'Examples'}>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>AI Reporter example</Text>
          <Button
            title="GET"
            onPress={() => run('GET', () => fetch(`${ECHO}/get?page=1`))}
          />
          <Button
            title="POST JSON with password"
            onPress={() =>
              run('POST', () =>
                fetch(`${ECHO}/post`, {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({user: 'demo', password: 'hunter2'}),
                }),
              )
            }
          />
          <Button
            title="404"
            onPress={() => run('404', () => fetch(`${ECHO}/status/404`))}
          />
          <Button
            title="Aborted fetch"
            onPress={() => {
              const controller = new AbortController();
              run('abort', () =>
                fetch(`${ECHO}/delay/5`, {signal: controller.signal}),
              );
              setTimeout(() => controller.abort(), 100);
            }}
          />
          <Button title="Plain XHR" onPress={plainXhr} />
          <Button
            title="console.error"
            onPress={() => console.error('Example error', {code: 42})}
          />
          <Button
            title="Report a non-fatal error"
            onPress={() => {
              // Goes through the global handler as non-fatal, so the app
              // keeps running and the entry shows in the Logs tab.
              const handler = ErrorUtils.getGlobalHandler();
              handler(new Error('Example non-fatal error'), false);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </AiReporterProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#fff'},
  content: {padding: 16, gap: 12},
  title: {fontSize: 20, fontWeight: '700'},
});
