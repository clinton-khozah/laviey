import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from './AuthLayout';
import { OTP_LENGTH, OtpCodeInput } from './components/OtpCodeInput';
import { authApi } from '../../api/services';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

const CODE_TTL_SECONDS = 10 * 60;

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function OtpVerificationScreen({ route, navigation }: NativeStackScreenProps<AuthStackParamList, 'Otp'>) {
  const { email } = route.params;
  const { verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeSentVisible, setCodeSentVisible] = useState(false);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + CODE_TTL_SECONDS * 1000);
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL_SECONDS);
  const submittedRef = useRef(false);

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const expired = secondsLeft <= 0;

  const handleChangeCode = useCallback((next: string) => {
    setErrorMessage(null);
    setCode(next);
  }, []);

  const submit = useCallback(async () => {
    if (code.length < OTP_LENGTH || loading) return;
    submittedRef.current = true;
    setLoading(true);
    try {
      await verifyOtp(email, code);
    } catch (e) {
      // Inline red text instead of a blocking Alert — clear the boxes so the
      // user can immediately retype rather than deleting each digit by hand.
      setErrorMessage(e instanceof Error ? e.message : 'Invalid verification code. Please try again.');
      setCode('');
      submittedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [code, email, loading, verifyOtp]);

  useEffect(() => {
    if (code.length === OTP_LENGTH && !submittedRef.current) {
      void submit();
    }
    if (code.length < OTP_LENGTH) {
      submittedRef.current = false;
    }
  }, [code, submit]);

  const resend = useCallback(async () => {
    setResending(true);
    setErrorMessage(null);
    try {
      await authApi.resendOtp(email);
      setCode('');
      setExpiresAt(Date.now() + CODE_TTL_SECONDS * 1000);
      setCodeSentVisible(true);
    } catch (e) {
      Alert.alert('Could not resend', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setResending(false);
    }
  }, [email]);

  return (
    <AuthLayout subtitle="Verify your email" onBack={() => navigation.goBack()}>
      <Text style={styles.heading}>Enter the code we sent to</Text>
      <Text style={styles.email}>{email}</Text>
      <Text style={styles.autofillHint}>If your device detects the code, it will appear above your keyboard for quick autofill.</Text>

      <OtpCodeInput
        value={code}
        onChange={handleChangeCode}
        onSubmitEditing={() => void submit()}
        editable={!loading}
        error={Boolean(errorMessage)}
      />

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : expired ? (
        <Text style={styles.expiredText}>This code has expired — request a new one below.</Text>
      ) : (
        <Text style={styles.timerText}>
          Code expires in <Text style={styles.timerValue}>{formatCountdown(secondsLeft)}</Text>
        </Text>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.verifyWrap,
          pressed && styles.verifyPressed,
          (code.length < OTP_LENGTH || loading || expired) && styles.verifyDisabled,
        ]}
        disabled={code.length < OTP_LENGTH || loading || expired}
        onPress={() => void submit()}
      >
        <View style={styles.verify}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.verifyText}>Verify email</Text>}
        </View>
      </Pressable>

      <Pressable onPress={() => void resend()} disabled={resending || loading} style={({ pressed }) => [styles.resendWrap, pressed && styles.resendPressed, (resending || loading) && styles.resendDisabled]} hitSlop={10}>
        {resending ? (
          <Text style={styles.resendStatus}>Sending new code…</Text>
        ) : (
          <Text style={styles.resend}>{expired ? 'Send a new code' : 'Resend code'}</Text>
        )}
      </Pressable>

      <Modal
        visible={codeSentVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setCodeSentVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard} accessibilityViewIsModal>
            <View style={styles.confirmationMark}>
              <Text style={styles.confirmationCheck}>✓</Text>
            </View>
            <Text style={styles.confirmationTitle}>New code sent</Text>
            <Text style={styles.confirmationCopy}>
              Check your inbox at <Text style={styles.confirmationEmail}>{email}</Text> for your new verification code.
            </Text>
            <Pressable
              onPress={() => setCodeSentVisible(false)}
              style={({ pressed }) => [styles.confirmationButton, pressed && styles.confirmationButtonPressed]}
            >
              <Text style={styles.confirmationButtonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: { textAlign: 'center', fontFamily: theme.typography.medium, fontSize: 13, color: '#66666F' },
  email: { textAlign: 'center', fontFamily: theme.typography.semibold, fontSize: 14, color: '#232327', marginTop: -9 },
  autofillHint: { textAlign: 'center', fontFamily: theme.typography.regular, fontSize: 10.5, lineHeight: 15, color: '#92929A', marginBottom: 5 },
  timerText: {
    textAlign: 'center',
    marginTop: 16,
    fontFamily: theme.typography.regular,
    fontSize: 13,
    color: '#6B6771',
  },
  timerValue: { fontFamily: theme.typography.bold, color: '#19171E' },
  expiredText: {
    textAlign: 'center',
    marginTop: 16,
    fontFamily: theme.typography.semibold,
    fontSize: 13,
    color: '#E23B3B',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 16,
    fontFamily: theme.typography.semibold,
    fontSize: 13,
    color: '#EF4444',
  },
  verifyWrap: {
    marginTop: 22,
    borderRadius: 10,
  },
  verifyPressed: { transform: [{ scale: 0.98 }] },
  verifyDisabled: { opacity: 0.4 },
  verify: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303034' },
  verifyText: { fontFamily: theme.typography.semibold, fontSize: 14, color: 'white' },
  resendWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingHorizontal: 4, paddingVertical: 8, backgroundColor: 'transparent', borderWidth: 0, elevation: 0, shadowOpacity: 0 },
  resend: { color: '#303034', fontFamily: theme.typography.semibold, fontSize: 13 },
  resendStatus: { color: '#777780', fontFamily: theme.typography.regular, fontSize: 12.5 },
  resendPressed: { opacity: 0.55 },
  resendDisabled: { opacity: 0.6 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(18,18,20,0.38)' },
  confirmationCard: { width: '100%', maxWidth: 340, borderRadius: 18, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 26, paddingBottom: 22, alignItems: 'center' },
  confirmationMark: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F1F2', marginBottom: 16 },
  confirmationCheck: { fontFamily: theme.typography.semibold, fontSize: 21, color: '#303034' },
  confirmationTitle: { fontFamily: theme.typography.bold, fontSize: 18, color: '#202024', textAlign: 'center' },
  confirmationCopy: { marginTop: 9, fontFamily: theme.typography.regular, fontSize: 12.5, lineHeight: 19, color: '#686870', textAlign: 'center' },
  confirmationEmail: { fontFamily: theme.typography.semibold, color: '#303034' },
  confirmationButton: { width: '100%', height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303034', marginTop: 22 },
  confirmationButtonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  confirmationButtonText: { fontFamily: theme.typography.semibold, fontSize: 13.5, color: '#FFFFFF' },
});
