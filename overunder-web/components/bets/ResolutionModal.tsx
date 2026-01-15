'use client';

import { useState } from 'react';
import { X, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { usePrivyResolveBet } from '@/lib/contracts/privyResolutionHooks';

interface ResolutionModalProps {
  bet: any;
  onClose: () => void;
  onResolutionProposed: () => void;
  userId: string;
}

export function ResolutionModal({ bet, onClose, onResolutionProposed, userId }: ResolutionModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resolveBet } = usePrivyResolveBet();
  
  console.log('🎯 ResolutionModal rendered!', { bet: bet?.id, userId });

  const isCreator = bet.creator_id === userId;
  const canResolve = isCreator && !bet.isResolved;
  
  console.log('🔍 ResolutionModal canResolve check:', {
    isCreator,
    isResolved: bet.isResolved,
    canResolve,
    userId,
    creatorId: bet.creator_id
  });

  const handlePropose = async () => {
    if (selectedOutcome === null) {
      toast('Please select an outcome', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // On-chain resolution
      const res = await resolveBet(parseInt(bet.onchain_bet_id ?? bet.id), selectedOutcome);
      if (!res.success) {
        throw new Error(res.error || 'Failed to resolve on-chain');
      }

      // Update database with resolution
      const resolvedLabel = bet.options?.[selectedOutcome]?.toLowerCase().includes('yes') ? 'yes'
        : bet.options?.[selectedOutcome]?.toLowerCase().includes('no') ? 'no'
        : bet.options?.[selectedOutcome]?.toLowerCase().includes('over') ? 'over'
        : bet.options?.[selectedOutcome]?.toLowerCase().includes('under') ? 'under'
        : String(selectedOutcome);
        
      console.log('🔄 Updating database with resolution:', {
        betId: bet.id,
        selectedOutcome,
        resolvedLabel,
        option: bet.options?.[selectedOutcome]
      });
      
      const dbResponse = await fetch('/api/bets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bet.id,
          updates: { 
            resolution_status: 'resolved', 
            resolved_outcome: resolvedLabel,
            resolution_tx_hash: res.transactionHash 
          }
        })
      });
      
      if (!dbResponse.ok) {
        const errorData = await dbResponse.json();
        console.error('❌ Database update failed:', errorData);
        throw new Error(`Database update failed: ${errorData.error}`);
      }
      
      console.log('✅ Database updated successfully');

      toast('Market resolved on-chain. Winners can now claim.', 'success');
      onResolutionProposed();
      onClose();
    } catch (error: any) {
      console.error('Error proposing resolution:', error);
      toast(error.message || 'Failed to propose resolution', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canResolve) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Resolve Market</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">{bet.question}</h3>
            <p className="text-sm text-gray-600">{bet.description}</p>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Select the winning outcome:
            </p>
            <div className="space-y-2">
              {bet.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedOutcome(index)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedOutcome === index
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{option}</span>
                    {bet.odds && (
                      <span className="text-sm text-gray-500">
                        {bet.odds[index]?.toFixed(1)}% odds
                      </span>
                    )}
                  </div>
                  {bet.totalPool && (
                    <div className="mt-2 text-xs text-gray-500">
                      Pool: ${(parseFloat(bet.totalPool) * (bet.odds[index] / 100)).toFixed(2)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 mb-1">Important:</p>
                <ul className="text-amber-800 space-y-1">
                  <li>• Participants have 24 hours to dispute this resolution</li>
                  <li>• If disputed, all participants can vote on the outcome</li>
                  <li>• The outcome with the most votes (weighted by stake) wins</li>
                  <li>• Be honest - your reputation is at stake</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePropose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting || selectedOutcome === null}
            >
              {isSubmitting ? 'Proposing...' : 'Propose Resolution'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}