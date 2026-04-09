-- Migration: Add missing columns to events table for enhanced mission details
-- Perfection Airsoft — Dashboard Upgrade
-- Date: 2026-04-08

DO $$ 
BEGIN
    -- Add engagement_rules column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='engagement_rules') THEN
        ALTER TABLE public.events ADD COLUMN engagement_rules TEXT[] DEFAULT '{}';
    END IF;

    -- Add mission_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='mission_type') THEN
        ALTER TABLE public.events ADD COLUMN mission_type TEXT;
    END IF;

    -- Add game_mode column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='game_mode') THEN
        ALTER TABLE public.events ADD COLUMN game_mode TEXT;
    END IF;

END $$;
