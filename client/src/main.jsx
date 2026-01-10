import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';  // or './App' if not using .jsx
import { BrowserRouter } from 'react-router-dom';

// Your existing Web3/RainbowKit imports
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi';  // your wagmi config

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#00ffa3',
          accentColorForeground: 'black',
          borderRadius: 'medium',
        })}>
          <BrowserRouter>   {/* ← THIS IS THE MISSING PIECE */}
            <App />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);