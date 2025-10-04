import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import {
  ChartOfAccount,
  JournalEntry,
  JournalEntryLine,
  FiscalPeriod,
  AccountBalance,
  TrialBalance,
  FinancialStatement,
  AccountType
} from '../types/accounting';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AccountingState {
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  fiscalPeriods: FiscalPeriod[];
  accountBalances: AccountBalance[];
  loading: boolean;
  error: string | null;

  fetchChartOfAccounts: () => Promise<void>;
  createAccount: (data: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<ChartOfAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  fetchJournalEntries: (filters?: { status?: string; startDate?: string; endDate?: string }) => Promise<void>;
  createJournalEntry: (data: Omit<JournalEntry, 'id' | 'entry_number' | 'created_at' | 'updated_at'>, lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id' | 'created_at'>[]) => Promise<void>;
  postJournalEntry: (id: string, userId: string) => Promise<void>;
  voidJournalEntry: (id: string, userId: string) => Promise<void>;

  fetchFiscalPeriods: () => Promise<void>;
  createFiscalPeriod: (data: Omit<FiscalPeriod, 'id' | 'created_at'>) => Promise<void>;
  closeFiscalPeriod: (id: string, userId: string) => Promise<void>;

  fetchAccountBalances: (fiscalPeriodId?: string) => Promise<void>;
  getTrialBalance: (fiscalPeriodId?: string) => Promise<TrialBalance[]>;
  getBalanceSheet: (fiscalPeriodId?: string) => Promise<FinancialStatement>;
  getIncomeStatement: (fiscalPeriodId?: string) => Promise<FinancialStatement>;

  clearError: () => void;
}

export const useAccountingStore = create<AccountingState>()(
  persist(
    (set, get) => ({
      chartOfAccounts: [],
      journalEntries: [],
      fiscalPeriods: [],
      accountBalances: [],
      loading: false,
      error: null,

      fetchChartOfAccounts: async () => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('is_active', true)
            .order('account_code');

          if (error) throw error;
          set({ chartOfAccounts: data || [], loading: false });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to fetch chart of accounts';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      createAccount: async (data) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase
            .from('chart_of_accounts')
            .insert([data]);

          if (error) throw error;
          await get().fetchChartOfAccounts();
          toast.success('Account created successfully!');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to create account';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      updateAccount: async (id, data) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase
            .from('chart_of_accounts')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (error) throw error;
          await get().fetchChartOfAccounts();
          toast.success('Account updated successfully!');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to update account';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      deleteAccount: async (id) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase
            .from('chart_of_accounts')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (error) throw error;
          await get().fetchChartOfAccounts();
          toast.success('Account deleted successfully!');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to delete account';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      fetchJournalEntries: async (filters = {}) => {
        set({ loading: true, error: null });
        try {
          let query = supabase
            .from('journal_entries')
            .select(`
              *,
              lines:journal_entry_lines(
                *,
                account:chart_of_accounts(*)
              )
            `)
            .order('entry_date', { ascending: false });

          if (filters.status) {
            query = query.eq('status', filters.status);
          }
          if (filters.startDate) {
            query = query.gte('entry_date', filters.startDate);
          }
          if (filters.endDate) {
            query = query.lte('entry_date', filters.endDate);
          }

          const { data, error } = await query;

          if (error) throw error;
          set({ journalEntries: data || [], loading: false });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to fetch journal entries';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      createJournalEntry: async (entryData, lines) => {
        set({ loading: true, error: null });
        try {
          const totalDebits = lines.reduce((sum, line) => sum + line.debit_amount, 0);
          const totalCredits = lines.reduce((sum, line) => sum + line.credit_amount, 0);

          if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error('Journal entry must balance (debits must equal credits)');
          }

          const { data: maxEntry } = await supabase
            .from('journal_entries')
            .select('entry_number')
            .order('entry_number', { ascending: false })
            .limit(1)
            .maybeSingle();

          const nextNumber = maxEntry
            ? `JE-${(parseInt(maxEntry.entry_number.split('-')[1]) + 1).toString().padStart(6, '0')}`
            : 'JE-000001';

          const { data: newEntry, error: entryError } = await supabase
            .from('journal_entries')
            .insert([{ ...entryData, entry_number: nextNumber }])
            .select()
            .single();

          if (entryError) throw entryError;

          const linesWithEntryId = lines.map(line => ({
            ...line,
            journal_entry_id: newEntry.id,
          }));

          const { error: linesError } = await supabase
            .from('journal_entry_lines')
            .insert(linesWithEntryId);

          if (linesError) throw linesError;

          await get().fetchJournalEntries();
          toast.success('Journal entry created successfully!');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to create journal entry';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      postJournalEntry: async (id, userId) => {
        set({ loading: true, error: null });
        try {
          const { data: entry, error: fetchError } = await supabase
            .from('journal_entries')
            .select(`*, lines:journal_entry_lines(*)`)
            .eq('id', id)
            .single();

          if (fetchError) throw fetchError;
          if (entry.status !== 'draft') {
            throw new Error('Only draft entries can be posted');
          }

          const { error: updateError } = await supabase
            .from('journal_entries')
            .update({
              status: 'posted',
              approved_by: userId,
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);

          if (updateError) throw updateError;

          for (const line of entry.lines) {
            const amount = line.debit_amount - line.credit_amount;
            const { error: balanceError } = await supabase.rpc('update_account_balance', {
              p_account_id: line.account_id,
              p_amount: amount,
            });

            if (balanceError) throw balanceError;
          }

          await get().fetchJournalEntries();
          await get().fetchChartOfAccounts();
          toast.success('Journal entry posted successfully!');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to post journal entry';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      voidJournalEntry: async (id, userId) => {
        set({ loading: true, error: null });
        try {
          const { data: entry, error: fetchError } = await supabase
            .from('journal_entries')
            .select(`*, lines:journal_entry_lines(*)`)
            .eq('id', id)
            .single();

          if (fetchError) throw fetchError;
          if (entry.status !== 'posted') {
            throw new Error('Only posted entries can be voided');
          }

          const { error: updateError } = await supabase
            .from('journal_entries')
            .update({
              status: 'void',
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);

          if (updateError) throw updateError;

          for (const line of entry.lines) {
            const amount = -(line.debit_amount - line.credit_amount);
            const { error: balanceError } = await supabase.rpc('update_account_balance', {
              p_account_id: line.account_id,
              p_amount: amount,
            });

            if (balanceError) throw balanceError;
          }

          await get().fetchJournalEntries();
          await get().fetchChartOfAccounts();
          toast.success('Journal entry voided successfully!');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to void journal entry';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      fetchFiscalPeriods: async () => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('fiscal_periods')
            .select('*')
            .order('start_date', { ascending: false });

          if (error) throw error;
          set({ fiscalPeriods: data || [], loading: false });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to fetch fiscal periods';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      createFiscalPeriod: async (data) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase
            .from('fiscal_periods')
            .insert([data]);

          if (error) throw error;
          await get().fetchFiscalPeriods();
          toast.success('Fiscal period created successfully!');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to create fiscal period';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      closeFiscalPeriod: async (id, userId) => {
        set({ loading: true, error: null });
        try {
          const { error } = await supabase
            .from('fiscal_periods')
            .update({
              is_closed: true,
              closed_by: userId,
              closed_at: new Date().toISOString(),
            })
            .eq('id', id);

          if (error) throw error;
          await get().fetchFiscalPeriods();
          toast.success('Fiscal period closed successfully!');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to close fiscal period';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      fetchAccountBalances: async (fiscalPeriodId) => {
        set({ loading: true, error: null });
        try {
          let query = supabase
            .from('account_balances')
            .select(`
              *,
              account:chart_of_accounts(*),
              fiscal_period:fiscal_periods(*)
            `);

          if (fiscalPeriodId) {
            query = query.eq('fiscal_period_id', fiscalPeriodId);
          }

          const { data, error } = await query;

          if (error) throw error;
          set({ accountBalances: data || [], loading: false });
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to fetch account balances';
          set({ error: errorMessage, loading: false });
          toast.error(errorMessage);
        }
      },

      getTrialBalance: async (fiscalPeriodId) => {
        try {
          const { chartOfAccounts } = get();

          const trialBalance: TrialBalance[] = chartOfAccounts.map(account => {
            const balance = account.balance || 0;
            const isDebitAccount = ['asset', 'expense'].includes(account.account_type);

            return {
              account_code: account.account_code,
              account_name: account.account_name,
              account_type: account.account_type,
              debit: isDebitAccount && balance > 0 ? balance : 0,
              credit: !isDebitAccount && balance > 0 ? balance : 0,
              balance: balance,
            };
          });

          return trialBalance;
        } catch (error: any) {
          toast.error('Failed to generate trial balance');
          throw error;
        }
      },

      getBalanceSheet: async (fiscalPeriodId) => {
        try {
          const { chartOfAccounts } = get();

          const assets = chartOfAccounts.filter(a => a.account_type === 'asset');
          const liabilities = chartOfAccounts.filter(a => a.account_type === 'liability');
          const equity = chartOfAccounts.filter(a => a.account_type === 'equity');

          const assetTotal = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
          const liabilityTotal = liabilities.reduce((sum, a) => sum + (a.balance || 0), 0);
          const equityTotal = equity.reduce((sum, a) => sum + (a.balance || 0), 0);

          return {
            period_name: 'Balance Sheet',
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            sections: [
              {
                name: 'Assets',
                accounts: assets.map(a => ({
                  account_code: a.account_code,
                  account_name: a.account_name,
                  amount: a.balance || 0,
                })),
                total: assetTotal,
              },
              {
                name: 'Liabilities',
                accounts: liabilities.map(a => ({
                  account_code: a.account_code,
                  account_name: a.account_name,
                  amount: a.balance || 0,
                })),
                total: liabilityTotal,
              },
              {
                name: 'Equity',
                accounts: equity.map(a => ({
                  account_code: a.account_code,
                  account_name: a.account_name,
                  amount: a.balance || 0,
                })),
                total: equityTotal,
              },
            ],
            total: assetTotal,
          };
        } catch (error: any) {
          toast.error('Failed to generate balance sheet');
          throw error;
        }
      },

      getIncomeStatement: async (fiscalPeriodId) => {
        try {
          const { chartOfAccounts } = get();

          const revenue = chartOfAccounts.filter(a => a.account_type === 'revenue');
          const expenses = chartOfAccounts.filter(a => a.account_type === 'expense');

          const revenueTotal = revenue.reduce((sum, a) => sum + (a.balance || 0), 0);
          const expenseTotal = expenses.reduce((sum, a) => sum + (a.balance || 0), 0);
          const netIncome = revenueTotal - expenseTotal;

          return {
            period_name: 'Income Statement',
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            sections: [
              {
                name: 'Revenue',
                accounts: revenue.map(a => ({
                  account_code: a.account_code,
                  account_name: a.account_name,
                  amount: a.balance || 0,
                })),
                total: revenueTotal,
              },
              {
                name: 'Expenses',
                accounts: expenses.map(a => ({
                  account_code: a.account_code,
                  account_name: a.account_name,
                  amount: a.balance || 0,
                })),
                total: expenseTotal,
              },
            ],
            total: netIncome,
          };
        } catch (error: any) {
          toast.error('Failed to generate income statement');
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'accounting-storage',
      partialize: (state) => ({
        chartOfAccounts: state.chartOfAccounts,
        journalEntries: state.journalEntries,
        fiscalPeriods: state.fiscalPeriods,
        accountBalances: state.accountBalances,
      }),
    }
  )
);
