import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../../constants/theme';

type LegalDocument = 'terms' | 'privacy';

type Props = PropsWithChildren<{
  title?: string;
  subtitle: string;
  footer?: ReactNode;
  legal?: boolean;
  loading?: boolean;
  onBack?: () => void;
}>;

const TERMS = [
  ['Eligibility', 'You must be at least 18 years old and legally able to enter into this agreement to use Lavey.'],
  ['Your account', 'Provide accurate information, keep your login secure and use only one account that belongs to you. You are responsible for activity on your account.'],
  ['Respect and safety', 'Treat others respectfully. Harassment, threats, hate, impersonation, scams, exploitation and illegal content are prohibited. Report concerning behaviour and use care when meeting someone in person.'],
  ['Your content', 'You keep ownership of your photos, posts and messages. You give Lavey permission to host and display content as needed to operate the service. Only upload content you have the right to share.'],
  ['Service and enforcement', 'Lavey may remove content or suspend accounts that breach these terms or put people at risk. Features may change as the service improves.'],
  ['Contact', 'Questions about these terms can be sent to support@lavey.co.za. These terms are governed by the laws of South Africa.'],
] as const;

const PRIVACY = [
  ['Information we use', 'We use account details, profile information, photos, messages, approximate location and app activity to provide matching, discovery, communication and safety features.'],
  ['How it is used', 'Information is used to operate and secure Lavey, personalise discovery, prevent abuse, provide support and improve the service.'],
  ['Sharing', 'We do not sell your personal information. Information may be processed by trusted service providers or disclosed where required for safety, fraud prevention or law.'],
  ['Your choices', 'You can update profile information in the app and request access to or deletion of your data through Settings or support@lavey.co.za.'],
] as const;

export function AuthLayout({ title, subtitle, children, footer, legal = false, loading = false, onBack }: Props) {
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const sections = legalDocument === 'privacy' ? PRIVACY : TERMS;
  const loadingProgress = useSharedValue(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadingProgress.value = withTiming(loading ? 1 : 0, {
      duration: loading ? 220 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [loading, loadingProgress]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: loadingProgress.value * 150 },
      { scale: 1 + loadingProgress.value * 0.28 },
    ],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - loadingProgress.value * 3.2),
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: 1 - loadingProgress.value,
    transform: [{ translateY: loadingProgress.value * 88 }],
  }));

  return (
    <View style={styles.root}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={[styles.backButton, { top: insets.top + 8 }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#18181B" />
        </Pressable>
      ) : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.header} accessibilityLabel="Lavey">
            <Animated.Image source={require('../../../assets/heart-tight.png')} resizeMode="contain" style={[styles.brandImage, logoStyle]} />
            <Animated.Text style={[styles.tagline, taglineStyle]}>{subtitle}</Animated.Text>
          </View>
          <Animated.View style={[styles.card, formStyle]} pointerEvents={loading ? 'none' : 'auto'}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            <View style={styles.form}>{children}</View>
            {footer}
          </Animated.View>
          {legal ? (
            <Animated.View style={formStyle} pointerEvents={loading ? 'none' : 'auto'}>
              <Text style={styles.legal}>
                By continuing, you agree to our{' '}
                <Text style={styles.legalLink} onPress={() => setLegalDocument('terms')}>Terms & Conditions</Text>
                {' '}and acknowledge our{' '}
                <Text style={styles.legalLink} onPress={() => setLegalDocument('privacy')}>Privacy Policy</Text>.
              </Text>
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={legalDocument !== null} animationType="slide" transparent onRequestClose={() => setLegalDocument(null)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{legalDocument === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}</Text>
              <Pressable style={styles.closeButton} onPress={() => setLegalDocument(null)} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color="#27272A" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.updated}>Effective August 2026</Text>
              {sections.map(([heading, body]) => (
                <View key={heading} style={styles.legalSection}>
                  <Text style={styles.sectionTitle}>{heading}</Text>
                  <Text style={styles.sectionBody}>{body}</Text>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  backButton: { position: 'absolute', left: 16, zIndex: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 28 },
  header: { width: '100%', alignItems: 'center', marginBottom: 28 },
  brandImage: { width: 68, height: 68, marginBottom: 14 },
  tagline: { fontFamily: theme.typography.regular, fontSize: 14, lineHeight: 20, color: '#5F5F68', textAlign: 'center' },
  card: { width: '100%', maxWidth: 380 },
  title: { fontFamily: theme.typography.bold, fontSize: 23, lineHeight: 30, color: '#18181B', textAlign: 'left', marginBottom: 20 },
  form: { gap: 14 },
  legal: { marginTop: 14, maxWidth: 310, textAlign: 'center', fontFamily: theme.typography.regular, fontSize: 10, lineHeight: 16, color: '#85858E' },
  legalLink: { fontFamily: theme.typography.semibold, color: '#303034', textDecorationLine: 'underline' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.34)' },
  modalSheet: { height: '78%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  modalHeader: { minHeight: 62, paddingLeft: 22, paddingRight: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DFDFE3' },
  modalTitle: { flex: 1, fontFamily: theme.typography.bold, fontSize: 19, color: '#18181B' },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 36 },
  updated: { fontFamily: theme.typography.medium, fontSize: 11, color: '#87878F', marginBottom: 8 },
  legalSection: { marginTop: 18 },
  sectionTitle: { fontFamily: theme.typography.semibold, fontSize: 14, color: '#232327', marginBottom: 6 },
  sectionBody: { fontFamily: theme.typography.regular, fontSize: 12.5, lineHeight: 19, color: '#5E5E67' },
});
