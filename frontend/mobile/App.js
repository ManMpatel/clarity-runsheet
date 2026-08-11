import { useCallback, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import RootNavigator from './src/navigation'
import { navigationRef } from './src/navigation/navigationRef'
import { ThemeProvider, useTheme, interFonts } from './src/theme'
import { ToastProvider } from './src/components/ui'
import ErrorBoundary from './src/components/ErrorBoundary'

SplashScreen.preventAutoHideAsync().catch(() => {})

function Root() {
  const { scheme, colors } = useTheme()

  // react-navigation's own theme controls the native screen background shown briefly during
  // stack transitions and the default header/tab bar chrome color if a screen doesn't override
  // it — keeping it in sync with our own ThemeProvider avoids a light-mode flash on a dark-mode
  // screen transition.
  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.canvas,
      card: colors.surface,
      border: colors.border,
      text: colors.fg,
      primary: colors.accent,
    },
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  )
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(interFonts)

  const onLayout = useCallback(async () => {
    if (fontsLoaded || fontError) await SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  useEffect(() => { onLayout() }, [onLayout])

  if (!fontsLoaded && !fontError) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Inside ThemeProvider so the crash fallback can use the themed <ErrorState/>, and
            outside the navigator so a render throw anywhere in any screen is caught. */}
        <ThemeProvider>
          <ErrorBoundary>
            <BottomSheetModalProvider>
              <ToastProvider>
                <Root />
              </ToastProvider>
            </BottomSheetModalProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
