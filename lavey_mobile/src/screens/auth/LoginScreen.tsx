import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GoogleLogoIcon } from '../../components/auth/GoogleLogoIcon';
import { LanguagePickerButton } from '../../components/language/LanguagePickerButton';
import { AuthLayout } from './AuthLayout';
import { useSignInLoader } from '../../components/auth/SignInHeartOverlay';
import { useLanguage } from '../../context/LanguageContext';
import { loginCopyFor } from '../../i18n/loginCopy';
import { ApiError } from '../../api/apiError';
import { useAuth } from '../../hooks/useAuth';
import { isEmail } from '../../utils/validators';
import { theme } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { getGoogleIdToken } from '../../config/googleAuth';
import { googleSignInErrorMessage } from '../../utils/api/networkError';

const GOOGLE_SIGN_IN_TIMEOUT_MS = 45_000;

export function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const { login, loginWithGoogle, signInPrompt, clearSignInPrompt } = useAuth();
  const { start: startSignInLoader, finish: finishSignInLoader } = useSignInLoader();
  const { language, setLanguage } = useLanguage();
  const copy = loginCopyFor(language);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);
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
    if (!signInPrompt) return;
    setSessionEnded(true);
    clearSignInPrompt();
  }, [clearSignInPrompt, signInPrompt]);

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    startSignInLoader();
    await new Promise((resolve) => setTimeout(resolve, 220));
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) {
        finishSignInLoader();
        setGoogleLoading(false);
        return;
      }
      await Promise.race([
        loginWithGoogle(idToken),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Sign-in is taking too long. Check your connection and try again.')),
            GOOGLE_SIGN_IN_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (error) {
      finishSignInLoader();
      setGoogleLoading(false);
      console.warn('[google-sign-in]', error);
      Alert.alert('Could not sign in with Google', googleSignInErrorMessage(error));
    }
  };

  const submit = async () => {
    setCredentialError(null);
    if (!isEmail(email) || password.length < 6) {
      return Alert.alert(copy.checkTitle, copy.checkBody);
    }
    startSignInLoader();
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      finishSignInLoader();
      const message = error instanceof Error ? error.message : "";
      const status = error instanceof ApiError ? error.status : undefined;
      const code = error instanceof ApiError ? error.code : undefined;
      if (status === 401 && code !== "EMAIL_CONFIRMATION_REQUIRED") {
        setCredentialError(copy.credentialError);
      } else {
        Alert.alert(copy.failedTitle, message || "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      showPoweredBy
      poweredByLabel={copy.poweredBy}
      subtitle={sessionEnded ? copy.welcomeBack : copy.continue}
      legal
      legalCopy={{ lead: copy.legalLead, terms: copy.terms, join: copy.legalJoin, privacy: copy.privacy }}
      loading={loading || googleLoading}
      headerRight={<LanguagePickerButton language={language} title={copy.chooseLanguage} onSelect={(code) => void setLanguage(code)} />}
      footer={
      <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8}>
        <Text style={styles.toggle}>
          {copy.newTo} <Text style={styles.link}>{copy.createAccount}</Text>
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
        <Text style={styles.label}>{copy.email}</Text>
        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (credentialError) setCredentialError(null);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          selectionColor={theme.colors.primary}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{copy.password}</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (credentialError) setCredentialError(null);
            }}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            selectionColor={theme.colors.primary}
            style={[styles.input, styles.passwordInput]}
          />
          <Pressable style={styles.eye} onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#858A98" />
          </Pressable>
        </View>
        {credentialError ? <Text style={styles.credentialError}>{credentialError}</Text> : null}
      </View>

      <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
        <Text style={styles.forgot}>{copy.forgot}</Text>
      </Pressable>

      <Pressable disabled={loading} onPress={submit} style={({ pressed }) => [styles.submitWrap, pressed && styles.pressed, loading && styles.disabled]}>
        <View style={styles.submit}>
          <Text style={styles.submitText}>{copy.signIn}</Text>
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
  credentialError: { marginTop: 6, fontFamily: theme.typography.regular, fontSize: 12, lineHeight: 16, color: theme.colors.danger },
  forgot: { textAlign: 'right', fontFamily: theme.typography.medium, fontSize: 12, color: '#5C3564' },
  submitWrap: { marginTop: 2, borderRadius: 10 },
  submit: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303034' },
  submitText: { fontFamily: theme.typography.bold, fontSize: 13, color: '#FFFFFF' },
  toggle: { marginTop: 9, textAlign: 'center', fontFamily: theme.typography.regular, fontSize: 11, color: '#3D3D4B' },
  link: { fontFamily: theme.typography.semibold, color: '#303034' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.65 },
});
