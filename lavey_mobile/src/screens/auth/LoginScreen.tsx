import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GoogleLogoIcon } from '../../components/auth/GoogleLogoIcon';
import { AuthLayout } from './AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { isEmail } from '../../utils/validators';
import { storage } from '../../utils/storage';
import { theme } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { getGoogleIdToken } from '../../config/googleAuth';
import { googleSignInErrorMessage } from '../../utils/api/networkError';

export function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const { login, loginWithGoogle, signInPrompt, clearSignInPrompt } = useAuth();
  const [sessionEnded, setSessionEnded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonProgress = useSharedValue(1);

  useEffect(() => {
    googleButtonProgress.value = withTiming(googleLoading ? 0 : 1, {
      duration: googleLoading ? 70 : 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [googleButtonProgress, googleLoading]);

  const googleButtonStyle = useAnimatedStyle(() => ({
    opacity: googleButtonProgress.value,
    transform: [{ translateY: (1 - googleButtonProgress.value) * 10 }],
  }));

  useEffect(() => {
    // Drop any expired token before sign-in so login requests are not sent with stale auth headers.
    void storage.clearSession();
  }, []);

  useEffect(() => {
    if (!signInPrompt) return;
    setSessionEnded(true);
    clearSignInPrompt();
  }, [clearSignInPrompt, signInPrompt]);

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      await loginWithGoogle(idToken);
    } catch (error) {
      Alert.alert('Could not sign in with Google', googleSignInErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  const submit = async () => {
    if (!isEmail(email) || password.length < 6) {
      return Alert.alert('Check your details', 'Enter a valid email and a password of at least 6 characters.');
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    }
    catch (error) { Alert.alert('Could not sign in', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout subtitle={sessionEnded ? 'Welcome back — sign in to pick up where you left off' : 'Sign in to continue to Lavey'} legal loading={googleLoading} footer={
      <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8}>
        <Text style={styles.toggle}>
          New to Lavey? <Text style={styles.link}>Create an account</Text>
        </Text>
      </Pressable>
    }>
      <Animated.View style={googleButtonStyle}>
        <Pressable
          disabled={googleLoading}
          style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
          onPress={() => void signInWithGoogle()}
        >
          <GoogleLogoIcon size={19} />
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>
      </Animated.View>

      <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>OR</Text><View style={styles.line} /></View>

      <View style={styles.field}>
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          selectionColor={theme.colors.primary}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>PASSWORD</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            selectionColor={theme.colors.primary}
            style={[styles.input, styles.passwordInput]}
          />
          <Pressable style={styles.eye} onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#858A98" />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
        <Text style={styles.forgot}>Forgot password?</Text>
      </Pressable>

      <Pressable disabled={loading} onPress={submit} style={({ pressed }) => [styles.submitWrap, pressed && styles.pressed, loading && styles.disabled]}>
        <View style={styles.submit}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Sign in</Text>}
        </View>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  googleButton: { height: 42, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E2E8', shadowOpacity: 0, elevation: 0 },
  googleText: { fontFamily: theme.typography.semibold, fontSize: 13, color: '#111117' },
  divider: { height: 17, flexDirection: 'row', alignItems: 'center', gap: 11 },
  line: { flex: 1, height: 1, backgroundColor: '#D7D7DE' },
  or: { fontFamily: theme.typography.semibold, fontSize: 11, color: '#8A8A96' },
  field: { gap: 4 },
  label: { fontFamily: theme.typography.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.35, color: '#81818D' },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7D7DC', fontFamily: theme.typography.regular, fontSize: 14, color: '#08080D' },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 46, width: '100%' },
  eye: { position: 'absolute', right: 7, top: 4, width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  forgot: { textAlign: 'right', fontFamily: theme.typography.medium, fontSize: 12, color: '#5C3564' },
  submitWrap: { marginTop: 2, borderRadius: 10 },
  submit: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303034' },
  submitText: { fontFamily: theme.typography.bold, fontSize: 13, color: '#FFFFFF' },
  toggle: { marginTop: 9, textAlign: 'center', fontFamily: theme.typography.regular, fontSize: 11, color: '#3D3D4B' },
  link: { fontFamily: theme.typography.semibold, color: '#303034' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.65 },
});
