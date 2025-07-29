import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  FlatList,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { communities, Community } from '../data/mockUsers';

const { width } = Dimensions.get('window');

export const CommunitiesScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [communityList, setCommunityList] = useState(communities);

  const categories = [
    { id: 'all', name: 'All', icon: '🌟' },
    { id: 'sports', name: 'Sports', icon: '🏈' },
    { id: 'entertainment', name: 'Entertainment', icon: '✨' },
    { id: 'tech', name: 'Tech', icon: '🚀' },
    { id: 'politics', name: 'Politics', icon: '🏛️' },
    { id: 'relationships', name: 'Love', icon: '💕' },
  ];

  const filteredCommunities = selectedCategory === 'all' 
    ? communityList 
    : communityList.filter(c => c.category === selectedCategory);

  const handleJoinToggle = (communityId: string) => {
    setCommunityList(prev => 
      prev.map(c => 
        c.id === communityId ? { ...c, isJoined: !c.isJoined } : c
      )
    );
  };

  const renderCommunityCard = ({ item }: { item: Community }) => (
    <TouchableOpacity style={styles.communityCard}>
      <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
      
      <View style={styles.communityInfo}>
        <View style={styles.communityHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.communityIcon}>{item.icon}</Text>
            <Text style={styles.communityName}>{item.name}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.joinButton, item.isJoined && styles.joinedButton]}
            onPress={() => handleJoinToggle(item.id)}
          >
            <Text style={[styles.joinButtonText, item.isJoined && styles.joinedButtonText]}>
              {item.isJoined ? 'Joined' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.communityDescription}>{item.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.memberCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.activeBets}</Text>
            <Text style={styles.statLabel}>Active Bets</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        {item.friendsInCommunity.length > 0 && (
          <View style={styles.friendsSection}>
            <View style={styles.friendAvatars}>
              {item.friendsInCommunity.slice(0, 3).map((friend, index) => (
                <Image 
                  key={friend.id}
                  source={{ uri: friend.avatar }} 
                  style={[styles.friendAvatar, { marginLeft: index > 0 ? -12 : 0 }]}
                />
              ))}
              {item.friendsInCommunity.length > 3 && (
                <View style={[styles.moreAvatars, { marginLeft: -12 }]}>
                  <Text style={styles.moreText}>+{item.friendsInCommunity.length - 3}</Text>
                </View>
              )}
            </View>
            <Text style={styles.friendsText}>
              {item.friendsInCommunity[0].displayName}
              {item.friendsInCommunity.length > 1 && ` and ${item.friendsInCommunity.length - 1} other friends`}
            </Text>
          </View>
        )}

        <View style={styles.trendingSection}>
          <Text style={styles.trendingTitle}>🔥 Trending Bets</Text>
          <View style={styles.trendingBets}>
            {item.trendingBets.slice(0, 2).map((bet, index) => (
              <Text key={index} style={styles.trendingBet} numberOfLines={1}>• {bet}</Text>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communities</Text>
        <Text style={styles.headerSubtitle}>Join groups to bet with like-minded people</Text>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryPill,
              selectedCategory === category.id && styles.categoryPillActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Communities List */}
      <FlatList
        data={filteredCommunities}
        renderItem={renderCommunityCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  categoryScroll: {
    maxHeight: 50,
    marginBottom: 20,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryPillActive: {
    backgroundColor: '#333',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 100,
  },
  communityCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coverImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#ddd',
  },
  communityInfo: {
    padding: 20,
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  communityIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  communityName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  joinButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  joinedButton: {
    backgroundColor: '#e8e8e8',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  joinedButtonText: {
    color: '#333',
  },
  communityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  friendsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  friendAvatars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  friendAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreAvatars: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  friendsText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  trendingSection: {
    marginTop: 4,
  },
  trendingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  trendingBets: {
    gap: 4,
  },
  trendingBet: {
    fontSize: 13,
    color: '#333',
  },
}); 