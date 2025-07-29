"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Bet } from "@/lib/data/mockBets";

interface BetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bet: Bet;
  side: "yes" | "no";
}

export function BetModal({ open, onOpenChange, bet, side }: BetModalProps) {
  const [betAmount, setBetAmount] = useState([10]);
  
  const selectedPrice = side === "yes" ? bet.yesPrice : bet.noPrice;
  const chance = selectedPrice * 100;
  const payout = betAmount[0] / selectedPrice;

  const handlePlaceBet = () => {
    console.log(`Placing ${side} bet for $${betAmount[0]} on "${bet.name}"`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Place Your Bet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bet Info */}
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden">
              <Image
                src={bet.picture}
                alt={bet.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{bet.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={side === "yes" ? "default" : "destructive"}>
                  {side.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500">
                  ${selectedPrice.toFixed(2)} · {chance.toFixed(1)}% chance
                </span>
              </div>
            </div>
          </div>

          {/* Amount Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Bet Amount
              </label>
              <span className="text-lg font-semibold text-gray-900">
                ${betAmount[0]}
              </span>
            </div>
            <Slider
              value={betAmount}
              onValueChange={setBetAmount}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>$1</span>
              <span>$100</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Bet Amount</span>
              <span className="font-medium">${betAmount[0]}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Potential Payout</span>
              <span className="font-medium text-green-600">
                ${payout.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Potential Profit</span>
              <span className="font-medium text-green-600">
                ${(payout - betAmount[0]).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePlaceBet}
              className={side === "yes" 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"
              }
            >
              Place Bet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 