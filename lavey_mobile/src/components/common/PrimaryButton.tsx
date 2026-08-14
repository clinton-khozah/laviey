import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { theme } from '../../constants/theme';
export function PrimaryButton({ label, loading, ...props }: PressableProps & { label: string; loading?: boolean }) {
  return <Pressable {...props} disabled={props.disabled || loading} style={({ pressed }) => [styles.button, pressed && styles.pressed, (props.disabled || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.label}>{label}</Text>}</Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: 52, paddingHorizontal: 24, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadow }, pressed: { transform: [{ scale: 0.98 }], backgroundColor: theme.colors.primaryDark }, disabled: { opacity: 0.55 }, label: { color: theme.colors.white, fontFamily: theme.typography.semibold, fontSize: 16 } });
