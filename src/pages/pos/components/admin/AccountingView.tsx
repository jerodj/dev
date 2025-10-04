import { useState, useEffect } from 'react';
import { useAccountingStore } from '../../../../store/accountingStore';
import { BookOpen, FileText, Calendar, TrendingUp, Plus, CreditCard as Edit2, Trash2, Check, X, Download } from 'lucide-react';
import { format } from 'date-fns';

type TabType = 'chart-of-accounts' | 'journal-entries' | 'reports' | 'fiscal-periods';

export default function AccountingView() {
  const [activeTab, setActiveTab] = useState<TabType>('chart-of-accounts');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const {
    chartOfAccounts,
    journalEntries,
    fiscalPeriods,
    loading,
    fetchChartOfAccounts,
    fetchJournalEntries,
    fetchFiscalPeriods,
    getTrialBalance,
    getBalanceSheet,
    getIncomeStatement,
  } = useAccountingStore();

  useEffect(() => {
    fetchChartOfAccounts();
    fetchJournalEntries();
    fetchFiscalPeriods();
  }, []);

  const tabs = [
    { id: 'chart-of-accounts' as TabType, label: 'Chart of Accounts', icon: BookOpen },
    { id: 'journal-entries' as TabType, label: 'Journal Entries', icon: FileText },
    { id: 'reports' as TabType, label: 'Financial Reports', icon: TrendingUp },
    { id: 'fiscal-periods' as TabType, label: 'Fiscal Periods', icon: Calendar },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Accounting</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your financial records</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'chart-of-accounts' && (
          <ChartOfAccountsTab
            accounts={chartOfAccounts}
            onAdd={() => setShowAccountModal(true)}
            onEdit={(account) => {
              setEditingAccount(account);
              setShowAccountModal(true);
            }}
          />
        )}

        {activeTab === 'journal-entries' && (
          <JournalEntriesTab
            entries={journalEntries}
            onAdd={() => setShowJournalModal(true)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab
            getTrialBalance={getTrialBalance}
            getBalanceSheet={getBalanceSheet}
            getIncomeStatement={getIncomeStatement}
          />
        )}

        {activeTab === 'fiscal-periods' && (
          <FiscalPeriodsTab periods={fiscalPeriods} />
        )}
      </div>
    </div>
  );
}

function ChartOfAccountsTab({ accounts, onAdd, onEdit }: any) {
  const groupedAccounts = accounts.reduce((acc: any, account: any) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Chart of Accounts</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {Object.entries(groupedAccounts).map(([type, accts]: [string, any]) => (
        <div key={type} className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900 capitalize">{type}</h4>
          </div>
          <div className="divide-y divide-gray-200">
            {accts.map((account: any) => (
              <div
                key={account.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-gray-500">
                      {account.account_code}
                    </span>
                    <span className="font-medium text-gray-900">
                      {account.account_name}
                    </span>
                  </div>
                  {account.description && (
                    <p className="text-sm text-gray-500 mt-1">{account.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">
                    UGX {account.balance.toLocaleString()}
                  </span>
                  <button
                    onClick={() => onEdit(account)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function JournalEntriesTab({ entries, onAdd }: any) {
  const { postJournalEntry, voidJournalEntry } = useAccountingStore();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Journal Entries</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Entry Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry: any) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {entry.entry_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(entry.entry_date), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {entry.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.status === 'posted'
                        ? 'bg-green-100 text-green-800'
                        : entry.status === 'void'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {entry.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {entry.status === 'draft' && (
                    <button
                      onClick={() => postJournalEntry(entry.id, localStorage.getItem('user_id') || '')}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {entry.status === 'posted' && (
                    <button
                      onClick={() => voidJournalEntry(entry.id, localStorage.getItem('user_id') || '')}
                      className="text-red-600 hover:text-red-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsTab({ getTrialBalance, getBalanceSheet, getIncomeStatement }: any) {
  const [reportType, setReportType] = useState<'trial' | 'balance' | 'income'>('trial');
  const [reportData, setReportData] = useState<any>(null);

  const generateReport = async () => {
    try {
      let data;
      if (reportType === 'trial') {
        data = await getTrialBalance();
      } else if (reportType === 'balance') {
        data = await getBalanceSheet();
      } else {
        data = await getIncomeStatement();
      }
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
        <div className="flex gap-2">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="trial">Trial Balance</option>
            <option value="balance">Balance Sheet</option>
            <option value="income">Income Statement</option>
          </select>
          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <TrendingUp className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>

      {reportData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-bold text-gray-900">
              {reportType === 'trial' && 'Trial Balance'}
              {reportType === 'balance' && 'Balance Sheet'}
              {reportType === 'income' && 'Income Statement'}
            </h4>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>

          {reportType === 'trial' && (
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2">Account Code</th>
                  <th className="text-left py-2">Account Name</th>
                  <th className="text-right py-2">Debit</th>
                  <th className="text-right py-2">Credit</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item: any) => (
                  <tr key={item.account_code} className="border-b border-gray-200">
                    <td className="py-2 font-mono text-sm">{item.account_code}</td>
                    <td className="py-2">{item.account_name}</td>
                    <td className="py-2 text-right">
                      {item.debit > 0 ? `UGX ${item.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2 text-right">
                      {item.credit > 0 ? `UGX ${item.credit.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold border-t-2 border-gray-300">
                  <td colSpan={2} className="py-2">Total</td>
                  <td className="py-2 text-right">
                    UGX {reportData.reduce((sum: number, item: any) => sum + item.debit, 0).toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    UGX {reportData.reduce((sum: number, item: any) => sum + item.credit, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {(reportType === 'balance' || reportType === 'income') && (
            <div className="space-y-6">
              {reportData.sections.map((section: any) => (
                <div key={section.name}>
                  <h5 className="font-bold text-lg text-gray-900 mb-3">{section.name}</h5>
                  <table className="min-w-full mb-4">
                    <tbody>
                      {section.accounts.map((account: any) => (
                        <tr key={account.account_code} className="border-b border-gray-200">
                          <td className="py-2 pl-4">{account.account_name}</td>
                          <td className="py-2 text-right">
                            UGX {account.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t border-gray-300">
                        <td className="py-2 pl-4">Total {section.name}</td>
                        <td className="py-2 text-right">
                          UGX {section.total.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="border-t-2 border-gray-900 pt-4">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>{reportType === 'income' ? 'Net Income' : 'Total Assets'}</span>
                  <span>UGX {reportData.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FiscalPeriodsTab({ periods }: any) {
  const { createFiscalPeriod, closeFiscalPeriod } = useAccountingStore();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Fiscal Periods</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Period
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {periods.map((period: any) => (
          <div
            key={period.id}
            className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600"
          >
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-semibold text-gray-900">{period.period_name}</h4>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  period.is_closed
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {period.is_closed ? 'Closed' : 'Open'}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Start:</span>{' '}
                {format(new Date(period.start_date), 'MMM dd, yyyy')}
              </div>
              <div>
                <span className="font-medium">End:</span>{' '}
                {format(new Date(period.end_date), 'MMM dd, yyyy')}
              </div>
            </div>
            {!period.is_closed && (
              <button
                onClick={() =>
                  closeFiscalPeriod(period.id, localStorage.getItem('user_id') || '')
                }
                className="mt-4 w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
              >
                Close Period
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
