# Expo + React Native Reference

**SDK 53 · React Native 0.79 · React 19 · Expo Router**

---

## 1. Setup

```bash
# Default project (includes Expo Router + TypeScript)
npx create-expo-app@latest my-app

# Blank TypeScript template
npx create-expo-app@latest my-app --template blank-typescript

# Always use expo install — pins to SDK-compatible versions
npx expo install expo-camera expo-location
```

`tsconfig.json` extends `expo/tsconfig.base`. Enable typed routes in `app.json`:

```json
{ "expo": { "experiments": { "typedRoutes": true } } }
```

**Project structure (Expo Router):**

```
app/
  _layout.tsx          # Root layout (Stack or Tabs)
  index.tsx            # → /
  (tabs)/
    _layout.tsx        # Tab bar config
    home.tsx           # → /home
    profile.tsx        # → /profile
  (auth)/
    login.tsx          # Grouped — no URL segment
  [id].tsx             # → /:id  (dynamic)
  [...slug].tsx        # → /:slug*  (catch-all)
  +not-found.tsx       # 404 fallback
assets/
components/
hooks/
app.json              # Expo config
eas.json              # EAS build config
```

**Run commands:**

```bash
npx expo start            # QR code — open in Expo Go or dev build
npx expo start --ios      # iOS Simulator
npx expo start --android  # Android Emulator
npx expo start --web      # Browser
```

---

## 2. Expo Router

File-based routing built on React Navigation. Every file in `app/` = a route.

### Root Layout (Stack)

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
```

### Tab Navigation

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF' }}>
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

### Dynamic Routes + Navigation

```tsx
// app/post/[id].tsx
import { useLocalSearchParams } from 'expo-router';
export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>Post: {id}</Text>;
}
```

```tsx
// Programmatic navigation
import { useRouter, Link } from 'expo-router';
const router = useRouter();

<Link href="/about">About</Link>
<Link href={{ pathname: '/post/[id]', params: { id: '42' } }}>Post 42</Link>

router.push('/about');
router.replace('/login');
router.back();
router.dismiss();         // close modal
```

### Guarded Routes (SDK 53)

```tsx
// app/(protected)/_layout.tsx
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  return <Slot />;
}
```

### Auth Flow with useSegments

```tsx
import { useSegments, useRouter } from 'expo-router';
import { useEffect } from 'react';

export function useProtectedRoute(user: User | null) {
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/login');
    if (user && inAuth) router.replace('/');
  }, [user, segments]);
}
```

---

## 3. Core Components

All components from `react-native` unless noted.

| Component | Notes |
|-----------|-------|
| `View` | Flexbox container — `flexDirection` defaults to `column` |
| `Text` | All visible text must be inside `<Text>` |
| `ScrollView` | Full content rendered upfront — use for short lists only |
| `FlatList` | Virtualized — required for lists with >20 items |
| `SectionList` | FlatList with section headers |
| `Pressable` | Preferred touchable — `({ pressed }) => style` |
| `TouchableOpacity` | Legacy touchable — still common |
| `TextInput` | Use `onChangeText`, not `onChange` |
| `Image` | `source={require('./img.png')}` or `source={{ uri }}` |
| `ActivityIndicator` | Spinner |
| `Modal` | Full-screen overlay |
| `SafeAreaView` | Respects notches — prefer `useSafeAreaInsets()` |

```tsx
// FlatList pattern
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Row item={item} />}
  ItemSeparatorComponent={() => <View style={styles.sep} />}
  ListEmptyComponent={<Text>No results</Text>}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
/>

// Pressable with pressed state
<Pressable
  onPress={onPress}
  style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
>
  <Text>Tap me</Text>
</Pressable>
```

---

## 4. Styling

```tsx
import { StyleSheet, Platform, useWindowDimensions } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: {
    padding: 16,
    borderRadius: 8,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android shadow
    elevation: 3,
  },
});
```

**Flexbox — RN vs Web defaults:**

| Property | Web | React Native |
|----------|-----|--------------|
| `flexDirection` | `row` | `column` |
| `alignContent` | `stretch` | `flex-start` |
| `flexShrink` | `1` | `0` |

**Platform-specific:**

```tsx
// Inline
const paddingTop = Platform.OS === 'ios' ? 44 : 0;

