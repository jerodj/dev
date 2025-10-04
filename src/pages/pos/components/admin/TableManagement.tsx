import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../../store/posStore';
import { posApi } from '../../../../lib/api';
import { 
  Table as TableIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Users, 
  MapPin, 
  Grid3X3,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Table, POSStore } from '../../../../types/pos';

interface TableFormData {
  id?: string;
  number: string;
  name: string;
  status: string;
  capacity: number;
  x_position: number;
  y_position: number;
}

const statusConfig = {
  available: {
    color: 'from-green-400 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    icon: CheckCircle,
    label: 'Available'
  },
  occupied: {
    color: 'from-red-400 to-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    icon: AlertCircle,
    label: 'Occupied'
  },
  reserved: {
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    icon: Clock,
    label: 'Reserved'
  },
  maintenance: {
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    icon: Settings,
    label: 'Maintenance'
  }
};

export default function TableManagement() {
  const { tables, setTables } = usePOSStore() as POSStore;
  const [showTableForm, setShowTableForm] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState<TableFormData>({
    number: '',
    name: '',
    status: 'available',
    capacity: 2,
    x_position: 0,
    y_position: 0,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const tablesData = await posApi.getTables();
      setTables(tablesData);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = async () => {
    if (!formData.number || !formData.name || formData.capacity < 1) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await posApi.createTable(formData);
      toast.success('Table created successfully! 🎉');
      setShowTableForm(false);
      resetForm();
      fetchInitialData();
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error('Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTable = async () => {
    if (!editingTable || !formData.number || !formData.name || formData.capacity < 1) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await posApi.updateTable(editingTable.id, formData);
      toast.success('Table updated successfully! ✨');
      setShowTableForm(false);
      setEditingTable(null);
      resetForm();
      fetchInitialData();
    } catch (error) {
      console.error('Error updating table:', error);
      toast.error('Failed to update table');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!window.confirm('Are you sure you want to delete this table? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      await posApi.deleteTable(tableId);
      toast.success('Table deleted successfully!');
      fetchInitialData();
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('Failed to delete table');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setFormData({
      id: table.id,
      number: table.number,
      name: table.name || '',
      status: table.status,
      capacity: table.capacity,
      x_position: table.x_position,
      y_position: table.y_position,
    });
    setShowTableForm(true);
  };

  const resetForm = () => {
    setFormData({
      number: '',
      name: '',
      status: 'available',
      capacity: 2,
      x_position: 0,
      y_position: 0,
    });
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         table.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCounts = () => {
    return Object.keys(statusConfig).reduce((acc, status) => {
      acc[status] = tables.filter(table => table.status === status).length;
      return acc;
    }, {} as Record<string, number>);
  };

  const statusCounts = getStatusCounts();

  if (loading && !showTableForm) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <TableIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Table Management</h1>
              <p className="text-emerald-100">Configure and manage restaurant tables</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30">
              <div className="text-2xl font-bold">{tables.length}</div>
              <div className="text-emerald-100 text-sm">Total Tables</div>
            </div>
            <button
              onClick={() => {
                setShowTableForm(true);
                setEditingTable(null);
                resetForm();
              }}
              className="px-8 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-2xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
            >
              <Plus className="w-5 h-5 mr-3" />
              Add New Table
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tables by number or name..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-lg font-semibold shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white font-semibold shadow-sm"
          >
            <option value="all">All Status ({tables.length})</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>
                {config.label} ({statusCounts[status] || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Status Legend */}
        <div className="mt-6 flex flex-wrap gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <div key={status} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${config.color}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {config.label} ({statusCounts[status] || 0})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredTables.map((table) => {
          const config = statusConfig[table.status] || statusConfig.available;
          const Icon = config.icon;
          
          return (
            <div key={table.id} className={`bg-white rounded-3xl shadow-xl border-2 ${config.borderColor} hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden`}>
              {/* Table Header */}
              <div className={`p-6 bg-gradient-to-r ${config.color} text-white`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">#{table.number}</div>
                    <div className="text-white/80 text-sm">{config.label}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold mb-1">{table.name || `Table ${table.number}`}</h3>
                  <div className="flex items-center space-x-2 text-white/90">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">{table.capacity} seats</span>
                  </div>
                </div>
              </div>

              {/* Table Details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Position:</span>
                    <div className="font-bold text-gray-900">
                      ({table.x_position}, {table.y_position})
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Capacity:</span>
                    <div className="font-bold text-gray-900 flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {table.capacity}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEditTable(table)}
                    className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all flex items-center justify-center font-semibold"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all flex items-center justify-center font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTables.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <TableIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-500 mb-4">No tables found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery 
              ? `No tables match "${searchQuery}"`
              : 'Start by creating your first table'
            }
          </p>
          <button
            onClick={() => {
              setShowTableForm(true);
              setEditingTable(null);
              resetForm();
            }}
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 font-bold transition-all transform hover:scale-105 flex items-center shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add First Table
          </button>
        </div>
      )}

      {/* Table Form Modal */}
      {showTableForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center">
                  <TableIcon className="w-6 h-6 mr-3" />
                  {editingTable ? 'Edit Table' : 'Add New Table'}
                </h3>
                <button
                  onClick={() => {
                    setShowTableForm(false);
                    setEditingTable(null);
                    resetForm();
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Table Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                    placeholder="Enter table number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Table Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                    placeholder="Enter table name"
                    required
                  />
                </div>
              </div>

              {/* Capacity and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Seating Capacity <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                      placeholder="Number of seats"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Table Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                    required
                  >
                    {Object.entries(statusConfig).map(([status, config]) => (
                      <option key={status} value={status}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Table Position (Optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">X Position</label>
                    <input
                      type="number"
                      value={formData.x_position}
                      onChange={(e) => setFormData({ ...formData, x_position: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Y Position</label>
                    <input
                      type="number"
                      value={formData.y_position}
                      onChange={(e) => setFormData({ ...formData, y_position: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm font-semibold"
                      placeholder="0"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Used for floor plan layout (optional)</p>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center text-sm">
                  <Grid3X3 className="w-5 h-5 mr-2" />
                  Table Preview
                </h4>
                <div className={`p-3 rounded-xl ${statusConfig[formData.status]?.bgColor} ${statusConfig[formData.status]?.borderColor} border-2 max-w-xs`}>
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r ${statusConfig[formData.status]?.color} text-white mb-2`}>
                      <TableIcon className="w-5 h-5" />
                    </div>
                    <h5 className="font-bold text-gray-900 text-sm">Table {formData.number || '?'}</h5>
                    <p className="text-sm text-gray-600">{formData.name || 'Table Name'}</p>
                    <div className="flex items-center justify-center space-x-1 mt-1">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-700">{formData.capacity} seats</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowTableForm(false);
                    setEditingTable(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTable ? handleUpdateTable : handleCreateTable}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 font-bold text-sm transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {loading ? 'Saving...' : editingTable ? 'Update Table' : 'Create Table'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}