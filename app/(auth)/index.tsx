import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert, ScrollView, useColorScheme } from 'react-native';
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { User, Mail, Lock } from 'lucide-react-native';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';
import { AuthInput } from '../../components/ui/AuthInput';
import { FlipCard } from '../../components/ui/FlipCard';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../styles/colors';
import { db } from '../../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  useWarmUpBrowser();
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const [isFlipped, setIsFlipped] = useState(mode === 'signup');
  const [loading, setLoading] = useState(false);

  // States
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  useEffect(() => {
    setIsFlipped(mode === 'signup');
  }, [mode]);

  // 1. Storage Services
  const saveUserToFirebase = async (userId: string, email: string, fName: string, lName: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      // ONLY save if user doesn't already exist to preserve past data
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email,
          firstName: fName,
          lastName: lName,
          createdAt: new Date().toISOString(),
          role: 'user',
        });
      }
    } catch (error) {
      console.error("Error saving to Firebase:", error);
    }
  };

  // 2. Authentication Actions
  const onSignInPress = async () => {
    if (!isSignInLoaded) return;
    setLoading(true);
    try {
      // First, if there's any active but incomplete sign in flow, we don't care, we create a new attempt
      const completeSignIn = await signIn.create({ identifier: emailAddress, password });
      
      if (completeSignIn.status === 'complete') {
        await setSignInActive({ session: completeSignIn.createdSessionId });
        // The Root layout observer (_layout.tsx) will automatically route to '/' or '/onboarding'
      } else {
        Alert.alert("Sign In Incomplete", "Further action required (e.g. 2FA).");
      }
    } catch (err: any) {
      if (err.errors && err.errors[0].code === 'session_exists') {
        router.replace('/');
      } else {
        Alert.alert('Sign In Failed', err.errors ? err.errors[0].message : err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSignUpPress = async () => {
    if (!isSignUpLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ firstName, lastName, emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      if (err.errors && err.errors[0].code === 'form_identifier_exists') {
        Alert.alert('Account Exists', 'This email is already registered. Please Sign In instead.');
        setIsFlipped(false); // Flip back to Sign In automatically
      } else {
        Alert.alert('Sign Up Error', err.errors ? err.errors[0].message : err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isSignUpLoaded) return;
    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      if (completeSignUp.status === 'complete') {
        const userId = completeSignUp.createdUserId!;
        await saveUserToFirebase(userId, emailAddress, firstName, lastName);
        await setSignUpActive({ session: completeSignUp.createdSessionId });
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.errors ? err.errors[0].message : err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSelectAuthGoogle = async () => {
    try {
      const { createdSessionId, setActive: setOAuthActive, signUp } = await startOAuthFlow();
      if (createdSessionId && setOAuthActive) {
        if (signUp?.createdUserId) {
          let fName = signUp.firstName || '';
          let lName = signUp.lastName || '';
          let email = signUp.emailAddress || '';
          await saveUserToFirebase(signUp.createdUserId, email, fName, lName);
        }
        await setOAuthActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error', err);
    }
  };

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // 3. UI Views
  const SignInView = (
    <View style={styles.cardContent}>
      <AuthInput icon={Mail} placeholder="Email" value={emailAddress} onChangeText={setEmailAddress} autoCapitalize="none" keyboardType="email-address" />
      <AuthInput icon={Lock} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      
      <TouchableOpacity style={[styles.buttonMain, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={onSignInPress} disabled={loading}>
        <Text style={styles.buttonMainText}>{loading ? '...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: theme.surfaceBorder }]} />
        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR</Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.surfaceBorder }]} />
      </View>

      <TouchableOpacity style={[styles.buttonGoogle, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]} onPress={onSelectAuthGoogle}>
        <Text style={[styles.buttonGoogleText, { color: theme.text }]}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>Don&apos;t have an account? </Text>
        <TouchableOpacity onPress={() => setIsFlipped(true)}>
          <Text style={[styles.footerLink, { color: theme.primary }]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const SignUpView = (
    <View style={styles.cardContent}>
      {!pendingVerification ? (
        <>
          <AuthInput icon={User} placeholder="First Name" value={firstName} onChangeText={setFirstName} />
          <AuthInput icon={User} placeholder="Last Name" value={lastName} onChangeText={setLastName} />
          <AuthInput icon={Mail} placeholder="Email" value={emailAddress} onChangeText={setEmailAddress} autoCapitalize="none" />
          <AuthInput icon={Lock} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      
          <TouchableOpacity style={[styles.buttonMain, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={onSignUpPress} disabled={loading}>
            <Text style={styles.buttonMainText}>{loading ? '...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => setIsFlipped(false)}>
              <Text style={[styles.footerLink, { color: theme.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.verificationText, { color: theme.textSecondary }]}>Enter the code sent to {emailAddress}</Text>
          <AuthInput icon={Lock} placeholder="Code" value={code} onChangeText={setCode} keyboardType="number-pad" />
          <TouchableOpacity style={[styles.buttonMain, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={onPressVerify} disabled={loading}>
            <Text style={styles.buttonMainText}>{loading ? '...' : 'Verify'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.backgroundBlob, { backgroundColor: theme.blobStart }]} />
        <View style={[styles.backgroundBlob, styles.blobBottom, { backgroundColor: theme.blobEnd }]} />
        
        <Animated.View entering={FadeInUp.duration(800).springify()} style={styles.header}>
          <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: theme.text }]}>{isFlipped ? 'Join the Journey' : 'AI CaloriTracker'}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{isFlipped ? 'Start achieving your goals today' : 'Welcome back to your fitness journey'}</Text>
        </Animated.View>

        <FlipCard isFlipped={isFlipped} front={SignInView} back={SignUpView} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 60 },
  backgroundBlob: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150 },
  blobBottom: { top: undefined, left: undefined, bottom: -100, right: -100 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 80, height: 80, marginBottom: 16, borderRadius: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16 },
  cardContent: { width: '100%' },
  buttonMain: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonMainText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: 16, fontSize: 14, fontWeight: '500' },
  buttonGoogle: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  buttonGoogleText: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600' },
  verificationText: { fontSize: 16, marginBottom: 16, textAlign: 'center' },
});
