import { StyleSheet, TextInput } from "react-native";
import { theme } from "../../../constants/theme";

// This project's Supabase email OTPs are 8 digits (customized from the 6-digit default).
export const OTP_LENGTH = 8;

export function OtpCodeInput({
  value,
  onChange,
  onSubmitEditing,
  editable = true,
  autoFocus = true,
  error = false,
}: {
  value: string;
  onChange(value: string): void;
  onSubmitEditing?(): void;
  editable?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, OTP_LENGTH))}
      onSubmitEditing={onSubmitEditing}
      keyboardType="number-pad"
      maxLength={OTP_LENGTH}
      autoFocus={autoFocus}
      editable={editable}
      textContentType="oneTimeCode"
      autoComplete="sms-otp"
      importantForAutofill="yes"
      selectTextOnFocus
      placeholder={"•".repeat(OTP_LENGTH)}
      placeholderTextColor="#C9C6D0"
      style={[styles.input, error && styles.inputError]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D7D7DC",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    fontFamily: theme.typography.bold,
    fontSize: 24,
    letterSpacing: 8,
    color: "#19171E",
  },
  inputError: { borderColor: "#EF4444" },
});
