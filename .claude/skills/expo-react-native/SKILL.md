---
model: claude-sonnet-4-6
name: expo-react-native
description: Use when building mobile apps with Expo and React Native — project setup, navigation, native APIs, or building for iOS and Android. Also use when choosing between Expo and bare React Native or deploying mobile apps.
---

# expo-react-native

Quick reference for Expo SDK 53 + React Native 0.79 + Expo Router.

## Project Creation

```bash
npx create-expo-app@latest my-app
# With blank TypeScript template
npx create-expo-app@latest my-app --template blank-typescript
# Run immediately
cd my-app && npx expo start
```

## Expo Router File Structure

```
app/
  _layout.tsx          # Root layout (Stack or Tabs wrapper)
  index.tsx            # → /
  about.tsx            # → /about
  (tabs)/
    _layout.tsx        # Tab bar config
    home.tsx           # → /home (tab)
    profile.tsx        # → /profile (tab)
  (auth)/
    login.tsx          # Grouped, no URL segment
  [id].tsx             # → /123 (dynamic segment)
  +not-found.tsx       # 404 fallback
```

## Key Components (Quick Reference)

| Component | Use |
|-----------|-----|
| `View` | Div equivalent — flexbox container |
| `Text` | All text must be in `<Text>` |
| `ScrollView` | Scrollable container (small lists) |
| `FlatList` | Virtualized list (large data sets) |
| `Pressable` | Touchable with `pressed` state feedback |
| `TextInput` | Text input — `onChangeText`, not `onChange` |
| `Image` | Static/remote images; `source={{ uri }}` for URLs |
| `SafeAreaView` | Respects notches/status bar on iOS |
| `Modal` | Overlay modal |
| `ActivityIndicator` | Spinner |

## Dev Workflow

```bash
npx expo start          # Start Metro bundler (shows QR code)
npx expo start --ios    # Launch iOS Simulator
npx expo start --android # Launch Android Emulator
npx expo start --web    # Launch in browser

npx expo install <pkg>  # Always use expo install (version-locks to SDK)

eas build -p ios        # Cloud build for iOS
eas build -p android    # Cloud build for Android
eas submit -p ios       # Submit to App Store
eas update              # OTA update push
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `flexDirection` defaults to `row` | It defaults to `column` in RN — opposite of web |
| Using `localStorage` | Use `AsyncStorage` from `@react-native-async-storage/async-storage` |
| Using DOM APIs (`document`, `window`) | No DOM in RN — use RN APIs or platform-safe libs |
| Expo Go crashing with native modules | Use development build (`expo-dev-client`) |
| `<div>` or `<span>` in components | Must use `<View>` and `<Text>` |
| Raw strings outside `<Text>` | RN throws — always wrap text in `<Text>` |
| Skipping `npx expo install` | `npm install` ignores SDK version pinning |
| New Architecture disabled | SDK 52+ enables it by default — don't opt out without reason |

See reference.md for full API coverage.
