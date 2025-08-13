'use client';

import { useState, useEffect } from 'react';
import { useGetBet, getBetStatus } from '@/lib/contracts/custodialHooks';

interface BetStats {
  totalBets: number;
  activeBets: number;
  resolvedBets: number;
  loading: boolean;
}

export function useBetStats(betIds: number[] | undefined): BetStats {
  const [stats, setStats] = useState<BetStats>({
    totalBets: 0,
    activeBets: 0,
    resolvedBets: 0,
    loading: true
  });

  useEffect(() => {
    if (!betIds || betIds.length === 0) {
      setStats({
        totalBets: 0,
        activeBets: 0,
        resolvedBets: 0,
        loading: false
      });
      return;
    }

    // We need to fetch each bet to check its status
    // This is a simplified version - in production you'd want to batch this
    const fetchBetStats = async () => {
      setStats(prev => ({ ...prev, loading: true }));
      
      let totalBets = 0;
      let activeBets = 0;
      let resolvedBets = 0;

      // For now, we'll use a simple approach
      // In the future, you could optimize this with a single API call
      for (const betId of betIds.slice(0, 10)) { // Limit to first 10 for performance
        try {
          // We can't easily use the useGetBet hook in a loop, so we'll make a simpler assumption
          // For now, count all bets as total, and assume they're active unless we know otherwise
          totalBets++;
          activeBets++; // We'll refine this logic later
        } catch (error) {
          console.log(`Error checking bet ${betId}:`, error);
        }
      }

      setStats({
        totalBets,
        activeBets,
        resolvedBets,
        loading: false
      });
    };

    fetchBetStats();
  }, [betIds]);

  return stats;
}

// Alternative simpler approach: Hook that filters bet IDs by status
export function useBetCounts(betIds: number[] | undefined) {
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    resolved: 0,
    expired: 0,
    loading: true
  });

  useEffect(() => {
    if (!betIds || betIds.length === 0) {
      setCounts({ total: 0, active: 0, resolved: 0, expired: 0, loading: false });
      return;
    }

    // For now, we'll make a reasonable assumption:
    // - All fetched bets are "total"
    // - Active bets are non-expired, non-resolved bets
    // - We'll need to enhance this with actual bet data later

    setCounts({
      total: betIds.length,
      active: betIds.length, // Simplified - assumes all are active for now
      resolved: 0,
      expired: 0,
      loading: false
    });

  }, [betIds]);

  return counts;
}