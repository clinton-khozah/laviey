import { colors } from './colors';
import { typography } from './typography';

export const theme = {
  colors,
  typography,
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radii: { sm: 8, md: 12, lg: 20, pill: 999 },
  shadow: {
    shadowColor: '#171720',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;
