import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { theme } from '../../constants/theme';
export function SecondaryButton({ label, ...props }: PressableProps & { label: string }) { return <Pressable {...props} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.label}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ button: { minHeight: 52, paddingHorizontal: 24, borderRadius: theme.radii.pill, borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }, pressed: { backgroundColor: theme.colors.primarySoft }, label: { color: theme.colors.primary, fontFamily: theme.typography.semibold, fontSize: 16 } });
