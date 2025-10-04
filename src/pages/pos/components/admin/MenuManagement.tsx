import React, { useState, useEffect, Component, ReactNode } from 'react';
import { usePOSStore } from '../../../../store/posStore';
import { posApi } from '../../../../lib/api';
import { invalidateInventoryCaches, invalidateMenuCaches } from '../../../../lib/cache';
import {
  Menu,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  Search,
  Package,
  DollarSign,
  Clock,
  Star,
  Leaf,
  Flame,
  Wine,
  Coffee,
  Utensils,
  Image as ImageIcon,
  Upload,
  Folder,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  XCircle,
  Minus,
  Calculator,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { MenuItem, MenuCategory, POSStore } from '../../../../types/pos';

interface MenuItemFormData {
  id?: string;
  name: string;
  price: number;
  cost_price: number;
  description: string;
  image_url: string | null;
  is_available: boolean;
  category_id: string;
  preparation_time: number;
  spice_level: number;
  calories: number;
  abv: number;
  is_featured: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_alcoholic: boolean;
  track_inventory: boolean;
  inventory_count: number;
  minimum_stock: number;
}

interface CategoryFormData {
  id?: string;
  name: string;
  color: string;
  icon: string;
  business_type: string;
  is_active: boolean;
  sort_order: number;
}

interface InventoryAdjustment {
  itemId: string;
  adjustment: number;
  reason: string;
}

const categoryIcons = {
  Coffee: Coffee,
  Utensils: Utensils,
  Wine: Wine,
  ChefHat: Utensils,
};

const spiceLevels = [
  { value: 0, label: 'None', color: 'text-gray-500' },
  { value: 1, label: 'Mild', color: 'text-green-500' },
  { value: 2, label: 'Medium', color: 'text-yellow-500' },
  { value: 3, label: 'Hot', color: 'text-orange-500' },
  { value: 4, label: 'Very Hot', color: 'text-red-500' },
  { value: 5, label: 'Extreme', color: 'text-red-700' },
];

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-16">
          <h3 className="text-2xl font-bold text-red-500">Something went wrong</h3>
          <p className="text-gray-600">Please try refreshing the page or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MenuManagement() {
  const { menuItems, categories, setBusinessSettings, loading: storeLoading } = usePOSStore() as POSStore;
  const [loading, setLoading] = useState<boolean>(true);
  const [showItemForm, setShowItemForm] = useState<boolean>(false);
  const [showCategoryForm, setShowCategoryForm] = useState<boolean>(false);
  const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [inventoryFilter, setInventoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'inventory'>('items');
  const [localMenuItems, setLocalMenuItems] = useState<MenuItem[]>([]);
  const [localCategories, setLocalCategories] = useState<MenuCategory[]>([]);
  const [lowStockItems, setLowStockItems] = useState<MenuItem[]>([]);
  const [inventoryAdjustment, setInventoryAdjustment] = useState<InventoryAdjustment>({
    itemId: '',
    adjustment: 0,
    reason: '',
  });
  const [formKey, setFormKey] = useState(0);

  const [itemFormData, setItemFormData] = useState<MenuItemFormData>({
    name: '',
    price: 0,
    cost_price: 0,
    description: '',
    image_url: null,
    is_available: true,
    category_id: '',
    preparation_time: 0,
    spice_level: 0,
    calories: 0,
    abv: 0,
    is_featured: false,
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    is_alcoholic: false,
    track_inventory: false,
    inventory_count: 0,
    minimum_stock: 0,
  });

  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name: '',
    color: '#3B82F6',
    icon: 'Coffee',
    business_type: 'restaurant',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    // Initialize local state from store with validation
    setLocalMenuItems(Array.isArray(menuItems) ? menuItems : []);
    setLocalCategories(Array.isArray(categories) ? categories : []);
    setLowStockItems(
      Array.isArray(menuItems)
        ? menuItems.filter(
            (item) => item.track_inventory && item.inventory_count <= item.minimum_stock && item.inventory_count > 0
          )
        : []
    );
    setLoading(storeLoading);
  }, [menuItems, categories, storeLoading]);

  const handleItemInputChange = (field: keyof MenuItemFormData, value: any) => {
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          level: 'debug',
          message: 'Item form input changed',
          field,
          value,
        },
        null,
        2
      )
    );
    setItemFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (field === 'track_inventory') {
      setFormKey((prev) => prev + 1);
    }
  };

  const handleCategoryInputChange = (field: keyof CategoryFormData, value: any) => {
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          level: 'debug',
          message: 'Category form input changed',
          field,
          value,
        },
        null,
        2
      )
    );
    if (field === 'sort_order') {
      const parsedValue = parseInt(value) || 0;
      if (parsedValue < 0) {
        toast.error('Sort order cannot be negative');
        return;
      }
      const newValue = parsedValue === 0 ? localCategories.length : parsedValue;
      setCategoryFormData((prev) => ({
        ...prev,
        [field]: newValue,
      }));
    } else {
      setCategoryFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
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
          handleItemInputChange('image_url', e.target.result as string);
          toast.success('Image uploaded successfully! 📸');
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please select a valid image file');
    }
  };

  const handleCreateItem = async () => {
    if (!itemFormData.name || !itemFormData.category_id || itemFormData.price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Creating menu item',
            item: itemFormData,
          },
          null,
          2
        )
      );

      const itemData = {
        ...itemFormData,
        profit_margin:
          itemFormData.cost_price > 0 ? ((itemFormData.price - itemFormData.cost_price) / itemFormData.cost_price) * 100 : 0,
      };

      await posApi.createMenuItem(itemData);
      toast.success('Menu item created successfully! 🎉');
      setShowItemForm(false);
      resetItemForm();
      await usePOSStore.getState().fetchData();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to create menu item',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          null,
          2
        )
      );
      toast.error('Failed to create menu item');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !itemFormData.name || !itemFormData.category_id || itemFormData.price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Updating menu item',
            itemId: editingItem.id,
            item: itemFormData,
          },
          null,
          2
        )
      );

      const itemData = {
        ...itemFormData,
        profit_margin:
          itemFormData.cost_price > 0 ? ((itemFormData.price - itemFormData.cost_price) / itemFormData.cost_price) * 100 : 0,
      };

      await posApi.updateMenuItem(editingItem.id, itemData);
      toast.success('Menu item updated successfully! ✨');
      setShowItemForm(false);
      setEditingItem(null);
      resetItemForm();
      await usePOSStore.getState().fetchData();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to update menu item',
            itemId: editingItem.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          null,
          2
        )
      );
      toast.error('Failed to update menu item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this menu item? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Deleting menu item',
            itemId,
          },
          null,
          2
        )
      );

      await posApi.deleteMenuItem(itemId);
      toast.success('Menu item deleted successfully!');
      await usePOSStore.getState().fetchData();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to delete menu item',
            itemId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          null,
          2
        )
      );
      toast.error('Failed to delete menu item');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.name || !categoryFormData.color || !categoryFormData.icon) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Creating category',
            category: categoryFormData,
          },
          null,
          2
        )
      );

      await posApi.createCategory(categoryFormData);
      toast.success('Category created successfully! 🎉');
      setShowCategoryForm(false);
      resetCategoryForm();
      await usePOSStore.getState().fetchData();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to create category',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          null,
          2
        )
      );
      toast.error('Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryFormData.name || !categoryFormData.color || !categoryFormData.icon) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Updating category',
            categoryId: editingCategory.id,
            category: categoryFormData,
          },
          null,
          2
        )
      );

      await posApi.updateCategory(editingCategory.id, categoryFormData);
      toast.success('Category updated successfully! ✨');
      setShowCategoryForm(false);
      setEditingCategory(null);
      resetCategoryForm();
      await usePOSStore.getState().fetchData();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to update category',
            categoryId: editingCategory?.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          null,
          2
        )
      );
      toast.error('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const itemsInCategory = localMenuItems.filter((item) => item.category_id === categoryId);
    if (itemsInCategory.length > 0) {
      toast.error(`Cannot delete category: ${itemsInCategory.length} items are using this category`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Deleting category',
            categoryId,
          },
          null,
          2
        )
      );

      await posApi.deleteCategory(categoryId);
      toast.success('Category deleted successfully!');
      await usePOSStore.getState().fetchData();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to delete category',
            categoryId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          null,
          2
        )
      );
      toast.error('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Toggling item availability',
            itemId,
            newAvailability: !isAvailable,
          },
          null,
          2
        )
      );

      await posApi.toggleItemAvailability(itemId, !isAvailable);
      toast.success(`Item ${isAvailable ? 'disabled' : 'enabled'} successfully!`);
      await usePOSStore.getState().fetchData();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to toggle item availability',
            itemId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          null,
          2
        )
      );
      toast.error('Failed to toggle item availability');
    }
  };

  const handleInventoryUpdate = async (itemId: string, newCount: number) => {
    if (newCount < 0) {
      toast.error('Inventory count cannot be negative');
      return;
    }

    try {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Updating inventory',
            itemId,
            newCount,
          },
          null,
          2
        )
      );

      await posApi.updateInventory(itemId, newCount);
      toast.success('Inventory updated successfully!');
      await usePOSStore.getState().fetchData();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to update inventory',
            itemId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          null,
          2
        )
      );
      toast.error('Failed to update inventory');
    }
  };

  const handleInventoryAdjustment = async () => {
    if (!inventoryAdjustment.itemId || !inventoryAdjustment.reason) {
      toast.error('Please select an item and provide a reason');
      return;
    }

    try {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Adjusting inventory',
            ...inventoryAdjustment,
          },
          null,
          2
        )
      );

      await posApi.adjustInventory(
        inventoryAdjustment.itemId,
        inventoryAdjustment.adjustment,
        inventoryAdjustment.reason
      );
      toast.success('Inventory adjusted successfully!');
      setShowInventoryModal(false);
      setInventoryAdjustment({ itemId: '', adjustment: 0, reason: '' });
      await usePOSStore.getState().fetchData();
    } catch (error) {
      console.error(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Failed to adjust inventory',
            ...inventoryAdjustment,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          null,
          2
        )
      );
      toast.error('Failed to adjust inventory');
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemFormData({
      id: item.id,
      name: item.name,
      price: item.price,
      cost_price: item.cost_price || 0,
      description: item.description || '',
      image_url: item.image_url,
      is_available: item.is_available,
      category_id: item.category_id || '',
      preparation_time: item.preparation_time || 0,
      spice_level: item.spice_level || 0,
      calories: item.calories || 0,
      abv: item.abv || 0,
      is_featured: item.is_featured || false,
      is_vegetarian: item.is_vegetarian || false,
      is_vegan: item.is_vegan || false,
      is_gluten_free: item.is_gluten_free || false,
      is_alcoholic: item.is_alcoholic || false,
      track_inventory: item.track_inventory || false,
      inventory_count: item.inventory_count || 0,
      minimum_stock: item.minimum_stock || 0,
    });
    setShowItemForm(true);
    setFormKey((prev) => prev + 1);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon || 'Coffee',
      business_type: category.business_type,
      is_active: category.is_active,
      sort_order: category.sort_order || localCategories.length,
    });
    setShowCategoryForm(true);
  };

  const resetItemForm = () => {
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Resetting item form',
        },
        null,
        2
      )
    );
    setItemFormData({
      name: '',
      price: 0,
      cost_price: 0,
      description: '',
      image_url: null,
      is_available: true,
      category_id: localCategories.length > 0 ? localCategories[0].id : '',
      preparation_time: 0,
      spice_level: 0,
      calories: 0,
      abv: 0,
      is_featured: false,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_alcoholic: false,
      track_inventory: false,
      inventory_count: 0,
      minimum_stock: 0,
    });
    setFormKey((prev) => prev + 1);
  };

  const resetCategoryForm = () => {
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Resetting category form',
        },
        null,
        2
      )
    );
    setCategoryFormData({
      name: '',
      color: '#3B82F6',
      icon: 'Coffee',
      business_type: 'restaurant',
      is_active: true,
      sort_order: localCategories.length,
    });
  };

  const filteredItems = localMenuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
    const matchesInventory =
      activeTab !== 'inventory' ||
      (inventoryFilter === 'all' ||
        (inventoryFilter === 'tracked' && item.track_inventory) ||
        (inventoryFilter === 'untracked' && !item.track_inventory) ||
        (inventoryFilter === 'low_stock' &&
          item.track_inventory &&
          item.inventory_count <= item.minimum_stock &&
          item.inventory_count > 0) ||
        (inventoryFilter === 'out_of_stock' && item.track_inventory && item.inventory_count <= 0));
    return matchesSearch && matchesCategory && matchesInventory;
  });

  const getInventoryCounts = () => {
    return {
      total: localMenuItems.length,
      tracked: localMenuItems.filter((item) => item.track_inventory).length,
      lowStock: localMenuItems.filter(
        (item) => item.track_inventory && item.inventory_count <= item.minimum_stock && item.inventory_count > 0
      ).length,
      outOfStock: localMenuItems.filter((item) => item.track_inventory && item.inventory_count <= 0).length,
    };
  };

  const inventoryCounts = getInventoryCounts();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading && !showItemForm && !showCategoryForm && !showInventoryModal) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Menu...</p>
        </div>
      </div>
    );
  }
  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
                <Menu className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">Menu & Inventory Management</h1>
                <p className="text-orange-100">Manage menu items, categories, and inventory levels</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 text-center">
                  <div className="text-2xl font-bold">{localMenuItems.length}</div>
                  <div className="text-orange-100 text-sm">Total Items</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 text-center">
                  <div className="text-2xl font-bold">{inventoryCounts.lowStock}</div>
                  <div className="text-orange-100 text-sm">Low Stock</div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (activeTab === 'items') {
                    setShowItemForm(true);
                    setEditingItem(null);
                    resetItemForm();
                  } else if (activeTab === 'categories') {
                    setShowCategoryForm(true);
                    setEditingCategory(null);
                    resetCategoryForm();
                  } else {
                    setShowInventoryModal(true);
                  }
                }}
                className="px-8 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-2xl font-bold transition-all transform hover:scale-105 flex items-center shadow-lg border border-white/30"
              >
                <Plus className="w-5 h-5 mr-3" />
                {activeTab === 'items' ? 'Add Menu Item' : activeTab === 'categories' ? 'Add Category' : 'Adjust Inventory'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex space-x-2 mb-6">
            {[
              { id: 'items', label: `Menu Items (${localMenuItems.length})`, icon: Menu },
              { id: 'categories', label: `Categories (${localCategories.length})`, icon: Folder },
              { id: 'inventory', label: `Inventory (${inventoryCounts.tracked})`, icon: Package },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-lg font-semibold shadow-sm"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  console.log(JSON.stringify({
                    timestamp: new Date().toISOString(),
                    level: 'debug',
                    message: 'Search query updated',
                    value: e.target.value,
                  }, null, 2));
                }}
              />
            </div>

            <div className="flex space-x-3">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  console.log(JSON.stringify({
                    timestamp: new Date().toISOString(),
                    level: 'debug',
                    message: 'Category filter updated',
                    value: e.target.value,
                  }, null, 2));
                }}
                className="px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white font-semibold shadow-sm"
              >
                <option value="all">All Categories</option>
                {localCategories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {activeTab === 'inventory' && (
                <select
                  value={inventoryFilter}
                  onChange={(e) => {
                    setInventoryFilter(e.target.value);
                    console.log(JSON.stringify({
                      timestamp: new Date().toISOString(),
                      level: 'debug',
                      message: 'Inventory filter updated',
                      value: e.target.value,
                    }, null, 2));
                  }}
                  className="px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white font-semibold shadow-sm"
                >
                  <option value="all">All Items ({inventoryCounts.total})</option>
                  <option value="tracked">Tracked ({inventoryCounts.tracked})</option>
                  <option value="low_stock">Low Stock ({inventoryCounts.lowStock})</option>
                  <option value="out_of_stock">Out of Stock ({inventoryCounts.outOfStock})</option>
                  <option value="untracked">Not Tracked ({inventoryCounts.total - inventoryCounts.tracked})</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'items' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const category = localCategories.find(cat => cat.id === item.category_id);
              const IconComponent = category ? categoryIcons[category.icon] || Coffee : Coffee;
              const isLowStock = item.track_inventory && item.inventory_count <= item.minimum_stock;
              const isOutOfStock = item.track_inventory && item.inventory_count <= 0;

              return (
                <div key={item.id} className={`bg-white rounded-3xl shadow-xl border-2 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden ${
                  isOutOfStock ? 'border-red-300 ring-2 ring-red-100' :
                  isLowStock ? 'border-orange-300 ring-2 ring-orange-100' :
                  'border-gray-100'
                }`}>
                  <div className="relative h-48 overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <IconComponent className="w-16 h-16 text-gray-400" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-col space-y-2">
                      {!item.is_available && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          Unavailable
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                          Out of Stock
                        </span>
                      )}
                      {isLowStock && !isOutOfStock && (
                        <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                          Low Stock
                        </span>
                      )}
                      {item.is_featured && (
                        <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex space-x-1">
                      {item.is_vegan && (
                        <div className="bg-green-500 p-1 rounded-full">
                          <Leaf className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {item.spice_level > 0 && (
                        <div className="bg-red-500 p-1 rounded-full">
                          <Flame className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {item.is_alcoholic && (
                        <div className="bg-purple-500 p-1 rounded-full">
                          <Wine className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(item.price)}
                      </div>
                      {category && (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {item.preparation_time > 0 && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{item.preparation_time} min</span>
                        </div>
                      )}
                      {item.track_inventory && (
                        <div className="flex items-center space-x-1">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className={`text-gray-600 ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : ''}`}>
                            Stock: {item.inventory_count}
                          </span>
                        </div>
                      )}
                      {item.calories > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-600">{item.calories} cal</span>
                        </div>
                      )}
                      {item.spice_level > 0 && (
                        <div className="flex items-center space-x-1">
                          <Flame className="w-4 h-4 text-red-500" />
                          <span className={spiceLevels[item.spice_level]?.color || 'text-gray-600'}>
                            {spiceLevels[item.spice_level]?.label || 'Unknown'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.is_vegetarian && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          Vegetarian
                        </span>
                      )}
                      {item.is_vegan && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          Vegan
                        </span>
                      )}
                      {item.is_gluten_free && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                          Gluten Free
                        </span>
                      )}
                    </div>

                    <div className="flex space-x-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all flex items-center justify-center font-semibold"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleAvailability(item.id, item.is_available)}
                        className={`px-4 py-3 rounded-xl transition-all flex items-center justify-center font-semibold ${
                          item.is_available
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {item.is_available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-4 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all flex items-center justify-center font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <Menu className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-500 mb-4">No menu items found</h3>
                <p className="text-gray-400 mb-6">
                  {searchQuery
                    ? `No items match "${searchQuery}"`
                    : 'Start by creating your first menu item'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{inventoryCounts.tracked}</p>
                  <p className="text-sm text-gray-600">Tracked Items</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-xl">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{inventoryCounts.lowStock}</p>
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-xl">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{inventoryCounts.outOfStock}</p>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.filter(item => item.track_inventory).map((item) => {
                const isLowStock = item.inventory_count <= item.minimum_stock && item.inventory_count > 0;
                const isOutOfStock = item.inventory_count <= 0;

                return (
                  <div key={item.id} className={`bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${
                    isOutOfStock ? 'border-red-300' :
                    isLowStock ? 'border-orange-300' :
                    'border-green-300'
                  }`}>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isOutOfStock ? 'bg-red-100 text-red-700' :
                          isLowStock ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {isOutOfStock ? 'Out of Stock' :
                           isLowStock ? 'Low Stock' :
                           'In Stock'}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-600">Current Stock:</span>
                            <div className={`text-xl font-bold ${
                              isOutOfStock ? 'text-red-600' :
                              isLowStock ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {item.inventory_count}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600">Min Stock:</span>
                            <div className="text-xl font-bold text-gray-700">{item.minimum_stock}</div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleInventoryUpdate(item.id, Math.max(0, item.inventory_count - 1))}
                            className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all flex items-center justify-center font-semibold"
                          >
                            <Minus className="w-4 h-4 mr-1" />
                            Remove
                          </button>
                          <button
                            onClick={() => handleInventoryUpdate(item.id, item.inventory_count + 1)}
                            className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all flex items-center justify-center font-semibold"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.filter(item => item.track_inventory).length === 0 && (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-500 mb-4">No inventory items found</h3>
                <p className="text-gray-400">Enable inventory tracking on menu items to see them here</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {localCategories.map((category) => {
              const IconComponent = categoryIcons[category.icon] || Coffee;
              const itemCount = localMenuItems.filter(item => item.category_id === category.id).length;

              return (
                <div key={category.id} className="bg-white rounded-3xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
                  <div
                    className="p-6 text-white"
                    style={{ background: `linear-gradient(135deg, ${category.color}, ${category.color}dd)` }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{itemCount}</div>
                        <div className="text-white/80 text-sm">Items</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-1">{category.name}</h3>
                      <div className="flex items-center space-x-2 text-white/90">
                        <span className="text-sm font-semibold capitalize">{category.business_type}</span>
                        <span className="text-white/60">•</span>
                        <span className="text-sm">{category.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Sort Order:</span>
                        <div className="font-bold text-gray-900">{category.sort_order}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <div className={`font-bold ${category.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all flex items-center justify-center font-semibold"
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={itemCount > 0}
                        className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center font-semibold ${
                          itemCount > 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        title={itemCount > 0 ? `Cannot delete: ${itemCount} items use this category` : 'Delete category'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-dashed border-orange-300 rounded-2xl p-6 flex items-center justify-center hover:border-orange-400 transition-all cursor-pointer"
                 onClick={() => {
                   setShowCategoryForm(true);
                   setEditingCategory(null);
                   resetCategoryForm();
                 }}>
              <div className="text-center">
                <div className="bg-orange-100 p-4 rounded-full mx-auto mb-3">
                  <Plus className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="font-bold text-orange-600">Add Category</h3>
                <p className="text-sm text-orange-500">Create a new menu category</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && localCategories.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Folder className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-500 mb-4">No categories found</h3>
            <p className="text-gray-400 mb-6">Start by creating your first category</p>
          </div>
        )}

        {/* Menu Item Form Modal */}
        {showItemForm && (
          <div key={formKey} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 bg-gradient-to-r from-orange-600 to-red-600 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold flex items-center">
                    <Menu className="w-6 h-6 mr-3" />
                    {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowItemForm(false);
                      setEditingItem(null);
                      resetItemForm();
                    }}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        Item Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={itemFormData.name}
                        onChange={(e) => handleItemInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                        placeholder="Enter item name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={itemFormData.category_id}
                        onChange={(e) => handleItemInputChange('category_id', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                        required
                      >
                        <option value="">Select a category</option>
                        {localCategories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={itemFormData.price}
                          onChange={(e) => handleItemInputChange('price', parseFloat(e.target.value))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Cost Price</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={itemFormData.cost_price}
                          onChange={(e) => handleItemInputChange('cost_price', parseFloat(e.target.value))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Description</label>
                      <textarea
                        value={itemFormData.description}
                        onChange={(e) => handleItemInputChange('description', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg resize-none"
                        rows={3}
                        placeholder="Describe your menu item..."
                      />
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                      <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2" />
                        Inventory Management
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-blue-700 mb-3">
                            Inventory Tracking <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={itemFormData.track_inventory ? 'track' : 'no_track'}
                            onChange={(e) => {
                              const trackInventory = e.target.value === 'track';
                              handleItemInputChange('track_inventory', trackInventory);
                              console.log(JSON.stringify({
                                timestamp: new Date().toISOString(),
                                level: 'debug',
                                message: 'Inventory tracking dropdown changed',
                                value: e.target.value,
                                track_inventory: trackInventory,
                              }, null, 2));
                            }}
                            className="w-full px-4 py-3 border-2 border-blue-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold bg-white"
                          >
                            <option value="track">Track Inventory</option>
                            <option value="no_track">Do Not Track Inventory</option>
                          </select>
                          <p className="text-sm text-blue-600 mt-2">
                            Monitor stock levels and get low stock alerts
                          </p>
                        </div>

                        {itemFormData.track_inventory && (
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-bold text-blue-700 mb-2">
                                Current Stock
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={itemFormData.inventory_count}
                                onChange={(e) => handleItemInputChange('inventory_count', parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold bg-white"
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-blue-700 mb-2">
                                Minimum Stock Alert
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={itemFormData.minimum_stock}
                                onChange={(e) => handleItemInputChange('minimum_stock', parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold bg-white"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Item Image</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-orange-400 transition-colors">
                        {itemFormData.image_url ? (
                          <div className="space-y-4">
                            <img
                              src={itemFormData.image_url}
                              alt="Item preview"
                              className="max-w-full max-h-48 mx-auto rounded-xl shadow-lg"
                            />
                            <div className="flex space-x-3 justify-center">
                              <label className="cursor-pointer bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors flex items-center font-semibold">
                                <Upload className="w-4 h-4 mr-2" />
                                Change Image
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="hidden"
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => handleItemInputChange('image_url', null)}
                                className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors flex items-center font-semibold"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                              <ImageIcon className="w-10 h-10 text-gray-400" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-700 mb-2">Upload Item Image</h4>
                              <p className="text-gray-500 text-sm mb-4">Choose an image to showcase your menu item</p>
                              <label className="cursor-pointer bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 inline-flex items-center font-bold">
                                <Folder className="w-5 h-5 mr-2" />
                                Browse Files
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Preparation Time (minutes)</label>
                        <input
                          type="number"
                          min="0"
                          value={itemFormData.preparation_time}
                          onChange={(e) => handleItemInputChange('preparation_time', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Calories</label>
                        <input
                          type="number"
                          min="0"
                          value={itemFormData.calories}
                          onChange={(e) => handleItemInputChange('calories', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Spice Level</label>
                      <select
                        value={itemFormData.spice_level}
                        onChange={(e) => handleItemInputChange('spice_level', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                      >
                        {spiceLevels.map(level => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
                      <h4 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                        <Leaf className="w-5 h-5 mr-2" />
                        Dietary & Features
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={itemFormData.is_featured}
                                onChange={(e) => handleItemInputChange('is_featured', e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-10 h-5 rounded-full transition-all duration-300 ${
                                itemFormData.is_featured
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                  : 'bg-gray-300'
                              }`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                                  itemFormData.is_featured ? 'translate-x-5' : 'translate-x-0.5'
                                } mt-0.5`}></div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 mr-2 text-yellow-500" />
                              <span className="font-bold text-green-800 group-hover:text-green-900 transition-colors">
                                Featured Item
                              </span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={itemFormData.is_vegetarian}
                                onChange={(e) => handleItemInputChange('is_vegetarian', e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-10 h-5 rounded-full transition-all duration-300 ${
                                itemFormData.is_vegetarian
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : 'bg-gray-300'
                              }`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                                  itemFormData.is_vegetarian ? 'translate-x-5' : 'translate-x-0.5'
                                } mt-0.5`}></div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Leaf className="w-4 h-4 mr-2 text-green-500" />
                              <span className="font-bold text-green-800 group-hover:text-green-900 transition-colors">
                                Vegetarian
                              </span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={itemFormData.is_vegan}
                                onChange={(e) => handleItemInputChange('is_vegan', e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-10 h-5 rounded-full transition-all duration-300 ${
                                itemFormData.is_vegan
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : 'bg-gray-300'
                              }`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                                  itemFormData.is_vegan ? 'translate-x-5' : 'translate-x-0.5'
                                } mt-0.5`}></div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Leaf className="w-4 h-4 mr-2 text-green-600" />
                              <span className="font-bold text-green-800 group-hover:text-green-900 transition-colors">
                                Vegan
                              </span>
                            </div>
                          </label>
                        </div>

                        <div className="space-y-4">
                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={itemFormData.is_gluten_free}
                                onChange={(e) => handleItemInputChange('is_gluten_free', e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-10 h-5 rounded-full transition-all duration-300 ${
                                itemFormData.is_gluten_free
                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                  : 'bg-gray-300'
                              }`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                                  itemFormData.is_gluten_free ? 'translate-x-5' : 'translate-x-0.5'
                                } mt-0.5`}></div>
                              </div>
                            </div>
                            <span className="font-bold text-green-800 group-hover:text-green-900 transition-colors">
                              Gluten Free
                            </span>
                          </label>

                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={itemFormData.is_alcoholic}
                                onChange={(e) => handleItemInputChange('is_alcoholic', e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-10 h-5 rounded-full transition-all duration-300 ${
                                itemFormData.is_alcoholic
                                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                                  : 'bg-gray-300'
                              }`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                                  itemFormData.is_alcoholic ? 'translate-x-5' : 'translate-x-0.5'
                                } mt-0.5`}></div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Wine className="w-4 h-4 mr-2 text-purple-500" />
                              <span className="font-bold text-green-800 group-hover:text-green-900 transition-colors">
                                Contains Alcohol (21+)
                              </span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={itemFormData.is_available}
                                onChange={(e) => handleItemInputChange('is_available', e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-10 h-5 rounded-full transition-all duration-300 ${
                                itemFormData.is_available
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : 'bg-gray-300'
                              }`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                                  itemFormData.is_available ? 'translate-x-5' : 'translate-x-0.5'
                                } mt-0.5`}></div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                              <span className="font-bold text-green-800 group-hover:text-green-900 transition-colors">
                                Available for Order
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {itemFormData.is_alcoholic && (
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-3">
                            Alcohol by Volume (ABV %)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={itemFormData.abv}
                            onChange={(e) => handleItemInputChange('abv', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                            placeholder="0.0"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowItemForm(false);
                      setEditingItem(null);
                      resetItemForm();
                    }}
                    className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold text-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingItem ? handleUpdateItem : handleCreateItem}
                    disabled={loading}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto" />
                    ) : (
                      <>
                        
                      









                       <Save className="w-5 h-5 mr-2" />
                        {editingItem ? 'Update Item' : 'Create Item'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Form Modal */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 bg-gradient-to-r from-orange-600 to-red-600 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold flex items-center">
                    <Folder className="w-6 h-6 mr-3" />
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCategoryForm(false);
                      setEditingCategory(null);
                      resetCategoryForm();
                    }}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => handleCategoryInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                    placeholder="Enter category name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Color <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="color"
                      value={categoryFormData.color}
                      onChange={(e) => handleCategoryInputChange('color', e.target.value)}
                      className="w-full h-12 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Icon <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={categoryFormData.icon}
                      onChange={(e) => handleCategoryInputChange('icon', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                    >
                      {Object.keys(categoryIcons).map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryFormData.business_type}
                    onChange={(e) => handleCategoryInputChange('business_type', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Cafe</option>
                    <option value="bar">Bar</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Sort Order <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={categoryFormData.sort_order === undefined ? '' : categoryFormData.sort_order}
                    onChange={(e) => handleCategoryInputChange('sort_order', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                    placeholder="0"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={categoryFormData.is_active}
                        onChange={(e) => handleCategoryInputChange('is_active', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                        categoryFormData.is_active
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gray-300'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
                          categoryFormData.is_active ? 'translate-x-6' : 'translate-x-0.5'
                        } mt-0.5`}></div>
                      </div>
                    </div>
                    <div>
                      <span className="text-lg font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                        Active Category
                      </span>
                      <p className="text-sm text-gray-600">Enable or disable this category</p>
                    </div>
                  </label>
                </div>

                <div className="flex space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryForm(false);
                      setEditingCategory(null);
                      resetCategoryForm();
                    }}
                    className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold text-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                    disabled={loading}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto" />
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        {editingCategory ? 'Update Category' : 'Create Category'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Adjustment Modal */}
        {showInventoryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold flex items-center">
                    <Calculator className="w-6 h-6 mr-3" />
                    Adjust Inventory
                  </h3>
                  <button
                    onClick={() => {
                      setShowInventoryModal(false);
                      setInventoryAdjustment({ itemId: '', adjustment: 0, reason: '' });
                    }}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Select Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={inventoryAdjustment.itemId}
                    onChange={(e) =>
                      setInventoryAdjustment((prev) => ({
                        ...prev,
                        itemId: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                  >
                    <option value="">Select an item</option>
                    {localMenuItems
                      .filter((item) => item.track_inventory)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Stock: {item.inventory_count})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Adjustment Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={inventoryAdjustment.adjustment === undefined ? '' : inventoryAdjustment.adjustment}
                    onChange={(e) =>
                      setInventoryAdjustment((prev) => ({
                        ...prev,
                        adjustment: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg font-semibold"
                    placeholder="0"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Positive numbers add stock, negative numbers remove stock
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Reason for Adjustment <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={inventoryAdjustment.reason}
                    onChange={(e) =>
                      setInventoryAdjustment((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg resize-none"
                    rows={3}
                    placeholder="e.g., Received new shipment, Spoilage, etc."
                  />
                </div>

                <div className="flex space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInventoryModal(false);
                      setInventoryAdjustment({ itemId: '', adjustment: undefined, reason: '' });
                    }}
                    className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold text-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInventoryAdjustment}
                    disabled={loading}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center shadow-lg"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto" />
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Adjust Inventory
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}