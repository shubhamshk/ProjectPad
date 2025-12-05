ALTER TABLE profiles ALTER COLUMN credits SET DEFAULT 5000;

UPDATE profiles 
SET credits = 5000 
WHERE credits <= 300 AND plan = 'free';
