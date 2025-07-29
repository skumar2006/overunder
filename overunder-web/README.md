# OverUnder - Localized Prediction Markets

A modern web application for creating and participating in prediction markets within communities. Built with Next.js, Supabase, and Magic SDK for seamless authentication.

## Features

- 🔮 **Prediction Markets**: Create binary (Yes/No) bets on any topic
- 👥 **Communities**: Join or create communities for focused betting
- 💼 **Custodial Wallets**: Automatic wallet creation via Magic SDK
- 💰 **Fixed Price Shares**: Simple pricing model with 2x payouts
- 📊 **Real-time Analytics**: Track market movements and your positions
- 🎨 **Modern UI**: Beautiful, responsive design inspired by mobile-first experiences

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Magic SDK (email-based)
- **Charts**: Recharts
- **State Management**: React Context

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Magic SDK account

## Setup Instructions

### 1. Clone and Install

```bash
cd overunder-web
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Magic SDK
NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY=your_magic_publishable_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Database Setup

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  username TEXT,
  bio TEXT,
  profile_pic_url TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communities table
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  creator_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community members join table
CREATE TABLE community_members (
  user_id UUID REFERENCES users(id),
  community_id UUID REFERENCES communities(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, community_id)
);

-- Bets table
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  bet_type TEXT NOT NULL CHECK (bet_type IN ('binary', 'overunder')),
  community_id UUID REFERENCES communities(id),
  creator_id UUID REFERENCES users(id),
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  fixed_share_price DECIMAL DEFAULT 1,
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'resolved')),
  resolved_outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shares owned table
CREATE TABLE shares_owned (
  user_id UUID REFERENCES users(id),
  bet_id UUID REFERENCES bets(id),
  side TEXT NOT NULL,
  shares_owned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, bet_id, side)
);

-- Wallet balances table
CREATE TABLE wallet_balances (
  user_id UUID REFERENCES users(id) PRIMARY KEY,
  balance DECIMAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares_owned ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your security requirements)
-- Example: Allow users to read all data but only modify their own
CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Add similar policies for other tables...
```

### 4. Magic SDK Setup

1. Sign up at [Magic.link](https://magic.link)
2. Create a new app
3. Copy your publishable key to `.env.local`
4. Configure allowed domains (add `http://localhost:3000` for development)

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
overunder-web/
├── app/                    # Next.js app directory
│   ├── bets/              # Bet-related pages
│   ├── communities/       # Community pages
│   ├── profile/           # User profiles
│   └── login/             # Authentication
├── components/            # React components
│   ├── bets/             # Bet-specific components
│   ├── navigation/       # Navigation components
│   └── ui/               # Reusable UI components
├── contexts/             # React contexts
├── lib/                  # Utility functions and configs
└── public/               # Static assets
```

## Key Features Explained

### Custodial Wallets
- Users sign in with just their email
- Wallets are created automatically via Magic SDK
- No need for users to manage private keys

### Fixed Price Shares
- Each bet has a fixed price per share (e.g., $1)
- Winners receive 2x their investment
- Simple, predictable pricing model

### Community-Based Markets
- Create public or community-specific bets
- Join communities to access exclusive markets
- Track community-wide performance

## Development Tips

1. **Mock Data**: The app includes mock price history for charts. In production, implement real-time price tracking.

2. **Payment Integration**: Currently uses a simple balance system. Integrate Stripe or crypto payments for real money.

3. **Resolution System**: Implement an oracle or admin system to resolve bets when outcomes are known.

4. **Mobile App**: The UI is mobile-responsive and can be wrapped in a React Native app.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Self-hosted

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this for your own projects!

## Support

For issues and questions:
- Create an issue on GitHub
- Check Supabase docs for database questions
- Check Magic SDK docs for auth issues
