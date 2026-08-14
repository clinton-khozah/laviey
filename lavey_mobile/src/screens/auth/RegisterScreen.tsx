import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthLayout } from './AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { isEmail, validatePassword } from '../../utils/validators';
import { theme } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

export function RegisterScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Register'>) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMismatchVisible, setPasswordMismatchVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !isEmail(email) || !validatePassword(password)) {
      return Alert.alert('Check your details', 'Add your name, a valid email, and a password of at least 6 characters.');
    }
    if (password !== confirmPassword) {
      setPasswordMismatchVisible(true);
      return;
    }
    setLoading(true);
    try {
      const result = await register(name.trim(), email.trim(), password);
      if (result.verificationEmail) navigation.navigate('Otp', { email: result.verificationEmail });
    } catch (error) {
      Alert.alert('Could not create account', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      subtitle="Join Lavey and complete your profile"
      legal
      footer={
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.footer}>Already have an account? <Text style={styles.link}>Sign in</Text></Text>
        </Pressable>
      }
    >
      <View style={styles.field}>
        <Text style={styles.label}>DISPLAY NAME</Text>
        <TextInput value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" style={styles.input} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <TextInput value={email} onChangeText={setEmail} autoComplete="email" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>PASSWORD</Text>
        <View style={styles.passwordWrap}>
          <TextInput value={password} onChangeText={setPassword} autoComplete="new-password" secureTextEntry={!showPassword} style={[styles.input, styles.passwordInput]} />
          <Pressable style={styles.eye} onPress={() => setShowPassword((value) => !value)} hitSlop={8} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#777780" />
          </Pressable>
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>CONFIRM PASSWORD</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoComplete="new-password"
            secureTextEntry={!showConfirmPassword}
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
            style={[styles.input, styles.passwordInput, confirmPassword.length > 0 && password !== confirmPassword && styles.inputError]}
          />
          <Pressable style={styles.eye} onPress={() => setShowConfirmPassword((value) => !value)} hitSlop={8} accessibilityLabel={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}>
            <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#777780" />
          </Pressable>
        </View>
        {confirmPassword.length > 0 && password !== confirmPassword ? <Text style={styles.errorText}>Passwords do not match.</Text> : null}
      </View>
      <Pressable disabled={loading} onPress={() => void submit()} style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Continue</Text>}
      </Pressable>

      <Modal
        visible={passwordMismatchVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPasswordMismatchVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalMark}><Text style={styles.modalMarkText}>!</Text></View>
            <Text style={styles.modalTitle}>Passwords do not match</Text>
            <Text style={styles.modalCopy}>Enter the same password in both fields before continuing.</Text>
            <Pressable
              onPress={() => setPasswordMismatchVisible(false)}
              style={({ pressed }) => [styles.modalButton, pressed && styles.pressed]}
            >
              <Text style={styles.modalButtonText}>Try again</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  field: { gap: 5 },
  label: { fontFamily: theme.typography.semibold, fontSize: 10, letterSpacing: 0.4, color: '#73737C' },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#D7D7DC', backgroundColor: '#FFFFFF', paddingHorizontal: 14, fontFamily: theme.typography.regular, fontSize: 14, color: '#18181B' },
  passwordWrap: { position: 'relative' },
  passwordInput: { width: '100%', paddingRight: 48 },
  eye: { position: 'absolute', right: 6, top: 4, width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  inputError: { borderColor: '#9E3F48' },
  errorText: { fontFamily: theme.typography.regular, fontSize: 10.5, color: '#9E3F48', marginTop: 1 },
  button: { height: 48, borderRadius: 10, backgroundColor: '#303034', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontFamily: theme.typography.semibold, fontSize: 14 },
  footer: { marginTop: 20, textAlign: 'center', fontFamily: theme.typography.regular, fontSize: 12, color: '#55555E' },
  link: { color: '#303034', fontFamily: theme.typography.semibold },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.6 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(18,18,20,0.4)' },
  modalCard: { width: '100%', maxWidth: 340, borderRadius: 18, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 26, paddingBottom: 22, alignItems: 'center' },
  modalMark: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F1F2', marginBottom: 16 },
  modalMarkText: { fontFamily: theme.typography.bold, fontSize: 20, color: '#303034' },
  modalTitle: { fontFamily: theme.typography.bold, fontSize: 18, color: '#202024', textAlign: 'center' },
  modalCopy: { marginTop: 9, fontFamily: theme.typography.regular, fontSize: 12.5, lineHeight: 19, color: '#686870', textAlign: 'center' },
  modalButton: { width: '100%', height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303034', marginTop: 22 },
  modalButtonText: { fontFamily: theme.typography.semibold, fontSize: 13.5, color: '#FFFFFF' },
});
