"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { BetModal } from "@/components/bet-modal";
import { Bet } from "@/lib/data/mockBets";
import { format } from "date-fns";

interface BetCardProps {
  bet: Bet;
}

export function BetCard({ bet }: BetCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");

  const handleBetPress = (side: "yes" | "no") => {
    setSelectedSide(side);
    setModalOpen(true);
  };

  // Format chart data
  const chartData = bet.historicalPrices.map((point) => ({
    date: format(point.date, "MMM d"),
    yesPrice: point.yesPrice,
    noPrice: point.noPrice,
  }));

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48 w-full">
          <Image
            src={bet.picture}
            alt={bet.name}
            fill
            className="object-cover"
          />
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur">
              {bet.category.toUpperCase()}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur">
              {bet.timeLeft}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {bet.name}
          </h3>

          {/* Chart */}
          <div className="h-32 mb-4">
            <ChartContainer
              config={{
                yesPrice: {
                  label: "Yes Price",
                  color: "hsl(142, 76%, 36%)",
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={[0, 1]}
                    ticks={[0, 0.25, 0.5, 0.75, 1]}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="yesPrice"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border rounded shadow-sm">
                            <p className="text-xs font-medium">{payload[0].payload.date}</p>
                            <p className="text-xs text-green-600">
                              Yes: ${payload[0].value?.toFixed(2)}
                            </p>
                            <p className="text-xs text-red-600">
                              No: ${payload[0].payload.noPrice.toFixed(2)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-500">Volume</span>
              <span className="font-medium text-gray-900">
                ${bet.volume.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={bet.change >= 0 ? "text-green-600" : "text-red-600"}>
                {bet.change >= 0 ? "+" : ""}{bet.change.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Betting buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="border-green-200 hover:bg-green-50 hover:border-green-300"
              onClick={() => handleBetPress("yes")}
            >
              <div className="text-center">
                <div className="text-xs text-gray-500">Yes</div>
                <div className="font-semibold text-green-600">
                  ${bet.yesPrice.toFixed(2)}
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={() => handleBetPress("no")}
            >
              <div className="text-center">
                <div className="text-xs text-gray-500">No</div>
                <div className="font-semibold text-red-600">
                  ${bet.noPrice.toFixed(2)}
                </div>
              </div>
            </Button>
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