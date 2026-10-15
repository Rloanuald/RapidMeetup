import { useState, useEffect, useCallback } from 'react';
import {
  auth,
  signInWithGoogle,
  signOutOrganizer,
  isAuthorizedOrganizer,
  type User,
} from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export interface OrganizerAuthState {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  displayName: string;
  photoURL: string | null;
  signIn: () => Promise<{ success: boolean; isAuthorized: boolean; error?: string }>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

export function useOrganizerAuth(): OrganizerAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        setIsAuthorized(isAuthorizedOrganizer(currentUser.email));
      } else {
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    try {
      const { user: signedInUser, isAuthorized: authorized } = await signInWithGoogle();
      setUser(signedInUser);
      setIsAuthorized(authorized);
      if (!authorized) {
        return {
          success: false,
          isAuthorized: false,
          error:
            'Access denied. Only the designated organizer Google account is permitted to create rooms.',
        };
      }
      return { success: true, isAuthorized: true };
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, isAuthorized: false, error: 'Sign-in window was closed.' };
      }
      return {
        success: false,
        isAuthorized: false,
        error: err.message || 'Failed to sign in with Google.',
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutOrganizer();
      setUser(null);
      setIsAuthorized(false);
    } catch {
      // ignore
    }
  }, []);

  const getIdToken = useCallback(async () => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }, [user]);

  const displayName = user?.displayName || 'Organizer';
  const photoURL = user?.photoURL || null;

  return {
    user,
    loading,
    isAuthorized,
    displayName,
    photoURL,
    signIn,
    signOut,
    getIdToken,
  };
}
