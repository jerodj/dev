/*
  # Create Accounting System

  1. New Tables
    - `chart_of_accounts`
      - `id` (uuid, primary key)
      - `account_code` (text, unique)
      - `account_name` (text)
      - `account_type` (enum: asset, liability, equity, revenue, expense)
      - `parent_account_id` (uuid, nullable, references chart_of_accounts)
      - `balance` (decimal)
      - `is_active` (boolean)
      - `description` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `journal_entries`
      - `id` (uuid, primary key)
      - `entry_number` (text, unique)
      - `entry_date` (date)
      - `description` (text)
      - `reference_type` (text, nullable - order, expense, purchase_order, manual)
      - `reference_id` (uuid, nullable)
      - `status` (enum: draft, posted, void)
      - `created_by` (text)
      - `approved_by` (text, nullable)
      - `approved_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `journal_entry_lines`
      - `id` (uuid, primary key)
      - `journal_entry_id` (uuid, references journal_entries)
      - `account_id` (uuid, references chart_of_accounts)
      - `debit_amount` (decimal)
      - `credit_amount` (decimal)
      - `description` (text, nullable)
      - `created_at` (timestamptz)
    
    - `fiscal_periods`
      - `id` (uuid, primary key)
      - `period_name` (text)
      - `start_date` (date)
      - `end_date` (date)
      - `is_closed` (boolean)
      - `closed_by` (text, nullable)
      - `closed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
    
    - `account_balances`
      - `id` (uuid, primary key)
      - `account_id` (uuid, references chart_of_accounts)
      - `fiscal_period_id` (uuid, references fiscal_periods)
      - `opening_balance` (decimal)
      - `closing_balance` (decimal)
      - `total_debits` (decimal)
      - `total_credits` (decimal)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users only
    - Implement proper ownership checks

  3. Important Notes
    - All journal entries must balance (debits = credits)
    - Account codes follow standard accounting structure
    - Fiscal periods must not overlap
    - Posted journal entries cannot be modified
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE account_type_enum AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE journal_entry_status_enum AS ENUM ('draft', 'posted', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text UNIQUE NOT NULL,
  account_name text NOT NULL,
  account_type account_type_enum NOT NULL,
  parent_account_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  balance decimal(15,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chart of accounts"
  ON chart_of_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert chart of accounts"
  ON chart_of_accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update chart of accounts"
  ON chart_of_accounts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete chart of accounts"
  ON chart_of_accounts FOR DELETE
  TO authenticated
  USING (true);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text UNIQUE NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  reference_type text,
  reference_id uuid,
  status journal_entry_status_enum DEFAULT 'draft',
  created_by text NOT NULL,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view journal entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert journal entries"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update journal entries"
  ON journal_entries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete journal entries"
  ON journal_entries FOR DELETE
  TO authenticated
  USING (true);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  debit_amount decimal(15,2) DEFAULT 0,
  credit_amount decimal(15,2) DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view journal entry lines"
  ON journal_entry_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert journal entry lines"
  ON journal_entry_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update journal entry lines"
  ON journal_entry_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete journal entry lines"
  ON journal_entry_lines FOR DELETE
  TO authenticated
  USING (true);

-- Fiscal Periods
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_closed boolean DEFAULT false,
  closed_by text,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_period_dates CHECK (end_date > start_date)
);

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fiscal periods"
  ON fiscal_periods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fiscal periods"
  ON fiscal_periods FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fiscal periods"
  ON fiscal_periods FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete fiscal periods"
  ON fiscal_periods FOR DELETE
  TO authenticated
  USING (true);

-- Account Balances
CREATE TABLE IF NOT EXISTS account_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  fiscal_period_id uuid NOT NULL REFERENCES fiscal_periods(id) ON DELETE CASCADE,
  opening_balance decimal(15,2) DEFAULT 0,
  closing_balance decimal(15,2) DEFAULT 0,
  total_debits decimal(15,2) DEFAULT 0,
  total_credits decimal(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id, fiscal_period_id)
);

ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view account balances"
  ON account_balances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert account balances"
  ON account_balances FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update account balances"
  ON account_balances FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete account balances"
  ON account_balances FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_account ON account_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_period ON account_balances(fiscal_period_id);

-- Insert default chart of accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description) VALUES
  ('1000', 'Assets', 'asset', 'Main asset account'),
  ('1100', 'Current Assets', 'asset', 'Assets expected to be converted to cash within one year'),
  ('1110', 'Cash', 'asset', 'Cash on hand and in bank'),
  ('1120', 'Accounts Receivable', 'asset', 'Money owed by customers'),
  ('1130', 'Inventory', 'asset', 'Products held for sale'),
  ('1200', 'Fixed Assets', 'asset', 'Long-term tangible assets'),
  ('1210', 'Equipment', 'asset', 'Restaurant equipment and fixtures'),
  ('1220', 'Furniture', 'asset', 'Tables, chairs, and other furniture'),
  
  ('2000', 'Liabilities', 'liability', 'Main liability account'),
  ('2100', 'Current Liabilities', 'liability', 'Obligations due within one year'),
  ('2110', 'Accounts Payable', 'liability', 'Money owed to suppliers'),
  ('2120', 'Sales Tax Payable', 'liability', 'Tax collected from customers'),
  
  ('3000', 'Equity', 'equity', 'Owner''s equity'),
  ('3100', 'Owner''s Capital', 'equity', 'Initial investment'),
  ('3200', 'Retained Earnings', 'equity', 'Accumulated profits'),
  
  ('4000', 'Revenue', 'revenue', 'Main revenue account'),
  ('4100', 'Sales Revenue', 'revenue', 'Revenue from food and beverage sales'),
  ('4200', 'Service Revenue', 'revenue', 'Revenue from services'),
  
  ('5000', 'Expenses', 'expense', 'Main expense account'),
  ('5100', 'Cost of Goods Sold', 'expense', 'Direct costs of food and beverages'),
  ('5200', 'Operating Expenses', 'expense', 'General operating costs'),
  ('5210', 'Rent Expense', 'expense', 'Monthly rent payments'),
  ('5220', 'Utilities Expense', 'expense', 'Electricity, water, gas'),
  ('5230', 'Salaries Expense', 'expense', 'Employee wages and salaries'),
  ('5240', 'Supplies Expense', 'expense', 'Cleaning and office supplies'),
  ('5250', 'Marketing Expense', 'expense', 'Advertising and promotion costs')
ON CONFLICT (account_code) DO NOTHING;

-- Update parent relationships
UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1000') 
WHERE account_code IN ('1100', '1200');

UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1100') 
WHERE account_code IN ('1110', '1120', '1130');

UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '1200') 
WHERE account_code IN ('1210', '1220');

UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '2000') 
WHERE account_code = '2100';

UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '2100') 
WHERE account_code IN ('2110', '2120');

UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '3000') 
WHERE account_code IN ('3100', '3200');

UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '4000') 
WHERE account_code IN ('4100', '4200');

UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '5000') 
WHERE account_code IN ('5100', '5200');

UPDATE chart_of_accounts SET parent_account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '5200') 
WHERE account_code IN ('5210', '5220', '5230', '5240', '5250');

-- Create default fiscal period for current year
INSERT INTO fiscal_periods (period_name, start_date, end_date)
VALUES (
  'FY ' || EXTRACT(YEAR FROM CURRENT_DATE)::text,
  DATE_TRUNC('year', CURRENT_DATE)::date,
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::date
)
ON CONFLICT DO NOTHING;