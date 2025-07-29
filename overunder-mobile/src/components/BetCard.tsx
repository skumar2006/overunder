import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bet, getTimeLeft, PricePoint } from '../data/mockBets';
import { BetModal } from './BetModal';

interface BetCardProps {
  bet: Bet;
  isFirstCard?: boolean;
}

// Simple line chart component using React Native Views
const PriceChart: React.FC<{ historicalPrices: PricePoint[] }> = ({ historicalPrices }) => {
  if (historicalPrices.length === 0) return null;

  const chartWidth = 280;
  const chartHeight = 60;
  const padding = 10;
  
  // Get price range for scaling
  const prices = historicalPrices.map(p => p.yesPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 0.1; // Avoid division by zero
  
  // Create path points
  const points = historicalPrices.map((point, index) => {
    const x = (index / (historicalPrices.length - 1)) * (chartWidth - 2 * padding) + padding;
    const y = chartHeight - padding - ((point.yesPrice - minPrice) / priceRange) * (chartHeight - 2 * padding);
    return { x, y, price: point.yesPrice };
  });

  // Get month labels from the data
  const monthLabels = historicalPrices
    .filter((_, index) => index % Math.ceil(historicalPrices.length / 5) === 0)
    .slice(0, 5)
    .map(point => {
      const month = point.date.toLocaleDateString('en-US', { month: 'short' });
      return month;
    });

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.chartArea, { width: chartWidth, height: chartHeight }]}>
        {/* Y-axis labels */}
        <Text style={[styles.chartLabel, { position: 'absolute', right: 5, top: 5 }]}>
          {Math.round(maxPrice * 100)}%
        </Text>
        <Text style={[styles.chartLabel, { position: 'absolute', right: 5, top: chartHeight / 2 - 6 }]}>
          {Math.round(((maxPrice + minPrice) / 2) * 100)}%
        </Text>
        <Text style={[styles.chartLabel, { position: 'absolute', right: 5, bottom: 5 }]}>
          {Math.round(minPrice * 100)}%
        </Text>

        {/* Line chart */}
        <View style={styles.chartLineContainer}>
          {points.slice(1).map((point, index) => {
            const prevPoint = points[index];
            const length = Math.sqrt(
              Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
            );
            const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x) * (180 / Math.PI);
            
            return (
              <View
                key={index}
                style={[
                  styles.chartLineSegment,
                  {
                    left: prevPoint.x,
                    top: prevPoint.y,
                    width: length,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
      
      {/* X-axis labels */}
      <View style={styles.chartMonths}>
        {monthLabels.map((month, index) => (
          <Text key={index} style={styles.monthText}>{month}</Text>
        ))}
      </View>
    </View>
  );
};

export const BetCard: React.FC<BetCardProps> = ({ bet, isFirstCard = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);

  const handleBetPress = (side: 'yes' | 'no') => {
    setSelectedSide(side);
    setModalVisible(true);
  };

  const handlePlaceBet = (amount: number, side: 'yes' | 'no') => {
    // Here you would typically send the bet to your backend
    console.log(`Placing bet: $${amount} on ${side} for "${bet.name}"`);
    // You could also show a success message or update local state
  };

  // All cards now use the same expanded format
  return (
    <>
      <View style={styles.betCard}>
        <View style={styles.timeLeft}>
          <Text style={styles.timeText}>🕐 {getTimeLeft(bet.endTime)}</Text>
        </View>
        
        <View style={styles.profileSection}>
          <View style={styles.profileContainer}>
            <Image source={{ uri: bet.picture }} style={styles.profilePic} />
            {bet.category === 'relationships' && (
              <View style={styles.heartOverlay}>
                <Text style={styles.heartIcon}>❤️</Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.categoryName}>{bet.category.toUpperCase()}</Text>
            <Text style={styles.question}>{bet.name}</Text>
          </View>
        </View>
        
        <View style={styles.betButtons}>
          <TouchableOpacity style={styles.yesButton} onPress={() => handleBetPress('yes')}>
            <Text style={styles.yesButtonText}>Yes</Text>
            <Text style={styles.priceText}>${bet.yesPrice.toFixed(2)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.noButton} onPress={() => handleBetPress('no')}>
            <Text style={styles.noButtonText}>No</Text>
            <Text style={styles.priceText}>${bet.noPrice.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Dynamic Price Chart - Now showing for ALL cards using their historical data */}
        <PriceChart historicalPrices={bet.historicalPrices} />
        
        <View style={styles.chanceContainer}>
          <Text style={styles.chanceText}>{Math.round(bet.yesPrice * 100)}% Chance</Text>
          {bet.change && (
            <Text style={[styles.volumeText, { color: bet.change > 0 ? '#4CAF50' : '#F44336' }]}>
              {bet.change > 0 ? '▲' : '▼'} {Math.abs(bet.change).toFixed(1)}
            </Text>
          )}
        </View>
      </View>

      <BetModal
        visible={modalVisible}
        bet={bet}
        selectedSide={selectedSide}
        onClose={() => setModalVisible(false)}
        onPlaceBet={handlePlaceBet}
      />
    </>
  );
};

const styles = StyleSheet.create({
  betCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  timeLeft: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  timeText: {
    color: '#666',
    fontSize: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ddd',
  },
  heartOverlay: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  heartIcon: {
    fontSize: 16,
  },
  profileInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  question: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  betButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  yesButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  yesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  chartContainer: {
    marginBottom: 15,
  },
  chartArea: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
    position: 'relative',
  },
  chartLabel: {
    fontSize: 10,
    color: '#666',
  },
  chartLineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chartLineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#666',
    transformOrigin: '0 50%',
  },
  chartMonths: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  monthText: {
    fontSize: 10,
    color: '#666',
  },
  chanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chanceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  volumeText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 