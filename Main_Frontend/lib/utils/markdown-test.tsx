import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { parseMarkdown } from './markdown';

// Test component to verify markdown functionality
export const MarkdownTest = () => {
  const testText = `## Progress Analysis
Your condition appears to be **improving** based on the latest follow-up.

### Key Observations
- Symptoms are *less severe* than before
- Medication compliance is good
- No new allergies reported

> **Important:** Continue monitoring for any changes

### Recommendations
- Keep taking prescribed medications
- Apply topical treatments as directed
- Schedule follow-up in \`2 weeks\`

**Next Steps:**
1. Monitor symptoms daily
2. Contact doctor if condition worsens
3. Continue current treatment plan`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Markdown Test</Text>
      <View style={styles.content}>
        <Text style={styles.text}>
          {parseMarkdown(testText, styles.text)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
});
