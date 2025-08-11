'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Users, Clock, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { formatDistanceToNow } from 'date-fns';

interface DisputePanelProps {
  bet: any;
  userId: string;
  onUpdate: () => void;
}

export function DisputePanel({ bet, userId, onUpdate }: DisputePanelProps) {
  const [disputeInfo, setDisputeInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [isDisputing, setIsDisputing] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    fetchDisputeInfo();
  }, [bet.id]);

  const fetchDisputeInfo = async () => {
    try {
      const response = await fetch(`/api/bets/dispute?betId=${bet.id}`);
      const data = await response.json();
      setDisputeInfo(data);
    } catch (error) {
      console.error('Error fetching dispute info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateDispute = async () => {
    if (selectedOutcome === null) {
      toast('Please select your proposed outcome', 'error');
      return;
    }

    setIsDisputing(true);
    try {
      const response = await fetch('/api/bets/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionId: disputeInfo.resolution.id,
          betId: bet.id,
          userId,
          proposedOutcome: selectedOutcome,
          disputeStake: 0.01
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate dispute');
      }

      toast('Dispute initiated! Voting is now open for 48 hours.', 'success');
      fetchDisputeInfo();
      onUpdate();
    } catch (error: any) {
      console.error('Error initiating dispute:', error);
      toast(error.message || 'Failed to initiate dispute', 'error');
    } finally {
      setIsDisputing(false);
    }
  };

  const handleVote = async (outcome: number) => {
    setIsVoting(true);
    try {
      const response = await fetch('/api/bets/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId: disputeInfo.dispute.id,
          userId,
          outcomeChoice: outcome
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cast vote');
      }

      const data = await response.json();
      toast('Vote cast successfully!', 'success');
      fetchDisputeInfo();
      onUpdate();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast(error.message || 'Failed to cast vote', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!disputeInfo?.hasResolution) {
    return null;
  }

  const { resolution, dispute, voteTallies, canVote } = disputeInfo;
  const isWithinDisputePeriod = new Date(resolution.dispute_deadline) > new Date();
  const hasVoted = dispute?.dispute_votes?.some((v: any) => v.voter_id === userId);

  // Calculate winning outcome
  let winningOutcome = resolution.proposed_outcome;
  let maxVotes = voteTallies?.[winningOutcome] || 0;
  if (voteTallies) {
    Object.entries(voteTallies).forEach(([outcome, votes]: [string, any]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winningOutcome = parseInt(outcome);
      }
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          {dispute ? (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              Market Disputed
            </>
          ) : (
            <>
              <Clock className="h-5 w-5 text-blue-500 mr-2" />
              Resolution Proposed
            </>
          )}
        </h3>
        <span className="text-sm text-gray-500">
          {dispute 
            ? `Voting ends ${formatDistanceToNow(new Date(dispute.voting_deadline), { addSuffix: true })}`
            : isWithinDisputePeriod
            ? `Dispute period ends ${formatDistanceToNow(new Date(resolution.dispute_deadline), { addSuffix: true })}`
            : 'Resolution final'
          }
        </span>
      </div>

      {/* Proposed Resolution */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">Creator's Proposed Outcome:</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="font-medium text-blue-900">
            {bet.options?.[resolution.proposed_outcome]}
          </span>
        </div>
      </div>

      {/* Dispute Section */}
      {!dispute && isWithinDisputePeriod && (
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-3">
            If you disagree with this resolution, you can initiate a dispute.
            A 0.01 ETH stake is required (refunded if your outcome wins).
          </p>
          
          <div className="space-y-2 mb-4">
            {bet.options?.map((option: string, index: number) => (
              index !== resolution.proposed_outcome && (
                <button
                  key={index}
                  onClick={() => setSelectedOutcome(index)}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    selectedOutcome === index
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-900">{option}</span>
                </button>
              )
            ))}
          </div>

          <Button
            onClick={handleInitiateDispute}
            disabled={isDisputing || selectedOutcome === null}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isDisputing ? 'Initiating Dispute...' : 'Initiate Dispute (0.01 ETH)'}
          </Button>
        </div>
      )}

      {/* Voting Section */}
      {dispute && (
        <div className="border-t pt-4">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Disputed Outcome:</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <span className="font-medium text-amber-900">
                {bet.options?.[dispute.proposed_outcome]}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Current Vote Tally:</p>
            <div className="space-y-2">
              {bet.options?.map((option: string, index: number) => {
                const votes = voteTallies?.[index] || 0;
                const totalVotes = Object.values(voteTallies || {}).reduce((sum: number, v: any) => sum + v, 0);
                const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                const isWinning = index === winningOutcome;

                return (
                  <div key={index} className="relative">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">{option}</span>
                        {isWinning && (
                          <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600">
                        {percentage.toFixed(1)}% ({votes.toFixed(2)} weight)
                      </span>
                    </div>
                    <div 
                      className={`absolute bottom-0 left-0 h-1 rounded-b-lg transition-all ${
                        isWinning ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {canVote && !hasVoted && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Cast your vote (weighted by your stake in this market):
              </p>
              <div className="grid grid-cols-2 gap-3">
                {bet.options?.map((option: string, index: number) => (
                  <Button
                    key={index}
                    onClick={() => handleVote(index)}
                    disabled={isVoting}
                    variant={index === resolution.proposed_outcome ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {hasVoted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-900">
                  You have voted in this dispute
                </span>
              </div>
            </div>
          )}

          {dispute.dispute_votes && dispute.dispute_votes.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Recent Votes:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {dispute.dispute_votes.slice(-5).map((vote: any) => (
                  <div key={vote.id} className="text-xs text-gray-600 flex justify-between">
                    <span>{vote.voter.username || 'Anonymous'}</span>
                    <span>{bet.options?.[vote.outcome_choice]} ({vote.vote_weight.toFixed(2)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}