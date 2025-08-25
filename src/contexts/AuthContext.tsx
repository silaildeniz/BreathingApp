import React, { useEffect, useState } from 'react';
import { onAuthStateChange, logout as authLogout, getCurrentUser } from '../services/authService';
import { loginIAP, logoutIAP } from '../services/iapService';

// Global auth context
export const AuthContext = React.createContext<{
  isAuthenticated: boolean;
  isGuest: boolean;
  setGuestMode: (guest: boolean) => void;
  logout: () => Promise<void>;
}>({
  isAuthenticated: false,
  isGuest: false,
  setGuestMode: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Firebase auth state listener
    const unsubscribe = onAuthStateChange((user) => {
      setIsAuthenticated(!!user);
      try {
        if (user) {
          // Sync RevenueCat login with Firebase user
          loginIAP(user.uid);
        } else {
          logoutIAP();
        }
      } catch {}
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const setGuestMode = (guest: boolean) => {
    setIsGuest(guest);
  };

  const logout = async () => {
    try {
      await authLogout();
      setIsAuthenticated(false);
      setIsGuest(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return null; // veya loading screen
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: isAuthenticated || isGuest, 
      isGuest, 
      setGuestMode,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 