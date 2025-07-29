export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          username: string | null
          bio: string | null
          profile_pic_url: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          username?: string | null
          bio?: string | null
          profile_pic_url?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          username?: string | null
          bio?: string | null
          profile_pic_url?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      communities: {
        Row: {
          id: string
          name: string
          description: string | null
          image_url: string | null
          creator_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          image_url?: string | null
          creator_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          creator_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      community_members: {
        Row: {
          user_id: string
          community_id: string
          role: 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          user_id: string
          community_id: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          user_id?: string
          community_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
      }
      bets: {
        Row: {
          id: string
          description: string
          bet_type: 'binary' | 'overunder'
          community_id: string | null
          creator_id: string
          deadline: string
          fixed_share_price: number
          resolution_status: 'open' | 'resolved'
          resolved_outcome: string | null
          onchain_bet_id: number | null
          onchain_tx_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          description: string
          bet_type: 'binary' | 'overunder'
          community_id?: string | null
          creator_id: string
          deadline: string
          fixed_share_price?: number
          resolution_status?: 'open' | 'resolved'
          resolved_outcome?: string | null
          onchain_bet_id?: number | null
          onchain_tx_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          description?: string
          bet_type?: 'binary' | 'overunder'
          community_id?: string | null
          creator_id?: string
          deadline?: string
          fixed_share_price?: number
          resolution_status?: 'open' | 'resolved'
          resolved_outcome?: string | null
          onchain_bet_id?: number | null
          onchain_tx_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shares_owned: {
        Row: {
          user_id: string
          bet_id: string
          side: string
          shares_owned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          bet_id: string
          side: string
          shares_owned?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          bet_id?: string
          side?: string
          shares_owned?: number
          created_at?: string
          updated_at?: string
        }
      }
      wallet_balances: {
        Row: {
          user_id: string
          balance: number
          currency: string
          updated_at: string
        }
        Insert: {
          user_id: string
          balance?: number
          currency?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          balance?: number
          currency?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 