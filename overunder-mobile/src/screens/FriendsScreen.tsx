import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  FlatList,
  TextInput
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { friends, recommendedFriends, User } from '../data/mockUsers';

export const FriendsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'friends' | 'discover'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  const handleFollowToggle = (userId: string) => {
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const filteredFriends = friends.filter(friend =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRecommendedCard = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.recommendedCard}>
      <Image source={{ uri: item.avatar }} style={styles.recommendedAvatar} />
      <View style={styles.recommendedInfo}>
        <Text style={styles.recommendedName}>{item.displayName}</Text>
        <Text style={styles.recommendedUsername}>@{item.username}</Text>
        
        {/* Recommendation Reason */}
        <View style={styles.recommendReason}>
          {item.mutualFriends && item.mutualFriends > 0 && (
            <Text style={styles.reasonText}>👥 {item.mutualFriends} mutual friends</Text>
          )}
          {item.commonCommunities && item.commonCommunities.length > 0 && (
            <Text style={styles.reasonText}>🏘️ In {item.commonCommunities[0]}</Text>
          )}
          <Text style={styles.reasonText}>🎯 {item.stats.winRate}% win rate</Text>
        </View>

        {/* Stats Preview */}
        <View style={styles.miniStats}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>{item.stats.totalBets}</Text>
            <Text style={styles.miniStatLabel}>Bets</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>${item.stats.totalEarnings}</Text>
            <Text style={styles.miniStatLabel}>Earnings</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatValue}>{item.followers}</Text>
            <Text style={styles.miniStatLabel}>Followers</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.followButton, followedUsers.has(item.id) && styles.followingButton]}
        onPress={() => handleFollowToggle(item.id)}
      >
        <Text style={[styles.followButtonText, followedUsers.has(item.id) && styles.followingButtonText]}>
          {followedUsers.has(item.id) ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFriendCard = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.friendCard}>
      <Image source={{ uri: item.avatar }} style={styles.friendAvatar} />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.displayName}</Text>
        <Text style={styles.friendUsername}>@{item.username}</Text>
        <Text style={styles.friendBio} numberOfLines={1}>{item.bio}</Text>
      </View>
      <TouchableOpacity style={styles.messageButton}>
        <Text style={styles.messageIcon}>💬</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.filter(f => f.isFollowing).length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'discover' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Quick Add Section */}
          <View style={styles.quickAddSection}>
            <Text style={styles.sectionTitle}>Quick Add</Text>
            <Text style={styles.sectionSubtitle}>People you might know</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickAddScroll}
            >
              {recommendedFriends.slice(0, 5).map(user => (
                <TouchableOpacity key={user.id} style={styles.quickAddCard}>
                  <Image source={{ uri: user.avatar }} style={styles.quickAddAvatar} />
                  <Text style={styles.quickAddName} numberOfLines={1}>
                    {user.displayName.split(' ')[0]}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.quickAddButton, followedUsers.has(user.id) && styles.quickAddFollowing]}
                    onPress={() => handleFollowToggle(user.id)}
                  >
                    <Text style={styles.quickAddButtonText}>
                      {followedUsers.has(user.id) ? '✓' : '+'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Recommended Friends List */}
          <View style={styles.recommendedSection}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <Text style={styles.sectionSubtitle}>Based on your betting patterns</Text>
            <FlatList
              data={recommendedFriends}
              renderItem={renderRecommendedCard}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredFriends.filter(f => f.isFollowing)}
          renderItem={renderFriendCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.friendsList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptyText}>
                Switch to Discover tab to find people to follow
              </Text>
            </View>
          }
        />
      )}
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
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
  quickAddSection: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  quickAddScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  quickAddCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: 100,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  quickAddAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  quickAddName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  quickAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddFollowing: {
    backgroundColor: '#e8e8e8',
  },
  quickAddButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  recommendedSection: {
    paddingBottom: 100,
  },
  recommendedCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recommendedAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  recommendedInfo: {
    flex: 1,
  },
  recommendedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recommendedUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recommendReason: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  miniStats: {
    flexDirection: 'row',
    gap: 16,
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  miniStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: '#e8e8e8',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  followingButtonText: {
    color: '#333',
  },
  friendsList: {
    paddingBottom: 100,
  },
  friendCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  friendBio: {
    fontSize: 13,
    color: '#999',
  },
  messageButton: {
    padding: 8,
  },
  messageIcon: {
    fontSize: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
}); 