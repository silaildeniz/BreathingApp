import React, { createContext, useContext, useState, ReactNode } from 'react';
import { theme } from '../constants/colors';

export type ThemeType = 'light' | 'dark';

interface ThemeContextProps {
  themeType: ThemeType;
  themeColors: typeof theme.light;
  setThemeType: (type: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  themeType: 'light',
  themeColors: theme.light,
  setThemeType: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeType, setThemeType] = useState<ThemeType>('light');

  const themeColors = themeType === 'dark' ? theme.dark : theme.light;

  return (
    <ThemeContext.Provider value={{ themeType, themeColors, setThemeType }}>
      {children}
    </ThemeContext.Provider>
  );
}; 