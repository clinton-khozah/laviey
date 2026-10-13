import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthLayout } from './AuthLayout';
import { LanguagePickerButton } from '../../components/language/LanguagePickerButton';
import { useLanguage } from '../../context/LanguageContext';
import { loginCopyFor } from '../../i18n/loginCopy';
import { theme } from '../../constants/theme';
import { isEmail } from '../../utils/validators';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

export function ForgotPasswordScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>) {
  const { language, setLanguage } = useLanguage();
  const copy = loginCopyFor(language);
  const [email, setEmail] = useState('');

  const submit = () => {
    if (!isEmail(email)) return Alert.alert('Email required', 'Enter a valid email address.');
    Alert.alert('Recovery not enabled yet', 'The shared Lavey backend does not currently expose a password-recovery endpoint. Please contact support or add the endpoint before release.');
  };

  return (
    <AuthLayout
      showPoweredBy
      poweredByLabel={copy.poweredBy}
      subtitle="Enter the email connected to your Lavey account."
      onBack={() => navigation.goBack()}
      headerRight={<LanguagePickerButton language={language} title={copy.chooseLanguage} onSelect={(code) => void setLanguage(code)} />}
      footer={
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.toggle}>
            Remembered it? <Text style={styles.link}>Sign in</Text>
          </Text>
        </Pressable>
      }
    >
      <Text style={styles.heading}>Reset password</Text>
      <View style={styles.field}>
        <Text style={styles.label}>{copy.email}</Text>
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
      <Pressable onPress={submit} style={({ pressed }) => [styles.submitWrap, pressed && styles.pressed]}>
        <View style={styles.submit}>
          <Text style={styles.submitText}>Send reset link</Text>
        </View>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: theme.typography.bold, fontSize: 16, lineHeight: 22, color: '#18181B' },
  field: { gap: 4 },
  label: { fontFamily: theme.typography.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.35, color: '#81818D' },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7D7DC', fontFamily: theme.typography.regular, fontSize: 14, color: '#08080D' },
  submitWrap: { marginTop: 2, borderRadius: 10 },
  submit: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303034' },
  submitText: { fontFamily: theme.typography.bold, fontSize: 13, color: '#FFFFFF' },
  toggle: { marginTop: 9, textAlign: 'center', fontFamily: theme.typography.regular, fontSize: 11, color: '#3D3D4B' },
  link: { fontFamily: theme.typography.semibold, color: '#303034' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
});
