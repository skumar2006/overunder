export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  location: string;
  joinedDate: Date;
  stats: {
    totalBets: number;
    wonBets: number;
    winRate: number;
    totalEarnings: number;
    currentStreak: number;
    bestStreak: number;
  };
  favoriteCategories: string[];
  achievements: Achievement[];
  followers: number;
  following: number;
  isFollowing?: boolean;
  mutualFriends?: number;
  commonCommunities?: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  coverImage: string;
  category: 'sports' | 'entertainment' | 'politics' | 'tech' | 'relationships' | 'general';
  memberCount: number;
  activeBets: number;
  accuracy: number;
  trendingBets: string[];
  memberAvatars: string[]; // URLs of member avatars to display
  friendsInCommunity: User[];
  isJoined: boolean;
}

// Generate sample achievements
const achievements: Achievement[] = [
  { id: 'first-bet', name: 'First Timer', description: 'Placed your first bet', icon: '🎯', unlockedAt: new Date(2024, 0, 15) },
  { id: 'streak-5', name: 'Hot Streak', description: 'Won 5 bets in a row', icon: '🔥', unlockedAt: new Date(2024, 1, 20) },
  { id: 'big-win', name: 'Big Winner', description: 'Won a bet with 10x payout', icon: '💰', unlockedAt: new Date(2024, 2, 10) },
  { id: 'predictor', name: 'Oracle', description: '80% accuracy over 50 bets', icon: '🔮', unlockedAt: new Date(2024, 2, 25) },
  { id: 'social', name: 'Social Butterfly', description: 'Joined 5 communities', icon: '🦋', unlockedAt: new Date(2024, 3, 5) },
  { id: 'early-bird', name: 'Early Bird', description: 'Bet on events 3+ months out', icon: '🐦', unlockedAt: new Date(2024, 3, 15) },
];

// Generate sample users
const userNames = [
  { username: 'alexchen', displayName: 'Alex Chen', location: 'San Francisco, CA' },
  { username: 'sarahj', displayName: 'Sarah Johnson', location: 'New York, NY' },
  { username: 'mikewilson', displayName: 'Mike Wilson', location: 'Los Angeles, CA' },
  { username: 'emilyd', displayName: 'Emily Davis', location: 'Chicago, IL' },
  { username: 'jameslee', displayName: 'James Lee', location: 'Seattle, WA' },
  { username: 'sophiab', displayName: 'Sophia Brown', location: 'Austin, TX' },
  { username: 'danielm', displayName: 'Daniel Martinez', location: 'Boston, MA' },
  { username: 'oliviat', displayName: 'Olivia Taylor', location: 'Denver, CO' },
  { username: 'ryanw', displayName: 'Ryan White', location: 'Portland, OR' },
  { username: 'emmah', displayName: 'Emma Harris', location: 'Miami, FL' },
];

// Seeded random for consistency
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateUser(index: number, isCurrentUser: boolean = false): User {
  const userInfo = userNames[index % userNames.length];
  const joinedDays = Math.floor(seededRandom(index * 2) * 365) + 30;
  const totalBets = Math.floor(seededRandom(index * 3) * 200) + 20;
  const wonBets = Math.floor(totalBets * (0.4 + seededRandom(index * 4) * 0.3));
  
  return {
    id: isCurrentUser ? 'current-user' : `user-${index}`,
    username: userInfo.username,
    displayName: userInfo.displayName,
    avatar: `https://i.pravatar.cc/150?img=${index + 1}`,
    bio: isCurrentUser 
      ? "Love making predictions about everything! 🎯" 
      : `Betting enthusiast from ${userInfo.location}`,
    location: userInfo.location,
    joinedDate: new Date(Date.now() - joinedDays * 24 * 60 * 60 * 1000),
    stats: {
      totalBets,
      wonBets,
      winRate: Math.round((wonBets / totalBets) * 100),
      totalEarnings: Math.floor(seededRandom(index * 5) * 5000) + 100,
      currentStreak: Math.floor(seededRandom(index * 6) * 10),
      bestStreak: Math.floor(seededRandom(index * 7) * 20) + 5,
    },
    favoriteCategories: ['sports', 'entertainment', 'tech'].slice(0, Math.floor(seededRandom(index * 8) * 3) + 1),
    achievements: achievements.slice(0, Math.floor(seededRandom(index * 9) * 4) + 2),
    followers: Math.floor(seededRandom(index * 10) * 1000) + 50,
    following: Math.floor(seededRandom(index * 11) * 500) + 20,
    isFollowing: !isCurrentUser && seededRandom(index * 12) > 0.5,
    mutualFriends: !isCurrentUser ? Math.floor(seededRandom(index * 13) * 20) : undefined,
    commonCommunities: !isCurrentUser ? ['Sports Fanatics', 'Tech Prophets'].slice(0, Math.floor(seededRandom(index * 14) * 2) + 1) : undefined,
  };
}

