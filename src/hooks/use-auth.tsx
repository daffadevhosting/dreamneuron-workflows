'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { createSessionCookie, signOutUser } from '@/actions/content';

interface CustomUser extends User {
    role?: string;
}
interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Function to create or update a user profile in Firestore
const createOrUpdateUserProfile = async (user: User) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    try {
        const userData: {
            email: string | null;
            displayName: string | null;
            photoURL: string | null;
            lastLogin: any;
            role?: string;
            createdAt?: any;
        } = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastLogin: serverTimestamp(),
        };

        if (!userSnap.exists()) {
            userData.role = 'freeUser';
            userData.createdAt = serverTimestamp();
            console.log(`Creating new freeUser profile for ${user.uid}`);
        }
        
        await setDoc(userRef, userData, { merge: true });
        console.log(`Upserted profile for ${user.uid}`);
        
    } catch (error) {
         console.error("Error creating/updating user profile:", error);
    }
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Force refresh the token to ensure the latest claims are available
      await currentUser.getIdToken(true);
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const updatedUser = { ...currentUser, role: userSnap.data()?.role };
        setUser(updatedUser);
        console.log('User data refreshed on client.', updatedUser);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);

        const idToken = await authUser.getIdToken();
        await createSessionCookie(idToken);
        
        if (userSnap.exists()) {
            setUser({ ...authUser, role: userSnap.data()?.role });
        } else {
            // This case might happen on first login, profile creation is handled in login function
            // but we can create it here as a fallback.
            await createOrUpdateUserProfile(authUser);
            const updatedSnap = await getDoc(userRef);
            if (updatedSnap.exists()) {
               setUser({ ...authUser, role: updatedSnap.data()?.role });
            } else {
               setUser(authUser);
            }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        await createOrUpdateUserProfile(result.user);
        const idToken = await result.user.getIdToken();
        await createSessionCookie(idToken);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      await signOutUser();
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const value = {
    user,
    loading,
    loginWithGoogle,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