// StyleSheet
const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4 },
    android: { elevation: 4 },
    default: {},
  }),
});

// File-based (RN resolves automatically)
// Button.ios.tsx / Button.android.tsx / Button.tsx
```

**Responsive:**

```tsx
// Reactive — updates on rotation
const { width } = useWindowDimensions();

// Static — does NOT update
import { Dimensions } from 'react-native';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
```

---

## 5. Navigation Patterns

### Stack Header Customization

```tsx
<Stack
  screenOptions={{
    headerStyle: { backgroundColor: '#007AFF' },
    headerTintColor: '#fff',
    headerBackTitleVisible: false,
  }}
>
  <Stack.Screen
    name="detail"
    options={{ title: 'Detail', headerRight: () => <SettingsIcon /> }}
  />
</Stack>
```

### Drawer Navigation

```bash
npx expo install @react-navigation/drawer react-native-gesture-handler react-native-reanimated
```

```tsx
// app/_layout.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer>
        <Drawer.Screen name="index" options={{ title: 'Home' }} />
        <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}
```

### Deep Linking

```json
// app.json
{
  "expo": {
    "scheme": "myapp",
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "autoVerify": true,
        "data": [{ "scheme": "https", "host": "myapp.com" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}
```

---

## 6. Native APIs

All installed with `npx expo install <package>`.

### expo-camera

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';

function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  if (!permission?.granted)
    return <Button onPress={requestPermission} title="Grant Camera" />;
  return <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={({ data }) => console.log(data)} />;
}
```

### expo-location

```tsx
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') return;
const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
```

### expo-notifications (Push)

```tsx
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = await Notifications.getExpoPushTokenAsync({ projectId: 'your-project-id' });
  return token.data;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});
```

### expo-haptics

```tsx
import * as Haptics from 'expo-haptics';
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

### expo-secure-store

```tsx
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('auth_token', token);
const token = await SecureStore.getItemAsync('auth_token');
await SecureStore.deleteItemAsync('auth_token');
```

### expo-file-system

```tsx
import * as FileSystem from 'expo-file-system';
// SDK 53: use expo-file-system/next for sync ops
const resumable = FileSystem.createDownloadResumable(url, FileSystem.documentDirectory + 'file.pdf');
const result = await resumable.downloadAsync();
```

### expo-image-picker

```tsx
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  allowsEditing: true,
  quality: 0.8,
});
if (!result.canceled) console.log(result.assets[0].uri);
```

---

## 7. Data Fetching

### TanStack Query (recommended)

```bash
npx expo install @tanstack/react-query
```

```tsx
// Wrap root in QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
// app/_layout.tsx: <QueryClientProvider client={queryClient}><Stack /></QueryClientProvider>

// In screens
const { data, isLoading } = useQuery({
  queryKey: ['posts'],
  queryFn: () => fetch('/api/posts').then(r => r.json()),
  staleTime: 5 * 60 * 1000,
});

const { mutate } = useMutation({
  mutationFn: (post: NewPost) => fetch('/api/posts', { method: 'POST', body: JSON.stringify(post) }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
});
```

### Offline with NetInfo

```bash
npx expo install @react-native-community/netinfo
```

```tsx
import NetInfo from '@react-native-community/netinfo';
const state = await NetInfo.fetch();
console.log('Connected:', state.isConnected);

const unsubscribe = NetInfo.addEventListener(state => {
  if (!state.isConnected) showOfflineBanner();
});
```

---

## 8. State Management

### Zustand with AsyncStorage Persistence

```bash
npm install zustand
npx expo install @react-native-async-storage/async-storage
```

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthStore = { token: string | null; setToken: (t: string | null) => void };

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({ token: null, setToken: (token) => set({ token }) }),
    { name: 'auth-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

### AsyncStorage (not localStorage)

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('key', JSON.stringify(value));
const raw = await AsyncStorage.getItem('key');
const value = raw ? JSON.parse(raw) : null;
await AsyncStorage.removeItem('key');
```

---

## 9. Development Builds vs Expo Go

| | Expo Go | Development Build |
|--|---------|------------------|
| Install | App Store | Build + sideload via EAS |
| Native modules | Expo SDK only | Any native module |
| Custom native code | No | Yes |
| Setup | Zero | `npx expo install expo-dev-client` + build |
| When | Prototyping | Production apps |

```bash
# Create a dev build
npx expo install expo-dev-client
eas build --profile development --platform ios
eas build --profile development --platform android

# Bare workflow (eject to native dirs)
npx expo prebuild        # generate ios/ and android/
npx expo prebuild --clean
npx expo run:ios         # build locally after prebuild
```

**You need a dev build when:**
- Adding any package with custom native code (`react-native-maps`, `react-native-ble-plx`, etc.)
- Testing push notifications end-to-end
- Any package requiring `pod install`

---

## 10. EAS (Expo Application Services)

### eas.json

```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "autoIncrement": true }
  },
  "submit": { "production": {} }
}
```

### Build + Submit

```bash
npm install -g eas-cli && eas login

eas build -p ios --profile production
eas build -p android --profile production
eas build -p all --profile production

eas submit -p ios --latest       # to TestFlight / App Store
eas submit -p android --latest   # to Google Play
```

### EAS Update (OTA — JS/assets only, no native changes)

```bash
npx expo install expo-updates
eas update --branch production --message "Fix login crash"
```

### Pricing (2025)

| Plan | Cost | Builds/mo | MAUs (OTA) | Concurrent |
|------|------|-----------|------------|------------|
| Free | $0 | 15 iOS + 15 Android | 1,000 | 1 (low priority) |
| Production | $199 | $225 credits | 50,000 | 2 (high priority) |
| Enterprise | $1,999+ | $1,000 credits | 1,000,000 | 5 |

---

## 11. Deployment

### app.json — Key Fields

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "version": "1.0.0",
    "scheme": "myapp",
    "icon": "./assets/icon.png",
    "ios": {
      "bundleIdentifier": "com.company.myapp",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": { "NSCameraUsageDescription": "Used for QR scanning." }
    },
    "android": {
      "package": "com.company.myapp",
      "versionCode": 1,
      "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#fff" }
    },
    "extra": { "eas": { "projectId": "your-project-id" } }
  }
}
```

### Stores

| | iOS App Store | Google Play |
|--|--------------|-------------|
| Developer fee | $99/year | $25 one-time |
| Beta distribution | TestFlight (10k testers) | Internal / Closed / Open tracks |
| Review time | 1–3 days | Hours–1 day |
| Build format | `.ipa` | `.aab` (preferred) |

`versionCode` (Android) must increment on every release. `buildNumber` (iOS) must also increment.

---

## 12. Common Mistakes

| Mistake | Fix |
|---------|-----|
| `flexDirection` defaults to `row` | RN defaults to `column` — horizontal layout needs explicit `flexDirection: 'row'` |
| Using `localStorage` | Use `AsyncStorage` from `@react-native-async-storage/async-storage` |
| DOM APIs (`document`, `window`, `getElementById`) | No DOM — use RN APIs, refs, or platform-safe libraries |
| `<div>`, `<span>`, `<p>` in JSX | Must use `<View>`, `<Text>`, `<ScrollView>` |
| Raw text strings outside `<Text>` | RN throws at runtime — all visible text must be in `<Text>` |
| `npm install expo-camera` | Always `npx expo install` — respects SDK version pinning |
| Custom native module in Expo Go | Requires a development build with `expo-dev-client` |
| Disabling New Architecture | SDK 52+ enables it by default — only opt out for unmaintained legacy modules |
| `onChange` on `TextInput` | Use `onChangeText` — `onChange` gives a synthetic event, not the string value |
| `width: '50%'` with flex layouts | Use `flex: 1` for proportional sizing or `useWindowDimensions` for percentage math |
| Skipping permission checks | Always request permissions before camera, location, or notifications — check `status` |
| Hardcoding screen dimensions | `Dimensions.get('window')` is static — use `useWindowDimensions()` for rotation support |
