import { createNavigationContainerRef } from '@react-navigation/native'

// Lets code outside the component tree (the push-notification response listener in
// hooks/useNotificationDeepLink.js) navigate without needing a navigation prop passed down to it.
export const navigationRef = createNavigationContainerRef()

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params)
  }
}
