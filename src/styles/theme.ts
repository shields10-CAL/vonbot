import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1769bc', light: '#e3f0ff', dark: '#104d91' },
    secondary: { main: '#7448b9' },
    success: { main: '#198955' },
    warning: { main: '#b96317' },
    background: { default: '#e8f4f9', paper: '#ffffff' },
    text: { primary: '#26384a', secondary: '#60758a' },
  },
  typography: { fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h5: { fontWeight: 800, letterSpacing: '-.025em' }, h6: { fontWeight: 800, letterSpacing: '-.02em' },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 10, minHeight: 36 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: '0 5px 20px rgba(20,51,75,.055)', border: '1px solid rgba(70,111,132,.08)' } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#fff' } } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});
