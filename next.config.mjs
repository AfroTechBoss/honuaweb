import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.js', '.mjs', '.jsx'],
    };

    // @stripe/crypto (a Privy dep) imports @stripe/stripe-js which isn't installed.
    // We never render Privy's FiatOnramp screen, so stub the whole package.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@stripe/crypto': path.resolve(__dirname, 'stubs/empty.js'),
      '@farcaster/mini-app-solana': path.resolve(__dirname, 'stubs/empty.js'),
    };

    return config;
  },
};

export default nextConfig;
