import React from 'react';

// Global auth context
export const AuthContext = React.createContext<{
  isAuthenticated: boolean;
  isGuest: boolean;
  setGuestMode: (guest: boolean) => void;
}>({
  isAuthenticated: false,
  isGuest: false,
  setGuestMode: () => {},
}); 