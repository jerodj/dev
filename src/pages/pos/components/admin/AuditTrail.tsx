import React, { useState, useEffect } from 'react';
import { useERPStore } from '../../../../store/erpStore';
import { usePOSStore } from '../../../../store/posStore';
import {
  Shield,
  Search,
  Filter,
  Calendar,
  User,
  Database,
  Activity,
  Eye,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  Edit3,
  Trash2,
  Plus,
  Clock,
  FileText,
  Settings
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const actionConfig = {
  create: { color: 'bg-green-100 text-green-800', icon: Plus, label: 'Created' },
  update: { color: 'bg-blue-100 text-blue-800', icon: Edit3, label: 'Updated' },
  delete: { color: 'bg-red-100 text-red-800', icon: Trash2, label: 'Deleted' },
  approve: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, label: 'Approved' },
  reject: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Rejected' },
  adjust: { color: 'bg-purple-100 text-purple-800', icon: Settings, label: 'Adjusted' }
};

const tableConfig = {
  expenses: { label: 'Expenses', icon: FileText, color: 'text-red-600' },
  suppliers: { label: 'Suppliers', icon: User, color: 'text-blue-600' },
  purchase_orders: { label: 'Purchase Orders', icon: FileText, color: 'text-purple-600' },
  inventory_items: { label: 'Inventory', icon: Database, color: 'text-green-600' },
  inventory_adjustments: { label: 'Inventory Adjustments', icon: Settings, color: 'text-orange-600' },
  users: { label: 'Users', icon: User, color: 'text-indigo-600' },
  business_settings: { label: 'Business Settings', icon: Settings, color: 'text-gray-600' }
};

export default function AuditTrail() {
  const { auditTrail, loading, error, fetchAuditTrail, clearError } = useERPStore();
  const { currentUser } = usePOSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadAuditTrail = async () => {
      try {
        const filters = {
          table: tableFilter !== 'all' ? tableFilter : undefined,
          action: actionFilter !== 'all' ? actionFilter : undefined,
          user: userFilter !== 'all' ? userFilter : undefined,
          days: parseInt(dateFilter)
        };
        await fetchAuditTrail(filters);
      } catch (error) {
        console.error('Failed to load audit trail:', error);
      }
    };
    loadAuditTrail();
  }, [tableFilter, actionFilter, userFilter, dateFilter, fetchAuditTrail]);

  const handleRefresh = async () => {
    try {
      const filters = {
        table: tableFilter !== 'all' ? tableFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        user: userFilter !== 'all' ? userFilter : undefined,
        days: parseInt(dateFilter)
      };
      await fetchAuditTrail(filters);
      toast.success('Audit trail refreshed!');
    } catch (error) {
      console.error('Failed to refresh audit trail:', error);
    }
  };

  const handleExport = () => {
    try {
      const csvContent = [
        ['Timestamp', 'Table', 'Action', 'User', 'Record ID', 'Reason', 'IP Address'].join(','),
        ...filteredAuditTrail.map(entry => [
          format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
          tableConfig[entry.table_name]?.label || entry.table_name,
          actionConfig[entry.action]?.label || entry.action,
          entry.user_name,
          entry.record_id,
          entry.reason || '',
          entry.ip_address || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Audit trail exported successfully!');
    } catch (error) {
      toast.error('Failed to export audit trail');
    }
  };

  const toggleRowExpansion = (entryId: string) => {
    setExpandedRows(prev =>
      prev.includes(entryId) ? prev.filter(id => id !== entryId) : [...prev, entryId]
    );
  };

  const filteredAuditTrail = auditTrail.filter(entry => {
    const matchesSearch = 
      (entry.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.record_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.reason && entry.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (entry.table_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const uniqueUsers = [...new Set(auditTrail.map(entry => entry.user_name))];

  if (loading && auditTrail.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Audit Trail...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-red-800 mb-4">Failed to Load Audit Trail</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => {
              clearError();
              handleRefresh();
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center mx-auto"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Audit Trail</h1>
              <p className="text-indigo-100">Track all system changes and user activities</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
            >
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Filters & Search</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, record ID, reason, or table..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Tables</option>
                {Object.entries(tableConfig).map(([table, config]) => (
                  <option key={table} value={table}>{config.label}</option>
                ))}
              </select>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Actions</option>
                {Object.entries(actionConfig).map(([action, config]) => (
                  <option key={action} value={action}>{config.label}</option>
                ))}
              </select>

              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Users</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{filteredAuditTrail.length}</div>
                <div className="text-sm text-gray-500">Entries</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {filteredAuditTrail.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Timestamp</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">User</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Action</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Table</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Record ID</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Reason</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAuditTrail.map(entry => {
                  const actionInfo = actionConfig[entry.action] || actionConfig.update;
                  const tableInfo = tableConfig[entry.table_name] || { label: entry.table_name, icon: Database, color: 'text-gray-600' };
                  const ActionIcon = actionInfo.icon;
                  const TableIcon = tableInfo.icon;
                  const isExpanded = expandedRows.includes(entry.id);

                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-semibold text-gray-900">
                                {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(entry.created_at), 'HH:mm:ss')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{entry.user_name}</p>
                              <p className="text-sm text-gray-500 capitalize">{entry.user_role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center w-fit ${actionInfo.color}`}>
                            <ActionIcon className="w-4 h-4 mr-1" />
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <TableIcon className={`w-4 h-4 ${tableInfo.color}`} />
                            <span className="font-semibold text-gray-900">{tableInfo.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {entry.record_id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">
                            {entry.reason || 'No reason provided'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleRowExpansion(entry.id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {entry.old_values && (
                                  <div>
                                    <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                                      <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                                      Old Values
                                    </h4>
                                    <pre className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 overflow-auto max-h-40">
                                      {JSON.stringify(entry.old_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {entry.new_values && (
                                  <div>
                                    <h4 className="font-bold text-gray-900 mb-2 flex items-center">
                                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                      New Values
                                    </h4>
                                    <pre className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 overflow-auto max-h-40">
                                      {JSON.stringify(entry.new_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                              {(entry.ip_address || entry.user_agent) && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <h4 className="font-bold text-blue-900 mb-2">Technical Details</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    {entry.ip_address && (
                                      <div>
                                        <span className="text-blue-600 font-semibold">IP Address:</span>
                                        <span className="ml-2 text-blue-800">{entry.ip_address}</span>
                                      </div>
                                    )}
                                    {entry.user_agent && (
                                      <div>
                                        <span className="text-blue-600 font-semibold">User Agent:</span>
                                        <span className="ml-2 text-blue-800 truncate">{entry.user_agent}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-500 mb-2">No audit trail entries</h3>
            <p className="text-gray-400 mb-6">
              {auditTrail.length === 0 
                ? 'System activities will appear here as they occur'
                : 'No entries match your current filters'
              }
            </p>
            {auditTrail.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTableFilter('all');
                  setActionFilter('all');
                  setUserFilter('all');
                  setDateFilter('7');
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{auditTrail.length}</div>
              <div className="text-sm text-gray-500">Total Activities</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-3 rounded-xl">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{uniqueUsers.length}</div>
              <div className="text-sm text-gray-500">Active Users</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-3 rounded-xl">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(tableConfig).length}
              </div>
              <div className="text-sm text-gray-500">Tracked Tables</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-100 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {auditTrail.filter(entry => 
                  new Date(entry.created_at) >= subDays(new Date(), 1)
                ).length}
              </div>
              <div className="text-sm text-gray-500">Last 24h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}