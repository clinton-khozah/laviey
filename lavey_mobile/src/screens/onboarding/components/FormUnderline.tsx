import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";

type UnderlineTextInputProps = Omit<TextInputProps, "style"> & {
  containerStyle?: StyleProp<ViewStyle>;
};

export function UnderlineTextInput({
  containerStyle,
  value,
  onFocus,
  onBlur,
  ...props
}: UnderlineTextInputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <TextInput
        {...props}
        value={value}
        style={styles.input}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor="#B8B4BE"
        selectionColor="#303034"
      />
      <View style={[styles.line, (focused || hasValue) && styles.lineActive]} />
    </View>
  );
}

export function UnderlineSelectTrigger({
  label,
  placeholder,
  value,
  disabled,
  loading,
  active,
  onPress,
  containerStyle,
}: {
  label?: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
  onPress(): void;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const hasValue = value.length > 0;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.selectRow, (disabled || loading) && styles.selectDisabled, pressed && styles.selectPressed]}
        disabled={disabled || loading}
        onPress={onPress}
      >
        <Text style={[styles.selectText, !hasValue && styles.selectPlaceholder]} numberOfLines={1}>
          {hasValue ? value : placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#8F8B93" />
        ) : (
          <Ionicons name="chevron-down" size={18} color="#8F8B93" />
        )}
      </Pressable>
      <View style={[styles.line, (active || hasValue) && styles.lineActive, disabled && styles.lineDisabled]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 300,
    marginBottom: 28,
  },
  label: {
    fontFamily: theme.typography.semibold,
    fontSize: 10.5,
    color: "#9B98A1",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    textAlign: "center",
  },
  input: {
    width: "100%",
    paddingHorizontal: 4,
    paddingVertical: 10,
    fontFamily: theme.typography.semibold,
    fontSize: 18,
    color: "#141218",
    textAlign: "center",
    letterSpacing: -0.2,
    backgroundColor: "transparent",
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 10,
    gap: 8,
  },
  selectDisabled: { opacity: 0.45 },
  selectPressed: { opacity: 0.8 },
  selectText: {
    flex: 1,
    fontFamily: theme.typography.semibold,
    fontSize: 18,
    color: "#141218",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  selectPlaceholder: {
    fontFamily: theme.typography.medium,
    color: "#B8B4BE",
  },
  line: {
    height: 1.5,
    backgroundColor: "#D8D4DC",
    borderRadius: 1,
  },
  lineActive: {
    backgroundColor: "#303034",
  },
  lineDisabled: {
    backgroundColor: "#E8E5EB",
  },
});
