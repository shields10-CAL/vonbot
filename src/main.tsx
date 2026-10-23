import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './styles/theme';
import App from './App';
import './styles/global.css';
import './styles/vonbot-v016.css';
import './styles/vonbot-v017.css';
import './styles/vonbot-v018.css';
import './styles/vonbot-v019.css';
import './styles/vonbot-v020.css';
import './styles/vonbot-v021.css';
import './styles/vonbot-v022.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ThemeProvider theme={theme}><CssBaseline/><App/></ThemeProvider></React.StrictMode>
);
