import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { currentUser } from '../data/mockUsers';

const { width } = Dimensions.get('window');

export const ProfileScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'bets' | 'achievements'>('stats');
  
  // Mock active bets data
  const activeBets = [
    { id: '1', question: 'Will Lakers make the playoffs?', side: 'yes', amount: 50, odds: 0.65, status: 'active' },
    { id: '2', question: 'Will Taylor Swift get engaged?', side: 'no', amount: 25, odds: 0.78, status: 'active' },
    { id: '3', question: 'Will Bitcoin hit $100k?', side: 'yes', amount: 100, odds: 0.42, status: 'active' },
  ];

  const betHistory = [
    { id: '4', question: 'Will Marvel movie hit $1B?', side: 'yes', amount: 30, result: 'won', payout: 45 },
    { id: '5', question: 'Will Cowboys win Super Bowl?', side: 'no', amount: 50, result: 'lost', payout: 0 },
    { id: '6', question: 'Will Apple release AR glasses?', side: 'yes', amount: 75, result: 'won', payout: 125 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.settingsButton}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
        <Text style={styles.displayName}>{currentUser.displayName}</Text>
        <Text style={styles.username}>@{currentUser.username}</Text>
        <Text style={styles.bio}>{currentUser.bio}</Text>
        
        <View style={styles.followInfo}>
          <View style={styles.followStat}>
            <Text style={styles.followValue}>{currentUser.followers.toLocaleString()}</Text>
            <Text style={styles.followLabel}>Followers</Text>
          </View>
          <View style={styles.followDivider} />
          <View style={styles.followStat}>
            <Text style={styles.followValue}>{currentUser.following.toLocaleString()}</Text>
            <Text style={styles.followLabel}>Following</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.statCard}>
          <Text style={styles.statCardValue}>${currentUser.stats.totalEarnings.toLocaleString()}</Text>
          <Text style={styles.statCardLabel}>Total Earnings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardValue}>{currentUser.stats.winRate}%</Text>
          <Text style={styles.statCardLabel}>Win Rate</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardValue}>{currentUser.stats.currentStreak}</Text>
          <Text style={styles.statCardLabel}>Current Streak</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'bets' && styles.activeTab]}
          onPress={() => setActiveTab('bets')}
        >
          <Text style={[styles.tabText, activeTab === 'bets' && styles.activeTabText]}>Bets</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
          onPress={() => setActiveTab('achievements')}
        >
          <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>Achievements</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'stats' && (
          <View style={styles.statsContent}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Bets Placed</Text>
              <Text style={styles.statValue}>{currentUser.stats.totalBets}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Bets Won</Text>
              <Text style={styles.statValue}>{currentUser.stats.wonBets}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Best Streak</Text>
              <Text style={styles.statValue}>{currentUser.stats.bestStreak} 🔥</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Member Since</Text>
              <Text style={styles.statValue}>
                {currentUser.joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
            
            <View style={styles.favoriteCategories}>
              <Text style={styles.sectionTitle}>Favorite Categories</Text>
              <View style={styles.categoryTags}>
                {currentUser.favoriteCategories.map((cat, index) => (
                  <View key={index} style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'bets' && (
          <View style={styles.betsContent}>
            <Text style={styles.sectionTitle}>Active Bets</Text>
            {activeBets.map(bet => (
              <View key={bet.id} style={styles.betCard}>
                <Text style={styles.betQuestion}>{bet.question}</Text>
                <View style={styles.betDetails}>
                  <View style={[styles.betSide, bet.side === 'yes' ? styles.yesSide : styles.noSide]}>
                    <Text style={styles.betSideText}>{bet.side.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.betAmount}>${bet.amount}</Text>
                  <Text style={styles.betOdds}>{Math.round(bet.odds * 100)}% odds</Text>
                </View>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent History</Text>
            {betHistory.map(bet => (
              <View key={bet.id} style={styles.betCard}>
                <Text style={styles.betQuestion}>{bet.question}</Text>
                <View style={styles.betDetails}>
                  <View style={[styles.betResult, bet.result === 'won' ? styles.wonBet : styles.lostBet]}>
                    <Text style={styles.betResultText}>
                      {bet.result === 'won' ? '✓ Won' : '✗ Lost'}
                    </Text>
                  </View>
                  <Text style={styles.betAmount}>${bet.amount}</Text>
                  <Text style={[styles.betPayout, bet.result === 'won' && styles.wonPayout]}>
                    {bet.result === 'won' ? `+$${bet.payout}` : '-'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'achievements' && (
          <View style={styles.achievementsContent}>
            {currentUser.achievements.map(achievement => (
              <View key={achievement.id} style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  <Text style={styles.achievementDate}>
                    Unlocked {achievement.unlockedAt.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
            
            <View style={styles.lockedSection}>
              <Text style={styles.lockedTitle}>Locked Achievements</Text>
              <View style={styles.lockedAchievements}>
                <View style={styles.lockedAchievement}>
                  <Text style={styles.lockedIcon}>🔒</Text>
                  <Text style={styles.lockedText}>High Roller</Text>
                </View>
                <View style={styles.lockedAchievement}>
                  <Text style={styles.lockedIcon}>🔒</Text>
                  <Text style={styles.lockedText}>Community Leader</Text>
                </View>
                <View style={styles.lockedAchievement}>
                  <Text style={styles.lockedIcon}>🔒</Text>
                  <Text style={styles.lockedText}>Perfect Month</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  followInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  followStat: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  followValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  followLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  followDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd',
  },
  editProfileButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  editProfileText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  statsOverview: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  tabText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '600',
  },
  tabContent: {
    padding: 20,
  },
  statsContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 15,
    color: '#666',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  favoriteCategories: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  categoryTagText: {
    fontSize: 13,
    color: '#333',
    textTransform: 'capitalize',
  },
  betsContent: {},
  betCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  betQuestion: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  betDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  betSide: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  yesSide: {
    backgroundColor: '#e8f5e9',
  },
  noSide: {
    backgroundColor: '#ffebee',
  },
  betSideText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  betAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  betOdds: {
    fontSize: 13,
    color: '#666',
  },
  betResult: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  wonBet: {
    backgroundColor: '#e8f5e9',
  },
  lostBet: {
    backgroundColor: '#ffebee',
  },
  betResultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  betPayout: {
    fontSize: 14,
    color: '#666',
  },
  wonPayout: {
    color: '#4caf50',
    fontWeight: '600',
  },
  achievementsContent: {},
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    color: '#999',
  },
  lockedSection: {
    marginTop: 24,
  },
  lockedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  lockedAchievements: {
    flexDirection: 'row',
    gap: 12,
  },
  lockedAchievement: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  lockedIcon: {
    fontSize: 24,
    marginBottom: 8,
    opacity: 0.5,
  },
  lockedText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
}); 