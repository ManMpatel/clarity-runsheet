// Was app.json. Converted to JS because static JSON cannot read environment variables, and the
// Android Google Maps key has to come from one — it was previously the literal placeholder string
// "EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY_GOES_HERE", which meant every Android build shipped with
// blank grey map tiles.
//
// Env values are read at build time from .env (local) or eas.json's per-profile `env` block
// (EAS builds). See .env.example for what each one is.

const EAS_PROJECT_ID = '4f46da0b-01ed-491e-9f9e-9faeadd451fc'
const BUNDLE_ID = 'au.com.claritysoftware.fleet'

module.exports = {
  expo: {
    name: 'Clarity Fleet',
    slug: 'mobile',
    version: '1.0.0',
    scheme: 'claritydriver',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: BUNDLE_ID,
      userInterfaceStyle: 'automatic',
      infoPlist: {
        // Without this, every TestFlight/App Store upload stalls waiting on a manual export
        // compliance questionnaire. The app uses only standard HTTPS/TLS, which is exempt.
        ITSAppUsesNonExemptEncryption: false,
      },
      // iOS deliberately renders Apple Maps, not Google Maps — see the Platform.OS branch in
      // screens/main/MapScreen.js. That's why there's no ios.config.googleMapsApiKey here: adding
      // one would silently switch iOS onto the Google provider and require a second billed key.
    },

    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0B0B0F',
      },
      edgeToEdgeEnabled: true,
      userInterfaceStyle: 'automatic',
      package: BUNDLE_ID,
      permissions: ['RECEIVE_BOOT_COMPLETED', 'VIBRATE', 'POST_NOTIFICATIONS'],
      googleServicesFile: './google-services.json',
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY,
        },
      },
    },

    web: {
      favicon: './assets/favicon.png',
    },

    plugins: [
      'expo-secure-store',
      '@react-native-google-signin/google-signin',
      // iOS only — Android keeps Google Sign-In. Required by App Store Guideline 4.8 whenever a
      // third-party social login is offered.
      'expo-apple-authentication',
      ['expo-notifications', {
        icon: './assets/icon.png',
        color: '#ffffff',
        sounds: [],
      }],
      ['expo-splash-screen', {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0B0B0F',
        dark: { backgroundColor: '#0B0B0F' },
      }],
    ],

    extra: {
      eas: { projectId: EAS_PROJECT_ID },
    },
  },
}
