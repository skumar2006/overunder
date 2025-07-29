"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { currentUser } from "@/lib/data/mockUsers";
import { Settings, DollarSign, Target, TrendingUp, Trophy } from "lucide-react";
import { format } from "date-fns";

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState("positions");

  // Mock active positions
  const activePositions = [
    { id: '1', question: 'Will Lakers make the playoffs?', side: 'yes', shares: 50, avgPrice: 0.65, currentPrice: 0.68, pnl: 1.5 },
    { id: '2', question: 'Will Taylor Swift get engaged?', side: 'no', shares: 25, avgPrice: 0.22, currentPrice: 0.18, pnl: 1.0 },
    { id: '3', question: 'Will Bitcoin hit $100k?', side: 'yes', shares: 100, avgPrice: 0.42, currentPrice: 0.45, pnl: 3.0 },
  ];

  const completedPositions = [
    { id: '4', question: 'Will Marvel movie hit $1B?', side: 'yes', shares: 30, avgPrice: 0.60, result: 'won', pnl: 12.0 },
    { id: '5', question: 'Will Cowboys win Super Bowl?', side: 'no', shares: 50, avgPrice: 0.80, result: 'lost', pnl: -40.0 },
    { id: '6', question: 'Will Apple release AR glasses?', side: 'yes', shares: 75, avgPrice: 0.35, result: 'won', pnl: 48.75 },
  ];

  const totalPnL = [...activePositions, ...completedPositions].reduce((sum, pos) => sum + pos.pnl, 0);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-600">Track your positions and performance</p>
        </div>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total P&L</p>
                <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Win Rate</p>
                <p className="text-xl font-bold text-gray-900">{currentUser.stats.winRate}%</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Positions</p>
                <p className="text-xl font-bold text-gray-900">{activePositions.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Trades</p>
                <p className="text-xl font-bold text-gray-900">{currentUser.stats.totalBets}</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="positions">Active Positions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePositions.map(position => (
                  <div key={position.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{position.question}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <Badge variant={position.side === 'yes' ? 'default' : 'destructive'}>
                          {position.side.toUpperCase()}
                        </Badge>
                        <span>{position.shares} shares @ {(position.avgPrice * 100).toFixed(0)}¢</span>
                        <span>Current: {(position.currentPrice * 100).toFixed(0)}¢</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {((position.pnl / (position.shares * position.avgPrice)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Trading History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedPositions.map(position => (
                  <div key={position.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{position.question}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <Badge 
                          variant={position.result === 'won' ? 'default' : 'destructive'}
                        >
                          {position.result === 'won' ? '✓ Won' : '✗ Lost'}
                        </Badge>
                        <span>{position.shares} shares @ {(position.avgPrice * 100).toFixed(0)}¢</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {((position.pnl / (position.shares * position.avgPrice)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 