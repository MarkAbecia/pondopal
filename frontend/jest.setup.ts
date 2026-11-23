// Screens read safe-area insets; tests render without a SafeAreaProvider.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can't use import
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
