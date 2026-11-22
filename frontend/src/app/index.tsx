import { StyleSheet, Text, View } from 'react-native';

// Placeholder until Phase 4 (auth + home rollup).
export default function Home() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        PondoPal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
});
