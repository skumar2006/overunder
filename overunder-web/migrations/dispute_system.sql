-- Create dispute_resolutions table
CREATE TABLE IF NOT EXISTS dispute_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bet_id UUID NOT NULL REFERENCES bets(id),
    onchain_bet_id INTEGER NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),
    proposed_outcome INTEGER NOT NULL,
    proposed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dispute_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, disputed, resolved
    final_outcome INTEGER,
    resolved_at TIMESTAMP WITH TIME ZONE,
    tx_hash VARCHAR(66),
    UNIQUE(bet_id)
);

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resolution_id UUID NOT NULL REFERENCES dispute_resolutions(id),
    bet_id UUID NOT NULL REFERENCES bets(id),
    onchain_bet_id INTEGER NOT NULL,
    initiator_id UUID NOT NULL REFERENCES users(id),
    proposed_outcome INTEGER NOT NULL,
    dispute_stake DECIMAL(20, 8) DEFAULT 0.01,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    voting_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, resolved
    tx_hash VARCHAR(66)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS dispute_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id),
    voter_id UUID NOT NULL REFERENCES users(id),
    outcome_choice INTEGER NOT NULL,
    vote_weight DECIMAL(20, 8) NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tx_hash VARCHAR(66),
    UNIQUE(dispute_id, voter_id)
);

-- Create indexes for performance
CREATE INDEX idx_dispute_resolutions_bet_id ON dispute_resolutions(bet_id);
CREATE INDEX idx_dispute_resolutions_status ON dispute_resolutions(status);
CREATE INDEX idx_disputes_resolution_id ON disputes(resolution_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_dispute_votes_dispute_id ON dispute_votes(dispute_id);
CREATE INDEX idx_dispute_votes_voter_id ON dispute_votes(voter_id);

-- Add dispute fields to bets table if not exists
ALTER TABLE bets 
ADD COLUMN IF NOT EXISTS resolution_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS proposed_outcome INTEGER,
ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS resolution_tx_hash VARCHAR(66);

-- Create view for dispute statistics
CREATE OR REPLACE VIEW dispute_stats AS
SELECT 
    dr.bet_id,
    dr.onchain_bet_id,
    dr.proposed_outcome as creator_outcome,
    d.proposed_outcome as disputer_outcome,
    dr.status,
    COUNT(DISTINCT dv.voter_id) as total_voters,
    SUM(dv.vote_weight) as total_vote_weight,
    dr.dispute_deadline,
    d.voting_deadline,
    b.description as bet_description
FROM dispute_resolutions dr
LEFT JOIN disputes d ON dr.id = d.resolution_id
LEFT JOIN dispute_votes dv ON d.id = dv.dispute_id
LEFT JOIN bets b ON dr.bet_id = b.id
GROUP BY dr.bet_id, dr.onchain_bet_id, dr.proposed_outcome, 
         d.proposed_outcome, dr.status, dr.dispute_deadline, d.voting_deadline, b.description;

-- RLS Policies
ALTER TABLE dispute_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_votes ENABLE ROW LEVEL SECURITY;

-- Policies for dispute_resolutions
CREATE POLICY "Users can view all resolutions" ON dispute_resolutions
    FOR SELECT USING (true);

CREATE POLICY "Bet creators can insert resolutions" ON dispute_resolutions
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Bet creators can update their resolutions" ON dispute_resolutions
    FOR UPDATE USING (creator_id = auth.uid());

-- Policies for disputes
CREATE POLICY "Users can view all disputes" ON disputes
    FOR SELECT USING (true);

CREATE POLICY "Bet participants can create disputes" ON disputes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shares_owned 
            WHERE shares_owned.bet_id = disputes.bet_id 
            AND shares_owned.user_id = auth.uid()
        )
    );

-- Policies for dispute_votes
CREATE POLICY "Users can view all votes" ON dispute_votes
    FOR SELECT USING (true);

CREATE POLICY "Participants can vote once" ON dispute_votes
    FOR INSERT WITH CHECK (
        voter_id = auth.uid() AND
        NOT EXISTS (
            SELECT 1 FROM dispute_votes dv
            WHERE dv.dispute_id = dispute_votes.dispute_id
            AND dv.voter_id = auth.uid()
        )
    );

-- Function to check if user can vote
CREATE OR REPLACE FUNCTION can_user_vote(
    p_bet_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM shares_owned 
        WHERE bet_id = p_bet_id 
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate vote weight
CREATE OR REPLACE FUNCTION calculate_vote_weight(
    p_bet_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    total_stake DECIMAL;
BEGIN
    SELECT COALESCE(SUM(shares_owned), 0) INTO total_stake
    FROM shares_owned
    WHERE bet_id = p_bet_id AND user_id = p_user_id;
    
    RETURN total_stake;
END;
$$ LANGUAGE plpgsql;