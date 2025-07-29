"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BetModal } from "@/components/bet-modal";
import { Bet } from "@/lib/data/mockBets";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MarketCardProps {
  bet: Bet;
}

export function MarketCard({ bet }: MarketCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");

  const handleBetPress = (side: "yes" | "no") => {
    setSelectedSide(side);
    setModalOpen(true);
  };

  // Calculate percentages like Kalshi
  const yesPercentage = Math.round(bet.yesPrice * 100);
  const noPercentage = Math.round(bet.noPrice * 100);

  // Format volume like Kalshi
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}K`;
    }
    return `$${volume}`;
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer border border-gray-200">
        <CardContent className="p-4">
          {/* Market Title */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 leading-tight">
                {bet.name}
              </h3>
            </div>
          </div>

          {/* Outcomes */}
          <div className="space-y-2 mb-4">
            {/* Primary outcome */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Yes</span>
                <span className="text-lg font-semibold text-gray-900">
                  {yesPercentage}%
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50 px-3"
                onClick={() => handleBetPress("yes")}
              >
                Yes
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">No</span>
                <span className="text-lg font-semibold text-gray-900">
                  {noPercentage}%
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50 px-3"
                onClick={() => handleBetPress("no")}
              >
                No
              </Button>
            </div>
          </div>

          {/* Volume and Change */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatVolume(bet.volume)}</span>
            <div className="flex items-center gap-1">
              {bet.change >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
              <span className={bet.change >= 0 ? "text-green-600" : "text-red-600"}>
                {bet.change >= 0 ? "+" : ""}
                {bet.change.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <BetModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        bet={bet}
        side={selectedSide}
      />
    </>
  );
} 