'use client';

import { useState, useEffect } from 'react';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Navbar } from '@/components/navigation/navbar';
import { Users, Plus, Search, Loader2, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

interface Community {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  creator_id: string;
  member_count: number;
  is_member: boolean;
}

export default function CommunitiesPage() {
  const { user, loading: authLoading } = usePrivyAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    image_url: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (supabase && user) {
      fetchCommunities();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchCommunities = async () => {
    if (!supabase || !user) {
      console.log('🔍 Communities fetch skipped:', { supabase: !!supabase, user: !!user });
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching communities for user:', user.id);

      // First, try to get basic communities data
      const { data: communitiesData, error: communitiesError } = await supabase
        .from('communities')
        .select('*');

      if (communitiesError) {
        console.error('Communities table error:', communitiesError);
        // If communities table doesn't exist, show empty state
        setCommunities([]);
        return;
      }

      console.log('📋 Communities data:', communitiesData);

      // Try to get memberships (this might fail if table doesn't exist)
      let userCommunityIds = new Set<string>();
      try {
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', user.id);

        if (!membershipsError && membershipsData) {
          userCommunityIds = new Set(membershipsData.map(m => m.community_id));
        }
      } catch (membershipError) {
        console.warn('Community members table not available:', membershipError);
      }

      const communitiesWithMembership = communitiesData?.map(community => ({
        ...community,
        member_count: 0, // Default to 0 for now
        is_member: userCommunityIds.has(community.id)
      })) || [];

      setCommunities(communitiesWithMembership);
    } catch (error: unknown) {
      console.error('Error fetching communities:', {
        error,
        message: (error as Error)?.message,
        details: error
      });
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeave = async (communityId: string, isCurrentlyMember: boolean) => {
    if (!supabase || !user) return;

    try {
      if (isCurrentlyMember) {
        // Leave community
        const { error } = await supabase
          .from('community_members')
          .delete()
          .eq('community_id', communityId)
          .eq('user_id', user.id);

        if (error) throw error;
        toast('Left community successfully', 'success');
      } else {
        // Join community
        const { error } = await supabase
          .from('community_members')
          .insert({
            community_id: communityId,
            user_id: user.id,
            role: 'member'
          });

        if (error) throw error;
        toast('Joined community successfully', 'success');
      }

      // Refresh communities
      fetchCommunities();
    } catch (error) {
      console.error('Error joining/leaving community:', error);
      toast('Failed to update membership', 'error');
    }
  };

  const handleCreateCommunity = async () => {
    if (!supabase || !user) {
      toast('Authentication required', 'error');
      return;
    }

    if (!newCommunity.name.trim()) {
      toast('Please enter a community name', 'error');
      return;
    }

    setCreating(true);
    try {
      console.log('🏗️ Creating community:', { 
        name: newCommunity.name.trim(),
        creator_id: user.id 
      });

      const { data, error } = await supabase
        .from('communities')
        .insert({
          name: newCommunity.name.trim(),
          description: newCommunity.description.trim(),
          image_url: newCommunity.image_url.trim() || null,
          creator_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Community creation error:', error);
        throw error;
      }

      console.log('✅ Community created:', data);

      // Try to auto-join the creator as admin (might fail if table doesn't exist)
      try {
        await supabase
          .from('community_members')
          .insert({
            community_id: data.id,
            user_id: user.id,
            role: 'admin'
          });
        console.log('✅ Creator added as admin');
      } catch (memberError) {
        console.warn('Could not add creator as admin (community_members table may not exist):', memberError);
      }

      toast('Community created successfully!', 'success');
      setIsCreateDialogOpen(false);
      setNewCommunity({ name: '', description: '', image_url: '' });
      fetchCommunities();
    } catch (error: unknown) {
      console.error('Error creating community:', {
        error,
        message: (error as Error)?.message,
        details: error
      });
      toast(`Failed to create community: ${(error as Error)?.message || 'Unknown error'}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Communities</h1>
            <p className="text-sm md:text-base text-gray-600">Join prediction markets with like-minded people</p>
            </div>

          {user && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white text-sm md:text-base">
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Create Community</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Community</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Community Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter community name"
                      value={newCommunity.name}
                      onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="What's this community about?"
                      value={newCommunity.description}
                      onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="image">Image URL (Optional)</Label>
                    <Input
                      id="image"
                      placeholder="https://example.com/image.jpg"
                      value={newCommunity.image_url}
                      onChange={(e) => setNewCommunity({ ...newCommunity, image_url: e.target.value })}
                    />
                  </div>
                  
                  <Button
                    onClick={handleCreateCommunity}
                    disabled={creating}
                    className="w-full bg-gray-900 hover:bg-gray-800"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Community'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-md"
          />
              </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
        ) : filteredCommunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map((community) => (
              <div
                key={community.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                {/* Community Image */}
                <div className="mb-4">
                  <img
                    src={community.image_url || `https://picsum.photos/400/200?seed=${community.id}`}
                    alt={community.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                    </div>

                {/* Community Info */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {community.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {community.description || 'No description available'}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-1" />
                    {community.member_count} member{community.member_count !== 1 ? 's' : ''}
                  </div>
                  {community.is_member && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Member
                    </span>
                  )}
                </div>

                {/* Actions */}
                {user && (
                  <Button
                    onClick={() => handleJoinLeave(community.id, community.is_member)}
                    variant={community.is_member ? "outline" : "default"}
                    className="w-full"
                  >
                    {community.is_member ? 'Leave' : 'Join'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No communities found' : 'No communities yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? `No communities match "${searchTerm}"`
                : user 
                  ? 'Be the first to create a community!'
                  : 'Sign in to view and join communities.'
              }
            </p>
            {user && !searchTerm && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Community
              </Button>
            )}
      </div>
        )}
      </main>
    </div>
  );
} 