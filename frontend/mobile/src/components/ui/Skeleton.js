import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated'
import { useTheme } from '../../theme'

// Every screen's loading state (see the "skeleton -> content -> empty/error" rule in the design
// doc) is built from this instead of a spinner — a shimmering placeholder of roughly the right
// shape reads as faster and is what makes the app feel considered rather than just "waiting".
export function Skeleton({ width = '100%', height = 16, radius: r, style }) {
  const { colors, radius } = useTheme()
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: r ?? radius.sm, backgroundColor: colors.surface3 },
        animatedStyle,
        style,
      ]}
    />
  )
}

export function SkeletonRow({ style }) {
  const { space } = useTheme()
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md }, style]}>
      <Skeleton width={40} height={40} radius={20} />
      <View style={{ flex: 1, marginLeft: space.md }}>
        <Skeleton width='60%' height={14} style={{ marginBottom: 6 }} />
        <Skeleton width='40%' height={12} />
      </View>
    </View>
  )
}
