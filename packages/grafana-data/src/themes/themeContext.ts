import { createContext } from 'react';

import { createTheme } from './createTheme';

// Use Grafana Dark theme by default
/** @public */
export const ThemeContext = createContext(createTheme());

ThemeContext.displayName = 'ThemeContext';
