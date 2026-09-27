import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="home" />
        <Stack.Screen name="analyze" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="about" />
        <Stack.Screen name="history" />
        <Stack.Screen name="feedback" />
        <Stack.Screen name="patient-monitoring" />
      </Stack>
    </>
  );
} 