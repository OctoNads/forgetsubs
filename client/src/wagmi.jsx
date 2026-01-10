import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { mainnet, base } from 'viem/chains';

export const monad = {
  id: 143,
  name: 'Monad',
  iconUrl: 'https://ugc.production.linktr.ee/78d77591-a3fe-4f00-9f5d-1f7e2e7ba9e6_rhombus.jpeg?io=true&size=avatar-v3_0', // Added Monad Logo
  iconBackground: '#fff', // Optional: prevents dark icon blending into dark backgrounds
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://infra.originstake.com/monad/evm'] },
    public: { http: ['https://infra.originstake.com/monad/evm'] },
  },
  blockExplorers: {
    default: { name: 'MonadVision', url: 'https://monadvision.com' },
  },
  testnet: false,
};

export const bsc = {
  id: 56,
  name: 'BNB Smart Chain',
  iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png', // Explicitly adding BSC logo just in case
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://bsc-dataseed1.binance.org'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://bscscan.com' },
  },
};

export const config = getDefaultConfig({
  appName: 'FORGETSUBS',
  projectId: '98a7a662fc905c6d546254cd500a9036',
  chains: [monad, bsc, base, mainnet],
  transports: {
    [monad.id]: http(),
    [bsc.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
});