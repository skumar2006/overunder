# OverUnder Mobile 📱

A React Native mobile app for betting on real-world events - from celebrity relationships to local happenings.

## Features

- **Live Bets**: Trending markets with real-time odds
- **Categories**: Sports, Celebrity, Politics, Crypto, Local
- **Local Markets**: Geo-based betting for your area
- **Beautiful UI**: Dark theme with smooth animations
- **Wallet Integration**: Connect your crypto wallet (demo mode)

## Screenshots

The app features:
- Clean, dark UI inspired by modern betting apps
- Swipeable bet cards with YES/NO options
- Real-time price updates
- Bet modal with slider for easy amount selection
- Profile pages for market creators

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npx expo start
```

3. Run on your device:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Architecture

- **React Native + Expo**: For cross-platform mobile development
- **TypeScript**: Type-safe code
- **Ethers.js**: Blockchain interaction (currently in demo mode)
- **React Navigation**: Tab-based navigation
- **Context API**: State management for bets and wallet

## Screens

1. **Live Bets**: Hot markets and trending bets
2. **All Bets**: Browse all markets by category
3. **Local**: Location-based markets
4. **Your Frier (Profile)**: User profiles and wallet connection

## Demo Mode

The app currently runs in demo mode with mock data. In production, it would connect to the OverUnder smart contracts on Base network.

## Future Enhancements

- [ ] Real wallet connection with WalletConnect
- [ ] Push notifications for market updates
- [ ] Social features (follow users, share bets)
- [ ] Market creation flow
- [ ] Real-time WebSocket updates
- [ ] Biometric authentication

## License

MIT