// Current user profile
export const currentUser = generateUser(0, true);

// Generate sample friends and recommendations
export const friends: User[] = Array.from({ length: 20 }, (_, i) => generateUser(i + 1));
export const recommendedFriends: User[] = Array.from({ length: 10 }, (_, i) => generateUser(i + 21));

// Generate sample communities
export const communities: Community[] = [
  {
    id: 'sports-fanatics',
    name: 'Sports Fanatics',
    description: 'For die-hard sports fans betting on every game',
    icon: '🏈',
    coverImage: 'https://picsum.photos/seed/sports/400/200',
    category: 'sports',
    memberCount: 15420,
    activeBets: 342,
    accuracy: 58,
    trendingBets: ['Lakers playoff odds', 'Super Bowl winner', 'World Cup 2026'],
    memberAvatars: friends.slice(0, 5).map(f => f.avatar),
    friendsInCommunity: friends.slice(0, 3),
    isJoined: true,
  },
  {
    id: 'celebrity-watchers',
    name: 'Celebrity Watchers',
    description: 'Predicting celebrity relationships and drama',
    icon: '✨',
    coverImage: 'https://picsum.photos/seed/celeb/400/200',
    category: 'entertainment',
    memberCount: 23150,
    activeBets: 521,
    accuracy: 45,
    trendingBets: ['Taylor Swift engagement', 'Oscar winners 2025', 'Next celebrity breakup'],
    memberAvatars: friends.slice(3, 8).map(f => f.avatar),
    friendsInCommunity: friends.slice(3, 5),
    isJoined: true,
  },
  {
    id: 'tech-prophets',
    name: 'Tech Prophets',
    description: 'Predicting the future of technology',
    icon: '🚀',
    coverImage: 'https://picsum.photos/seed/tech/400/200',
    category: 'tech',
    memberCount: 8930,
    activeBets: 156,
    accuracy: 52,
    trendingBets: ['Apple AR glasses launch', 'Tesla stock price', 'AI breakthrough 2025'],
    memberAvatars: friends.slice(5, 10).map(f => f.avatar),
    friendsInCommunity: friends.slice(5, 7),
    isJoined: false,
  },
  {
    id: 'political-pulse',
    name: 'Political Pulse',
    description: 'Tracking political predictions and elections',
    icon: '🏛️',
    coverImage: 'https://picsum.photos/seed/politics/400/200',
    category: 'politics',
    memberCount: 12580,
    activeBets: 89,
    accuracy: 61,
    trendingBets: ['2024 Election outcomes', 'Policy changes', 'Supreme Court decisions'],
    memberAvatars: friends.slice(7, 12).map(f => f.avatar),
    friendsInCommunity: friends.slice(7, 8),
    isJoined: false,
  },
  {
    id: 'love-predictors',
    name: 'Love Predictors',
    description: 'Will they or won\'t they? Relationship betting',
    icon: '💕',
    coverImage: 'https://picsum.photos/seed/love/400/200',
    category: 'relationships',
    memberCount: 18240,
    activeBets: 412,
    accuracy: 42,
    trendingBets: ['Celebrity couples lasting', 'Bachelor finale', 'Royal family news'],
    memberAvatars: friends.slice(10, 15).map(f => f.avatar),
    friendsInCommunity: friends.slice(10, 13),
    isJoined: true,
  },
  {
    id: 'general-predictions',
    name: 'General Predictions',
    description: 'Everything else - weather, trends, random events',
    icon: '🎲',
    coverImage: 'https://picsum.photos/seed/general/400/200',
    category: 'general',
    memberCount: 31420,
    activeBets: 723,
    accuracy: 49,
    trendingBets: ['Weather predictions', 'Viral trends', 'Random world events'],
    memberAvatars: friends.slice(12, 17).map(f => f.avatar),
    friendsInCommunity: friends.slice(12, 14),
    isJoined: false,
  },
]; 