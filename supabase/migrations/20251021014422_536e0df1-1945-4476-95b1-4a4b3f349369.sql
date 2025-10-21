-- Add onboarding mode tracking to launchpad_submissions
ALTER TABLE launchpad_submissions
ADD COLUMN onboarding_mode TEXT DEFAULT 'form' CHECK (onboarding_mode IN ('form', 'chat'));

-- Add conversation ID reference for chat mode
ALTER TABLE launchpad_submissions
ADD COLUMN onboarding_conversation_id UUID REFERENCES chat_conversations(id);

-- Add completion percentage tracking for each stage
ALTER TABLE launchpad_submissions
ADD COLUMN discovery_completeness INTEGER DEFAULT 0 CHECK (discovery_completeness >= 0 AND discovery_completeness <= 100);

ALTER TABLE launchpad_submissions
ADD COLUMN marketing_completeness INTEGER DEFAULT 0 CHECK (marketing_completeness >= 0 AND marketing_completeness <= 100);

ALTER TABLE launchpad_submissions
ADD COLUMN avatar_completeness INTEGER DEFAULT 0 CHECK (avatar_completeness >= 0 AND avatar_completeness <= 100);