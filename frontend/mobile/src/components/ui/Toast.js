import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay } from 'react-native-reanimated'
import { CheckCircle2, XCircle, Info } from 'lucide-react-native'
import { useTheme } from '../../theme'

// App-wide toast, replacing the ad-hoc `setToast({message, type})` + local <Toast/> each screen
// used to render individually. One instance mounted at the navigation root (see App.js); any
// screen calls useToast().show(...) instead of owning its own toast state.
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const opacity = useSharedValue(0)
  const timeoutRef = useRef(null)

  const show = useCallback((message, tone = 'success') => {
    setToast({ message, tone })
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    opacity.value = withSequence(withTiming(1, { duration: 180 }), withDelay(2200, withTiming(0, { duration: 220 })))
    timeoutRef.current = setTimeout(() => setToast(null), 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && <ToastView toast={toast} opacity={opacity} />}
    </ToastContext.Provider>
  )
}

function ToastView({ toast, opacity }) {
  const { colors, space, radius, type, shadow } = useTheme()
  const insets = useSafeAreaInsets()
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: (1 - opacity.value) * -8 }] }))

  const Icon = { success: CheckCircle2, error: XCircle, info: Info }[toast.tone] || Info
  const iconColor = { success: colors.success, error: colors.danger, info: colors.info }[toast.tone]

  return (
    <Animated.View
      pointerEvents='none'
      style={[
        styles.toast,
        animatedStyle,
        shadow('md'),
        { top: insets.top + space.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.border },
      ]}
    >
      <Icon size={18} color={iconColor} />
      <Text style={[type.bodyMedium, { color: colors.fg, marginLeft: space.sm, flex: 1 }]} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 16, right: 16, zIndex: 999,
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1,
  },
})
