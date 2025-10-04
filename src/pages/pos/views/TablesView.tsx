import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { Users, Clock, CheckCircle, AlertCircle, Settings, QrCode, Edit3, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { Table, Order } from '../../../types/pos';

interface StatusConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const statusConfig: Record<string, StatusConfig> = {
  available: {
    color: 'from-green-400 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    icon: CheckCircle,
  },
  occupied: {
    color: 'from-red-400 to-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    icon: AlertCircle,
  },
  reserved: {
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    icon: Clock,
  },
  cleaning: {
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    icon: Settings,
  },
  maintenance: {
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    icon: Settings,
  },
};

interface TablesViewProps {
  onCreateOrder?: () => boolean;
  onPayment?: (order: Order) => void;
}

export function TablesView({ onCreateOrder = () => true, onPayment }: TablesViewProps) {
  const { tables, selectedTable, selectTable, orders, currency, dataLoaded, fetchDataLazy } = usePOSStore();
  const [tablesPolling, setTablesPolling] = useState<NodeJS.Timeout | null>(null);
  const [previousTables, setPreviousTables] = useState<Table[]>([]); // Track previous tables

  // Load initial tables and orders data
  useEffect(() => {
    if (!dataLoaded.tables || !dataLoaded.orders) {
      fetchDataLazy(['tables', 'orders']);
    }
  }, [dataLoaded.tables, dataLoaded.orders, fetchDataLazy]);

  // Update previousTables when tables change
  useEffect(() => {
    // Check for new tables by comparing IDs
    const previousTableIds = new Set(previousTables.map(table => table.id));
    const newTables = tables.filter(table => !previousTableIds.has(table.id));

    // Update previousTables after checking
    setPreviousTables(tables);
  }, [tables]);

  // Fast polling for tables and orders (every 3 seconds)
  useEffect(() => {
    if (dataLoaded.tables && dataLoaded.orders) {
      const interval = setInterval(() => {
        fetchDataLazy(['tables', 'orders']);
      }, 3000); // Refresh every 3 seconds for real-time table status

      setTablesPolling(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [dataLoaded.tables, dataLoaded.orders, fetchDataLazy]);

  const getTableOrder = (tableId: string): Order | undefined => {
    return orders.find(
      (order) => order.table?.id === tableId && !['paid', 'cancelled'].includes(order.status)
    );
  };

  const handleSelectTable = (table: Table | null) => {
    const { currentShift } = usePOSStore.getState();
    if (!currentShift) {
      toast.error('Cannot select table: Please start your shift first');
      return;
    }
    selectTable(table);
    if (table) {
      toast.success(`Table ${table.number} selected`);
    } else {
      toast(`Table selection cleared`, {
        style: {
          background: '#e0f7fa',
          color: '#006064',
          border: '1px solid #4dd0e1',
        },
      });
    }
  };

  const handleEditOrder = (order: Order) => {
    if (order.table) {
      selectTable(order.table);
      toast(`Table ${order.table.number} selected. You can now add items from the menu.`, {
        style: {
          background: '#e0f7fa',
          color: '#006064',
          border: '1px solid #4dd0e1',
        },
      });
    }
  };

  const tablesByStatus = tables.reduce(
    (acc, table) => {
      acc[table.status] = acc[table.status] || [];
      acc[table.status].push(table);
      return acc;
    },
    {} as Record<string, Table[]>
  );

  // Show loading only if data is not loaded yet
  if (!dataLoaded.tables || !dataLoaded.orders) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Tables...</p>
          <p className="text-gray-500">Setting up your dining area</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
            <p className="mt-1 text-gray-600">Select a table for dine-in orders</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {tables.filter((t) => t.status === 'available').length}
              </div>
              <div className="text-sm text-gray-500">Available Tables</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const count = tablesByStatus[status]?.length || 0;
            return (
              <div key={status} className="flex items-center space-x-2">
                <div className={`h-4 w-4 rounded-full bg-gradient-to-r ${config.color}`}></div>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {status} ({count})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {tables.map((table) => {
            const config = statusConfig[table.status] || statusConfig.available;
            const Icon = config.icon;
            const isSelected = selectedTable?.id === table.id;
            const tableOrder = getTableOrder(table.id);
            const canSelect = table.status === 'available' || isSelected;

            return (
              <div
                key={table.id}
                onClick={() => (canSelect ? handleSelectTable(isSelected ? null : table) : null)}
                className={`
                  relative transform rounded-2xl border-2 p-6 text-center transition-all duration-300
                  ${canSelect ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-not-allowed opacity-75'}
                  ${isSelected
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 shadow-xl ring-4 ring-purple-200'
                    : `${config.bgColor} ${config.borderColor}`
                  }
                `}
                role="button"
                aria-disabled={!canSelect}
                tabIndex={canSelect ? 0 : -1}
                onKeyDown={(e) => {
                  if (canSelect && (e.key === 'Enter' || e.key === ' ')) {
                    handleSelectTable(isSelected ? null : table);
                  }
                }}
              >
                {/* Status Indicator */}
                <div className="absolute right-3 top-3">
                  <div
                    className={`h-3 w-3 rounded-full bg-gradient-to-r ${config.color} ${
                      table.status === 'occupied' ? 'animate-pulse' : ''
                    }`}
                  ></div>
                </div>

                {/* QR Code Icon for available tables */}
                {table.status === 'available' && (
                  <div className="absolute left-3 top-3">
                    <QrCode className="h-4 w-4 text-gray-400" />
                  </div>
                )}

                {/* Table Icon */}
                <div
                  className={`mb-4 flex items-center justify-center ${
                    isSelected ? 'text-purple-600' : config.textColor
                  }`}
                >
                  <Icon className="h-8 w-8" />
                </div>

                {/* Table Info */}
                <div className="space-y-2">
                  <h3
                    className={`text-xl font-bold ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}
                  >
                    Table {table.number}
                  </h3>

                  {table.name && (
                    <p
                      className={`text-sm ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}
                    >
                      {table.name}
                    </p>
                  )}

                  <div
                    className={`flex items-center justify-center text-sm ${
                      isSelected ? 'text-purple-600' : config.textColor
                    }`}
                  >
                    <Users className="mr-1 h-4 w-4" />
                    {table.capacity} seats
                  </div>

                  <p
                    className={`text-xs font-medium capitalize ${
                      isSelected ? 'text-purple-600' : config.textColor
                    }`}
                  >
                    {table.status.replace('_', ' ')}
                  </p>

                  {/* Order Info for occupied tables */}
                  {tableOrder && (
                    <div className="mt-3 rounded-lg border border-white/50 bg-white/80 p-3">
                      <p className="mb-1 text-xs font-bold text-gray-900">
                        {tableOrder.order_number}
                      </p>
                      <p className="mb-2 text-xs text-gray-700">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currency || 'UGX',
                          minimumFractionDigits: 0,
                        }).format(tableOrder.total_amount)}
                      </p>
                      
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-purple-500/10">
                    <div className="rounded-full bg-purple-500 px-3 py-1 text-sm font-semibold text-white">
                      Selected
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Table Info */}
        {selectedTable && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Selected Table</h3>
              <button
                onClick={() => handleSelectTable(null)}
                className="text-gray-400 transition-colors hover:text-gray-600"
                title="Clear selection"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-500">Table Number</p>
                <p className="font-semibold text-gray-900">{selectedTable.number}</p>
              </div>
              {selectedTable.name && (
                <div>
                  <p className="text-sm text-gray-500">Table Name</p>
                  <p className="font-semibold text-gray-900">{selectedTable.name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Capacity</p>
                <p className="font-semibold text-gray-900">{selectedTable.capacity} guests</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p
                  className={`font-semibold capitalize ${
                    statusConfig[selectedTable.status].textColor
                  }`}
                >
                  {selectedTable.status.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {tables.length === 0 && (
          <div className="py-16 text-center">
            <Users className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="mb-2 text-xl text-gray-500">No tables configured</p>
            <p className="text-gray-400">Contact your administrator to set up tables</p>
          </div>
        )}
      </div>
    </div>
  );
}