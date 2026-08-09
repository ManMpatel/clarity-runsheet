import { Component } from 'react'
import ErrorState from '../ui/ErrorState'

/**
 * Wraps <Outlet/> so one page throwing during render doesn't take down the whole shell (sidebar,
 * topbar, nothing worked before this — a render error anywhere blanked the entire app). Keyed on
 * pathname by the caller so navigating away from the broken page resets the boundary.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Page render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className='p-6'>
          <ErrorState
            title='This page failed to load'
            message='Something went wrong rendering this page. Try again, or head back to the dashboard.'
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      )
    }
    return this.props.children
  }
}
