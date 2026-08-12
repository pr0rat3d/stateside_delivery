-- Distinguishes a deactivated driver account from one that's simply offline for a shift
ALTER TABLE drivers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
