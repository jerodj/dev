export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type JournalEntryStatus = 'draft' | 'posted' | 'void';

export interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  parent_account_id: string | null;
  balance: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  status: JournalEntryStatus;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  lines?: JournalEntryLine[];
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account?: ChartOfAccount;
  debit_amount: number;
  credit_amount: number;
  description: string | null;
  created_at: string;
}

export interface FiscalPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface AccountBalance {
  id: string;
  account_id: string;
  account?: ChartOfAccount;
  fiscal_period_id: string;
  fiscal_period?: FiscalPeriod;
  opening_balance: number;
  closing_balance: number;
  total_debits: number;
  total_credits: number;
  created_at: string;
  updated_at: string;
}

export interface TrialBalance {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  balance: number;
}

export interface FinancialStatement {
  period_name: string;
  start_date: string;
  end_date: string;
  sections: FinancialStatementSection[];
  total: number;
}

export interface FinancialStatementSection {
  name: string;
  accounts: FinancialStatementAccount[];
  total: number;
}

export interface FinancialStatementAccount {
  account_code: string;
  account_name: string;
  amount: number;
}
