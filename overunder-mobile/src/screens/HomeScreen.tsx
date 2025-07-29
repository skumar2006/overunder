import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { mockBets, Bet } from '../data/mockBets';
import { BetCard } from '../components/BetCard';

const ITEMS_PER_PAGE = 10;

export const HomeScreen: React.FC = () => {
  const [bets, setBets] = useState<Bet[]>(mockBets.slice(0, ITEMS_PER_PAGE));
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreBets = useCallback(() => {
    if (loading || !hasMore) return;

    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const currentLength = bets.length;
      const newBets = mockBets.slice(currentLength, currentLength + ITEMS_PER_PAGE);
      
      if (newBets.length === 0) {
        setHasMore(false);
      } else {
        setBets(prev => [...prev, ...newBets]);
      }
      
      setLoading(false);
    }, 500);
  }, [bets.length, loading, hasMore]);

  const renderBetCard = ({ item }: { item: Bet }) => (
    <BetCard bet={item} />
  );

  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>This Won't Last</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <View style={[styles.tab, styles.activeTab]}>
          <Text style={styles.tabTextActive}>🔥 Live Bets</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabText}>All Bets</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabText}>Local</Text>
        </View>
        <View style={styles.tab}>
          <Text style={styles.tabText}>Your Frier</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>For You</Text>
    </>
  );

  const renderFooter = () => {
    if (!loading) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#333" />
        <Text style={styles.loadingText}>Loading more bets...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={bets}
        renderItem={renderBetCard}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        onEndReached={loadMoreBets}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: '#e8e8e8',
    borderRadius: 20,
  },
  tabText: {
    color: '#666',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
}); 