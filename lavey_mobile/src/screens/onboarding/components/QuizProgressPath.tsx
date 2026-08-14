import { StyleSheet, View } from "react-native";

export function QuizProgressPath({ total, currentIndex }: { total: number; currentIndex: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <View key={index} style={styles.segment}>
            <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]} />
            {index < total - 1 ? (
              <View style={[styles.line, (done || active) && styles.lineDone]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flex: 1 },
  segment: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ECE9ED" },
  dotDone: { backgroundColor: "#FF5C7A" },
  dotActive: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#FF5C7A",
    shadowColor: "#FF5C7A",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  line: { flex: 1, height: 2, backgroundColor: "#ECE9ED", marginHorizontal: 3, borderRadius: 1 },
  lineDone: { backgroundColor: "#FF5C7A" },
});
