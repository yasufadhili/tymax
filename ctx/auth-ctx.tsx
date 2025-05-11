import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  signOut: () => Promise<void>;
  initialising: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initialising, setInitialising] = useState<boolean>(true);

  const onAuthStateChanged = useCallback((user: FirebaseAuthTypes.User | null) => {
    setUser(user);
    if (initialising) setTimeout(() => { setInitialising(false) }, 3000);
  }, [initialising]);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    if (initialising && !user) setTimeout(() => { setInitialising(false) }, 3000);
    return subscriber; // unsubscribe on unmount
  }, [onAuthStateChanged]);
  
  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    signOut,
    initialising,
  }), [user, signOut, initialising]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;