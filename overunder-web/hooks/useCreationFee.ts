'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { getEnvironmentConfig, getContractConfig } from '@/lib/contracts/config';
import contractData from '@/lib/contracts/OverunderUpgradeable.json';

export function useCreationFee() {
  const [creationFee, setCreationFee] = useState<number>(0.0033); // Default fallback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const publicClient = usePublicClient();

  useEffect(() => {
    async function fetchCreationFee() {
      if (!publicClient) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get contract config
        const { defaultChainId } = getEnvironmentConfig();
        const contractConfig = getContractConfig(defaultChainId);
        
        // Read creation fee from contract
        const fee = await publicClient.readContract({
          address: contractConfig.overunderAddress,
          abi: contractData.abi,
          functionName: 'creationFee',
        });
        
        const feeInETH = parseFloat(formatEther(fee as bigint));
        setCreationFee(feeInETH);
        
        console.log('📊 Fetched creation fee from contract:', {
          wei: fee.toString(),
          eth: feeInETH,
          usd: `$${(feeInETH * 3000).toFixed(2)}`
        });
        
      } catch (err) {
        console.error('Error fetching creation fee:', err);
        setError('Failed to fetch creation fee');
        // Keep default value on error
      } finally {
        setLoading(false);
      }
    }
    
    fetchCreationFee();
  }, [publicClient]);

  return {
    creationFee,
    creationFeeUSD: creationFee * 3000,
    loading,
    error
  };
}