"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { friends, recommendedFriends, User } from "@/lib/data/mockUsers";
import { Search, MessageCircle, UserPlus, Users as UsersIcon } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
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

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="pt-8 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Friends</h1>
        <p className="text-gray-600">Connect with other bettors</p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search friends..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="discover" className="mb-20">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="friends">
            Friends ({friends.filter(f => f.isFollowing).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-6">
          {/* Quick Add Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Quick Add</h2>
            <p className="text-sm text-gray-600 mb-4">People you might know</p>
            
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {recommendedFriends.slice(0, 5).map(user => (
                  <Card key={user.id} className="w-32 flex-shrink-0">
                    <CardContent className="p-4 text-center">
                      <Avatar className="w-16 h-16 mx-auto mb-2">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <h4 className="font-medium text-sm truncate mb-2">
                        {user.displayName.split(' ')[0]}
                      </h4>
                      <Button
                        size="sm"
                        variant={followedUsers.has(user.id) ? "secondary" : "default"}
                        className="w-full"
                        onClick={() => handleFollowToggle(user.id)}
                      >
                        {followedUsers.has(user.id) ? "Following" : "Follow"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Recommended Friends List */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Recommended for You</h2>
            <p className="text-sm text-gray-600 mb-4">Based on your betting patterns</p>
            
            <div className="space-y-3">
              {recommendedFriends.map(user => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{user.displayName}</h4>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={followedUsers.has(user.id) ? "secondary" : "default"}
                            onClick={() => handleFollowToggle(user.id)}
                          >
                            {followedUsers.has(user.id) ? "Following" : "Follow"}
                          </Button>
                        </div>

                        {/* Recommendation Reasons */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {user.mutualFriends && user.mutualFriends > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <UsersIcon className="w-3 h-3 mr-1" />
                              {user.mutualFriends} mutual friends
                            </Badge>
                          )}
                          {user.commonCommunities && user.commonCommunities.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              🏘️ In {user.commonCommunities[0]}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            🎯 {user.stats.winRate}% win rate
                          </Badge>
                        </div>

                        {/* Mini Stats */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-semibold text-gray-900">{user.stats.totalBets}</span>
                            <span className="text-gray-500 ml-1">Bets</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">${user.stats.totalEarnings}</span>
                            <span className="text-gray-500 ml-1">Earnings</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">{user.followers}</span>
                            <span className="text-gray-500 ml-1">Followers</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="friends">
          {filteredFriends.filter(f => f.isFollowing).length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <UsersIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No friends yet</h3>
                <p className="text-gray-600 mb-4">Switch to Discover tab to find people to follow</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredFriends.filter(f => f.isFollowing).map(friend => (
                <Card key={friend.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>{friend.displayName[0]}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{friend.displayName}</h4>
                        <p className="text-sm text-gray-500">@{friend.username}</p>
                        <p className="text-sm text-gray-600 truncate">{friend.bio}</p>
                      </div>
                      
                      <Button size="sm" variant="ghost">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 