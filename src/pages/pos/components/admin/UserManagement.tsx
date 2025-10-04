import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../../store/posStore';
import { posApi } from '../../../../lib/api';
import { adminCache, ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, invalidateAdminCache } from '../../../../lib/adminCache';
import toast from 'react-hot-toast';
import { 
  Users, 
  Plus, 
  Edit3, 
  Lock, 
  Unlock, 
  LogOut, 
  User, 
  Shield, 
  Mail, 
  Phone, 
  Camera,
  Folder,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Crown,
  UserCheck,
  UserX,
  RefreshCw
} from 'lucide-react';
import type { POSUser, POSStore } from '../../../../types/pos';

interface UserFormData {
  id?: string;
  staff_id: string;
  full_name: string;
  role: string;
  pin: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

const roleConfig = {
  admin: { 
    label: 'Administrator', 
    icon: Crown, 
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    description: 'Full system access and management'
  },
  manager: { 
    label: 'Manager', 
    icon: Shield, 
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    description: 'Manage staff and view reports'
  },
  cashier: { 
    label: 'Cashier', 
    icon: User, 
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    description: 'Process orders and payments'
  },
  kitchen: { 
    label: 'Kitchen Staff', 
    icon: User, 
    color: 'from-orange-500 to-yellow-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    description: 'View and manage kitchen orders'
  },
  waiter: { 
    label: 'Waiter', 
    icon: User, 
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    description: 'Take orders and serve customers'
  },
  waitress: { 
    label: 'Waitress', 
    icon: User, 
    color: 'from-pink-500 to-purple-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    description: 'Take orders and serve customers'
  },
  deleted: { 
    label: 'Deleted User', 
    icon: UserX, 
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    description: 'User account has been deleted'
  },
};

export default function UserManagement() {
  const { users, setUsers } = usePOSStore() as POSStore;
  const [loading, setLoading] = useState<boolean>(true);
  const [localUsers, setLocalUsers] = useState<POSUser[]>([]);
  const [lastCacheUpdate, setLastCacheUpdate] = useState(0);
  const [showUserForm, setShowUserForm] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<POSUser | null>(null);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const [formData, setFormData] = useState<UserFormData>({
    staff_id: '',
    full_name: '',
    role: 'waiter',
    pin: '',
    email: null,
    phone: null,
    avatar_url: null,
    is_active: true,
  });

  useEffect(() => {
    loadCachedUsers();
  }, []);

  const loadCachedUsers = async () => {
    setLoading(true);
    try {
      console.log('[UserManagement] Loading cached users...');
      const cachedUsers = await adminCache.getOrFetch(
        ADMIN_CACHE_KEYS.USERS,
        () => posApi.getUsers(),
        ADMIN_CACHE_TTL.USER_DATA
      );
      
      setLocalUsers(cachedUsers || []);
      setUsers(cachedUsers || []);
      setLastCacheUpdate(Date.now());
      console.log('[UserManagement] Cached users loaded successfully');
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
      setLocalUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async (forceRefresh = false) => {
    setLoading(true);
    try {
      console.log('[UserManagement] Refreshing users...');
      
      if (forceRefresh) {
        invalidateAdminCache.users();
      }

      const usersData = await adminCache.getOrFetch(
        ADMIN_CACHE_KEYS.USERS,
        () => posApi.getUsers(),
        ADMIN_CACHE_TTL.USER_DATA,
        forceRefresh
      );
      
      setLocalUsers(usersData || []);
      setUsers(usersData || []);
      setLastCacheUpdate(Date.now());
      
      if (forceRefresh) {
        toast.success('Users data refreshed!');
      }
    } catch (error) {
      console.error('[UserManagement] Refresh failed:', error);
      toast.error('Failed to refresh users data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setFormData((prev) => ({ ...prev, avatar_url: e.target.result as string }));
          toast.success('Profile image uploaded! 📸');
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please select a valid image file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staff_id || !formData.full_name || !formData.pin || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.pin.length < 4) {
      toast.error('PIN must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        staff_id: formData.staff_id,
        full_name: formData.full_name,
        role: formData.role,
        pin: formData.pin,
        email: formData.email || null,
        phone: formData.phone || null,
        avatar_url: formData.avatar_url || null,
        is_active: formData.is_active,
      };

      if (editingUser?.id) {
        await posApi.updateUser(editingUser.id, userData);
        toast.success('User updated successfully! ✨');
      } else {
        await posApi.createUser(userData);
        toast.success('User created successfully! 🎉');
      }
      
      // Invalidate cache and refresh data
      invalidateAdminCache.users();
      await refreshUsers(true);
      
      setShowUserForm(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: POSUser) => {
    setEditingUser(user);
    setFormData({
      id: user.id,
      staff_id: user.staff_id,
      full_name: user.full_name,
      role: user.role,
      pin: '',
      email: user.email || null,
      phone: user.phone || null,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
    });
    setShowUserForm(true);
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await posApi.toggleUserStatus(userId, !isActive);
      toast.success(`User ${isActive ? 'deactivated' : 'activated'} successfully!`);
      
      // Invalidate cache and refresh data
      invalidateAdminCache.users();
      await refreshUsers(true);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to toggle user status');
    }
  };

  const handleLogoutUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to log out this user?')) return;
    
    try {
      await posApi.logoutUser(userId);
      toast.success('User logged out successfully!');
      
      // Invalidate cache and refresh data
      invalidateAdminCache.users();
      await refreshUsers(true);
    } catch (error) {
      console.error('Error logging out user:', error);
      toast.error('Failed to log out user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? They will be marked as deleted but can be restored later.')) return;
    
    try {
      await posApi.deleteUser(userId);
      toast.success('User deleted successfully!');
      
      // Invalidate cache and refresh data
      invalidateAdminCache.users();
      await refreshUsers(true);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleRestoreUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to restore this user?')) return;
    
    try {
      await posApi.restoreUser(userId);
      toast.success('User restored successfully!');
      
      // Invalidate cache and refresh data
      invalidateAdminCache.users();
      await refreshUsers(true);
    } catch (error) {
      console.error('Error restoring user:', error);
      toast.error('Failed to restore user');
    }
  };

  const resetForm = () => {
    setFormData({
      staff_id: '',
      full_name: '',
      role: 'waiter',
      pin: '',
      email: null,
      phone: null,
      avatar_url: null,
      is_active: true,
    });
  };

  const filteredUsers = localUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading && localUsers.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Users...</p>
          <p className="text-gray-500">Fetching user data from cache</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">User Management</h1>
              <p className="text-blue-100">Manage staff accounts and permissions</p>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  {localUsers.length} Users
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full">
                  Last updated: {new Date(lastCacheUpdate).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => refreshUsers(true)}
              disabled={loading}
              className="px-4 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-2xl font-bold transition-all flex items-center shadow-lg border border-white/30"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setShowUserForm(true);
                setEditingUser(null);
                resetForm();
              }}
              className="px-8 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-2xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
            >
              <Plus className="w-5 h-5 mr-3" />
              Add New User
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, staff ID, or email..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-lg font-semibold shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white font-semibold shadow-sm"
          >
            <option value="all">All Roles</option>
            {Object.entries(roleConfig).map(([role, config]) => (
              <option key={role} value={role}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => {
          const roleInfo = roleConfig[user.role] || roleConfig.waiter;
          const RoleIcon = roleInfo.icon;
          
          return (
            <div key={user.id} className="bg-white rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
              {/* User Header */}
              <div className={`p-6 bg-gradient-to-r ${roleInfo.color} text-white`}>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white/30 shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/30">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
                      user.is_active ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{user.full_name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <RoleIcon className="w-4 h-4" />
                      <span className="text-white/90 font-semibold">{roleInfo.label}</span>
                    </div>
                    <p className="text-white/70 text-sm mt-1">ID: {user.staff_id}</p>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  {user.email && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{user.email}</span>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{user.phone}</span>
                    </div>
                  )}
                  {user.last_login && (
                    <div className="flex items-center space-x-3 text-sm">
                      <LogOut className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        Last login: {new Date(user.last_login).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className={`p-3 rounded-2xl ${roleInfo.bgColor} border border-gray-200`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${roleInfo.textColor}`}>Status</span>
                    <div className="flex items-center space-x-2">
                      {user.is_active ? (
                        <UserCheck className="w-4 h-4 text-green-600" />
                      ) : (
                        <UserX className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-bold ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${roleInfo.textColor}`}>
                    {roleInfo.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  {user.is_deleted ? (
                    <button
                      onClick={() => handleRestoreUser(user.id)}
                      className="flex-1 px-4 py-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all flex items-center justify-center font-semibold"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Restore User
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all flex items-center justify-center font-semibold"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                        className={`px-4 py-3 rounded-xl transition-all flex items-center justify-center font-semibold ${
                          user.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.is_active ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleLogoutUser(user.id)}
                      disabled={user.is_deleted}
                      className={`px-3 py-3 rounded-xl transition-all flex items-center justify-center font-semibold ${
                        user.is_deleted 
                          ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                    {!user.is_deleted && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-3 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all flex items-center justify-center font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Users className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-500 mb-4">No users found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery 
              ? `No users match "${searchQuery}"`
              : 'Start by creating your first user account'
            }
          </p>
          <button
            onClick={() => {
              setShowUserForm(true);
              setEditingUser(null);
              resetForm();
            }}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105 flex items-center shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add First User
          </button>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center">
                  <User className="w-6 h-6 mr-3" />
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                <button
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Profile Image */}
              <div className="text-center">
                <label className="block text-sm font-bold text-gray-700 mb-4">Profile Picture</label>
                <div className="relative inline-block">
                  {formData.avatar_url ? (
                    <div className="relative">
                      <img
                        src={formData.avatar_url}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-purple-200 shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatar_url: null }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all transform hover:scale-110 shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center border-4 border-gray-200 shadow-inner">
                      <Camera className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <label className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 cursor-pointer bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-110 shadow-lg">
                    <Folder className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Staff ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="staff_id"
                    value={formData.staff_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                    placeholder="Enter unique staff ID"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                    placeholder="Enter full name"
                    required
                  />
                </div>
              </div>

              {/* Role and PIN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                    required
                  >
                    {Object.entries(roleConfig).map(([role, config]) => (
                      <option key={role} value={role}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    {roleConfig[formData.role]?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    PIN <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      name="pin"
                      value={formData.pin}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                      placeholder={editingUser ? 'Enter new PIN' : 'Enter 4-digit PIN'}
                      required
                      minLength={4}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {editingUser ? 'Leave blank to keep current PIN' : 'Minimum 4 characters required'}
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-semibold"
                    placeholder="+256 123 456 789"
                  />
                </div>
              </div>

              {/* Account Status */}
              <div className="flex items-center justify-center">
                <label className="flex items-center space-x-4 cursor-pointer group p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-100 hover:border-green-300 transition-all">
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-all duration-300 ${formData.is_active ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${formData.is_active ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-green-800 group-hover:text-green-900 transition-colors">
                      Account Active
                    </span>
                    <p className="text-sm text-green-600">User can log in and access the system</p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold text-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  ) : (
                    <Save className="w-5 h-5 mr-3" />
                  )}
                  {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
