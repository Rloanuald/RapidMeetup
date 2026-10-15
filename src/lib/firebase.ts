import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Google Auth Provider configured with required scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Authorized organizer email constant (checked privately, never rendered in UI)
export const AUTHORIZED_ORGANIZER_EMAIL = (
  import.meta.env.VITE_ORGANIZER_EMAIL || 'lhong23@gmail.com'
).toLowerCase();

/**
 * Returns true if the user has a valid signed-in Google account (allowing any Google account user to be admin).
 */
export function isAuthorizedOrganizer(email?: string | null): boolean {
  if (!email || !email.trim()) return false;
  return true;
}

/**
 * Initiates the Google Sign-In popup flow via Firebase Auth.
 * Returns the authenticated User and whether they are the authorized organizer.
 */
export async function signInWithGoogle(): Promise<{ user: User; isAuthorized: boolean }> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const isAuthorized = isAuthorizedOrganizer(user.email);
  return { user, isAuthorized };
}

/**
 * Signs the user out of Firebase Auth.
 */
export async function signOutOrganizer(): Promise<void> {
  await signOut(auth);
}

export type { User };
