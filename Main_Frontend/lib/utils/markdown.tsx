import React from 'react';
import { Text, View } from 'react-native';

interface MarkdownTextProps {
  text: string;
  style?: any;
}

export const parseMarkdown = (text: string, style?: any) => {
  // Enhanced markdown parser that prevents text overlap
  // Supports: **bold**, *italic*, ## headers, - lists, > quotes, `code`
  
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, lineIndex) => {
    if (!line.trim()) {
      // Add proper spacing for empty lines
      elements.push(
        <View key={`spacing-${lineIndex}`} style={{ height: 8 }} />
      );
      return;
    }
    
    // Handle different line types
    if (line.startsWith('## ')) {
      const headerText = line.slice(3);
      elements.push(
        <Text key={`header-${lineIndex}`} style={[style, { 
          fontSize: 18, 
          fontWeight: 'bold', 
          marginTop: 16, 
          marginBottom: 8,
          color: '#0d5b56',
          lineHeight: 24
        }]}>
          {headerText}
        </Text>
      );
    } else if (line.startsWith('### ')) {
      const headerText = line.slice(4);
      elements.push(
        <Text key={`subheader-${lineIndex}`} style={[style, { 
          fontSize: 16, 
          fontWeight: 'bold', 
          marginTop: 12, 
          marginBottom: 6,
          color: '#0d5b56',
          lineHeight: 22
        }]}>
          {headerText}
        </Text>
      );
    } else if (line.startsWith('- ')) {
      const listText = line.slice(2);
      elements.push(
        <View key={`list-${lineIndex}`} style={{ 
          flexDirection: 'row', 
          marginBottom: 6,
          paddingLeft: 8
        }}>
          <Text style={[style, { marginRight: 8, color: '#14b8a6' }]}>•</Text>
          <Text style={[style, { flex: 1, lineHeight: 20 }]}>{listText}</Text>
        </View>
      );
    } else if (line.startsWith('> ')) {
      const quoteText = line.slice(2);
      elements.push(
        <View key={`quote-${lineIndex}`} style={{ 
          backgroundColor: '#f0f9ff', 
          borderLeftWidth: 4, 
          borderLeftColor: '#14b8a6',
          paddingLeft: 12,
          paddingVertical: 8,
          marginVertical: 8,
          borderRadius: 4
        }}>
          <Text style={[style, { 
            fontStyle: 'italic', 
            color: '#0d5b56',
            lineHeight: 20
          }]}>
            {quoteText}
          </Text>
        </View>
      );
    } else {
      // Regular line - parse inline markdown
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
      
      const lineElements = parts.map((part, partIndex) => {
        if (!part.trim()) return null;
        
        // Bold text **text**
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <Text key={`${lineIndex}-${partIndex}`} style={[style, { 
              fontWeight: 'bold',
              color: '#0d5b56'
            }]}>
              {boldText}
            </Text>
          );
        }
        
        // Italic text *text*
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          const italicText = part.slice(1, -1);
          return (
            <Text key={`${lineIndex}-${partIndex}`} style={[style, { 
              fontStyle: 'italic',
              color: '#6b7280'
            }]}>
              {italicText}
            </Text>
          );
        }
        
        // Inline code `code`
        if (part.startsWith('`') && part.endsWith('`')) {
          const codeText = part.slice(1, -1);
          return (
            <Text key={`${lineIndex}-${partIndex}`} style={[style, { 
              fontFamily: 'monospace', 
              backgroundColor: '#f3f4f6', 
              paddingHorizontal: 6, 
              paddingVertical: 2,
              borderRadius: 4,
              color: '#374151',
              fontSize: 12
            }]}>
              {codeText}
            </Text>
          );
        }
        
        // Regular text
        return (
          <Text key={`${lineIndex}-${partIndex}`} style={[style, { lineHeight: 20 }]}>
            {part}
          </Text>
        );
      }).filter(Boolean);
      
      if (lineElements.length > 0) {
        elements.push(
          <Text key={`line-${lineIndex}`} style={[style, { 
            marginBottom: 6,
            lineHeight: 20
          }]}>
            {lineElements}
          </Text>
        );
      }
    }
  });
  
  return elements;
};