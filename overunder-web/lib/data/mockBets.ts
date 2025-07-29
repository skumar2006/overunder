export interface PricePoint {
  date: Date;
  yesPrice: number;
  noPrice: number;
}

export interface Bet {
  id: string;
  name: string;
  picture: string; // For now, we'll use placeholder URLs
  endTime: Date;
  yesPrice: number;
  noPrice: number;
  category: 'relationships' | 'sports' | 'entertainment' | 'politics' | 'tech';
  volume?: number;
  change?: number;
  historicalPrices: PricePoint[]; // Historical price data for charts
}

// Generate random bets
const relationshipNames = [
  "Will Taylor and Travis last until 2025?",
  "Will Kim K's new relationship last 3 months?",
  "Will Brad and Angelina reconcile?",
  "Will Zendaya and Tom Holland get engaged?",
  "Will Justin and Hailey have a baby?",
  "Will Selena Gomez get married this year?",
  "Will Machine Gun Kelly and Megan Fox reunite?",
  "Will Kourtney and Travis stay together?",
  "Will Gigi Hadid find love in 2024?",
  "Will Pete Davidson date another celebrity?",
];

const sportsNames = [
  "Will Lakers make the playoffs?",
  "Will Warriors win the championship?",
  "Will Tom Brady come out of retirement?",
  "Will Messi win another World Cup?",
  "Will Yankees win the World Series?",
  "Will Cowboys make the Super Bowl?",
  "Will LeBron retire this season?",
  "Will Man City win Champions League?",
  "Will Tiger Woods win another major?",
  "Will Serena Williams return to tennis?",
];

const entertainmentNames = [
  "Will Marvel's next movie hit $1B?",
  "Will Taylor Swift win Album of the Year?",
  "Will Barbie movie get a sequel?",
  "Will The Weeknd tour in 2024?",
  "Will Drake drop a new album?",
  "Will Beyoncé headline Coachella?",
  "Will Netflix stock hit $500?",
  "Will Avatar 3 break box office records?",
  "Will BTS reunite in 2024?",
  "Will Olivia Rodrigo win a Grammy?",
];

const politicsNames = [
  "Will Biden run for re-election?",
  "Will Trump be the GOP nominee?",
  "Will there be a government shutdown?",
  "Will gas prices drop below $3?",
  "Will student loans be forgiven?",
  "Will marijuana be federally legalized?",
  "Will minimum wage increase?",
  "Will immigration reform pass?",
  "Will Supreme Court expand?",
  "Will filibuster be eliminated?",
];

const techNames = [
  "Will Apple stock hit $200?",
  "Will Twitter/X add video calls?",
  "Will ChatGPT-5 launch this year?",
  "Will Tesla Cybertruck succeed?",
  "Will Meta stock recover to $400?",
  "Will TikTok be banned in US?",
  "Will Bitcoin hit $100k?",
  "Will Apple release AR glasses?",
  "Will Google merge with another company?",
  "Will Amazon split its stock?",
];

const allNames = [
  ...relationshipNames,
  ...sportsNames,
  ...entertainmentNames,
  ...politicsNames,
  ...techNames,
];

// Seeded random number generator for consistent results
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate historical price data for a bet using a seed for consistency
function generateHistoricalPrices(finalYesPrice: number, startDate: Date, seed: number): PricePoint[] {
  const points: PricePoint[] = [];
  const daysBack = 150; // 5 months of history
  
  // Start with a different price and evolve to the current price (using seed for consistency)
  let currentYesPrice = seededRandom(seed) * 0.6 + 0.2; // Start between 20-80%
  let randomSeed = seed;
  
  for (let i = daysBack; i >= 0; i -= 10) { // Every 10 days
    const date = new Date(startDate);
    date.setDate(date.getDate() - i);
    
    // Add some random walk with trend toward final price (using seeded random)
    randomSeed += 1;
    const trendFactor = (daysBack - i) / daysBack; // 0 to 1
    const targetPrice = finalYesPrice;
    const randomChange = (seededRandom(randomSeed) - 0.5) * 0.1; // ±5% random walk
    
    // Blend current price toward target with some randomness
    currentYesPrice = currentYesPrice * (1 - trendFactor * 0.3) + targetPrice * (trendFactor * 0.3) + randomChange;
    
    // Keep within bounds
    currentYesPrice = Math.max(0.05, Math.min(0.95, currentYesPrice));
    
    const yesPrice = Math.round(currentYesPrice * 100) / 100;
    const noPrice = Math.round((1 - currentYesPrice) * 100) / 100;
    
    points.push({
      date: new Date(date),
      yesPrice,
      noPrice
    });
  }
  
  return points;
}

function generateRandomBet(index: number): Bet {
  const name = allNames[index % allNames.length];
  const category = name.includes('Will Taylor') || name.includes('relationship') || name.includes('married') || name.includes('baby') 
    ? 'relationships'
    : name.includes('Lakers') || name.includes('Warriors') || name.includes('playoff') || name.includes('champion')
    ? 'sports'
    : name.includes('movie') || name.includes('album') || name.includes('Grammy') || name.includes('Netflix')
    ? 'entertainment'
    : name.includes('Biden') || name.includes('Trump') || name.includes('government') || name.includes('legalized')
    ? 'politics'
    : 'tech';

  // Generate random end time (1 hour to 6 months from now) - using index as seed
  const endTime = new Date();
  const randomDays = Math.floor(seededRandom(index * 2) * 180) + 1;
  endTime.setDate(endTime.getDate() + randomDays);

  // Generate prices that sum to approximately 1 - using index as seed
  const yesPrice = seededRandom(index * 3) * 0.85 + 0.1; // 0.10 to 0.95
  const noPrice = 1 - yesPrice;

  // Round to 2 decimals
  const roundedYesPrice = Math.round(yesPrice * 100) / 100;
  const roundedNoPrice = Math.round(noPrice * 100) / 100;

  // Generate historical prices using index as seed for consistency
  const historicalPrices = generateHistoricalPrices(roundedYesPrice, new Date(), index * 5);

  return {
    id: `bet-${index}`,
    name,
    picture: `https://picsum.photos/seed/${index}/200/200`, // Random placeholder images
    endTime,
    yesPrice: roundedYesPrice,
    noPrice: roundedNoPrice,
    category,
    volume: Math.floor(seededRandom(index * 4) * 100000) + 1000,
    change: (seededRandom(index * 6) - 0.5) * 30, // -15% to +15%
    historicalPrices,
  };
}

// Generate 100 bets for infinite scroll - these will now be consistent across app refreshes
export const mockBets: Bet[] = Array.from({ length: 100 }, (_, i) => generateRandomBet(i));

// Helper function to get time left string
export function getTimeLeft(endTime: Date): string {
  const now = new Date();
  const diff = endTime.getTime() - now.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} left`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} left`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  } else {
    return 'Ending soon';
  }
} 