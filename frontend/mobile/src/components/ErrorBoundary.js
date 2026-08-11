import { Component } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme'
import ErrorState from './ui/ErrorState'

// Nothing caught render-phase errors before this. A single bad value in a single list row — e.g.
// the `distanceKm.toFixed is not a function` crash this shipped with — unmounted the entire React
// tree, which in a release build is a white screen with no way back. React only recovers from a
// render throw if a class component above it implements getDerivedStateFromError, so this exists
// specifically as the app's backstop.
//
// Mounted inside ThemeProvider (see App.js) rather than outside it, so the fallback can use the
// themed <ErrorState/> the rest of the app already uses instead of unstyled text.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // No crash reporter is wired up yet (no Sentry/Bugsnag in this project). Logging at least
    // surfaces the stack in `npx expo start` and in device logs; swap this for a reporter call
    // when one is added — it's the single place that needs to change.
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    return <Fallback error={this.state.error} onReset={this.reset} />
  }
}

// Split out as a function component so it can read useTheme() for the canvas colour — ErrorState
// itself draws no background, and the boundary replaces a whole screen, so without one the
// fallback would render over whatever the crashed screen left behind.
function Fallback({ error, onReset }) {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ErrorState
        title='Something went wrong'
        message={error?.message || 'The app hit an unexpected error.'}
        onRetry={onReset}
      />
    </View>
  )
}
