import React, { useState, useEffect } from 'react';
import { usePOSStore } from '../../../store/posStore';
import { posApi } from '../../../lib/api';
import { Search, Filter, Star, Leaf, Flame, Wine, Coffee, Keyboard, X, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const categoryIcons = {
  'ChefHat': Coffee,
  'Utensils': Coffee,
  'Cake': Coffee,
  'Beer': Wine,
  'Wine': Wine,
  'Martini': Wine,
  'Coffee': Coffee
};

// Touch Screen Keyboard Component for Menu Search
const MenuKeyboard = ({ value, onChange, onClose, placeholder = "" }) => {
  const [currentValue, setCurrentValue] = useState(value);

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setCurrentValue(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setCurrentValue('');
    } else if (key === 'space') {
      setCurrentValue(prev => prev + ' ');
    } else {
      setCurrentValue(prev => prev + key);
    }
  };

  const handleDone = () => {
    onChange(currentValue);
    onClose();
  };

  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const letterKeys = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Search className="w-6 h-6 mr-3 text-purple-500" />
            Search Menu
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="mb-6">
          <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-200 min-h-[60px] flex items-center">
            <input
              type="text"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-xl font-mono text-gray-900 outline-none"
              readOnly
            />
          </div>
        </div>
        <div className="grid grid-cols-10 gap-2 mb-4">
          {numberKeys.map(key => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl font-semibold text-gray-800 transition-all transform active:scale-95"
            >
              {key}
            </button>
          ))}
        </div>
        {letterKeys.map((row, rowIndex) => (
          <div key={rowIndex} className={`grid gap-2 mb-3 ${
            rowIndex === 0 ? 'grid-cols-10' : 
            rowIndex === 1 ? 'grid-cols-9' : 'grid-cols-7'
          }`}>
            {row.map(key => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl font-semibold text-gray-800 transition-all transform active:scale-95 uppercase"
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => handleKeyPress('space')}
            className="h-12 bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-700 rounded-xl font-semibold transition-all transform active:scale-95"
          >
            Space
          </button>
          <button
            onClick={() => handleKeyPress('.')}
            className="h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl font-semibold text-gray-800 transition-all transform active:scale-95"
          >
            .
          </button>
          <button
            onClick={() => handleKeyPress('backspace')}
            className="h-12 bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-700 rounded-xl font-semibold transition-all transform active:scale-95"
          >
            ⌫
          </button>
          <button
            onClick={() => handleKeyPress('clear')}
            className="h-12 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 rounded-xl font-semibold transition-all transform active:scale-95"
          >
            Clear
          </button>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 h-14 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="flex-1 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105 flex items-center justify-center"
          >
            <CheckCircle className="w-6 h-6 mr-2" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface MenuViewProps {
  onCreateOrder?: () => boolean;
}

export function MenuView({ onCreateOrder }: MenuViewProps) {
  const { menuItems, categories, addToCart, dataLoaded, fetchDataLazy, forceRefreshMenuItems, invalidateStockCache } = usePOSStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [filters, setFilters] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    alcoholic: false,
    featured: false
  });
  const [currency, setCurrency] = useState('UGX');
  const loading = !dataLoaded.menuItems || !dataLoaded.categories; // Define loading state
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    // Load menu data immediately if not already loaded
    if (!dataLoaded.menuItems || !dataLoaded.categories) {
      fetchDataLazy(['menuItems', 'categories']);
    }
    
    // Set up real-time inventory polling for menu view
    const inventoryPolling = setInterval(() => {
      if (dataLoaded.menuItems) {
        forceRefreshMenuItems();
      }
    }, 5000); // Poll every 5 seconds for inventory updates

    return () => {
      clearInterval(inventoryPolling);
    };
  }, [dataLoaded.menuItems, dataLoaded.categories, fetchDataLazy]);

  // Listen for inventory changes from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'inventory_updated') {
        invalidateStockCache();
        forceRefreshMenuItems();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events
    const handleInventoryUpdate = () => {
      invalidateStockCache();
      forceRefreshMenuItems();
    };

    window.addEventListener('inventoryUpdated', handleInventoryUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
    };
  }, [invalidateStockCache, forceRefreshMenuItems]);
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const menuData = await posApi.getMenuItems();
        setCurrency(menuData.currency || 'UGX');
      } catch (error) {
        toast.error('Failed to load menu currency');
      }
    };
    fetchMenuData();
  }, []);

  useEffect(() => {
    menuItems.forEach(item => {
      if (!item.name || typeof item.price !== 'number' || isNaN(item.price)) {
        console.warn('Invalid item detected:', {
          id: item.id,
          name: item.name,
          price: item.price,
          inventory_count: item.inventory_count,
          minimum_stock: item.minimum_stock,
          is_available: item.is_available
        });
      }
    });
  }, [menuItems]);

  const formatCurrency = (value: number | undefined | null) => {
    const validValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(validValue);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesFilters = 
      (!filters.vegetarian || item.is_vegetarian) &&
      (!filters.vegan || item.is_vegan) &&
      (!filters.glutenFree || item.is_gluten_free) &&
      (!filters.alcoholic || item.is_alcoholic) &&
      (!filters.featured || item.is_featured);
    
    return matchesSearch && matchesCategory && matchesFilters;
  });

  const handleAddToCart = (item) => {
    const { currentShift, cart } = usePOSStore.getState();
    if (!currentShift) {
      toast.error('Cannot add to cart: Please start your shift first');
      return;
    }

    // Show loading state for this specific item
    setIsAddingToCart(item.id);

    // Normalize item data to match addToCart expectations
    const validItem = {
      id: `${item.id}-${Date.now()}`, // Match cartItem ID format
      menu_item: {
        ...item,
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')
      },
      name: item.name || `Item-${item.id || 'unknown'}`,
      quantity: 1,
      unit_price: String(item.price || 0),
      total_price: String(item.price || 0),
      modifiers: item.modifiers || [],
      special_instructions: item.special_instructions || null
    };

    if (!item.name || typeof item.price !== 'number' || isNaN(item.price)) {
      console.warn('Invalid item data, using fallbacks:', validItem);
      toast.error(`Warning: ${validItem.name} has incomplete data, using default values`);
    }

    if (validItem.menu_item.track_inventory && validItem.menu_item.inventory_count <= 0) {
      toast.error(`${validItem.name} is out of stock! Cannot add to cart.`);
      return;
    }

    if (validItem.menu_item.track_inventory && validItem.menu_item.inventory_count <= validItem.menu_item.minimum_stock) {
      toast.error(`⚠️ ${validItem.name} is running low on stock (${validItem.menu_item.inventory_count} remaining)!`, {
        duration: 6000,
        style: {
          background: '#FEF3C7',
          color: '#92400E',
          border: '2px solid #F59E0B'
        }
      });
    }

    // Optimized cart update with immediate UI feedback
    const addToCartPromise = new Promise((resolve) => {
      setTimeout(() => {
    // Force cart update to bypass addToCart issues
    usePOSStore.setState((state) => ({
      cart: [...state.cart, validItem]
    }));
        setIsAddingToCart(null);
        
        // Trigger inventory cache invalidation
        invalidateStockCache();
        
        resolve(true);
      }, 100); // Small delay for UI feedback
    });
    
    toast.success(`${validItem.name} added to cart!`);
  };

  // Show loading only if data is not loaded yet
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Menu...</p>
          <p className="text-gray-500">Preparing delicious options for you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={() => setShowKeyboard(true)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-xl transition-colors"
            >
              <Keyboard className="w-5 h-5" />
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
            <div className="flex flex-wrap gap-3">
              {Object.entries(filters).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setFilters(prev => ({ ...prev, [key]: !value }))}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 relative ${
                    value
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {key === 'glutenFree' ? 'Gluten Free' : 
                   key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center px-6 py-3 rounded-2xl font-semibold transition-all transform hover:scale-105 ${
              !selectedCategory
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={loading}
          >
            All Items
          </button>
          {categories.map(category => {
            const IconComponent = categoryIcons[category.icon] || Coffee;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-6 py-3 rounded-2xl font-semibold transition-all transform hover:scale-105 ${
                  selectedCategory === category.id
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{
                  background: selectedCategory === category.id 
                    ? `linear-gradient(135deg, ${category.color}, ${category.color}dd)` 
                    : undefined
                }}
                disabled={loading}
              >
                <IconComponent className="w-5 h-5 mr-2" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredItems.map(item => (
            <button
              key={item.id || `item-${Math.random()}`}
              onClick={() => handleAddToCart(item)}
              disabled={loading || !item.is_available || (item.track_inventory && item.inventory_count <= 0) || isAddingToCart === item.id}
              className={`group bg-white rounded-2xl shadow-lg transition-all duration-300 transform overflow-hidden border relative ${
                item.is_available && (!item.track_inventory || item.inventory_count > 0)
                  ? 'border-gray-100 hover:shadow-2xl hover:scale-105 cursor-pointer'
                  : 'border-red-200 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
            >
              {/* Loading overlay for specific item */}
              {isAddingToCart === item.id && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
                    <p className="text-sm font-semibold text-purple-600">Adding to cart...</p>
                  </div>
                </div>
              )}
              
              <div className="relative h-48 overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name || 'Item'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <Coffee className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-col space-y-2">
                  {(!item.is_available || (item.track_inventory && item.inventory_count <= 0)) && (
                    <span className="bg-red-500 text-white px-3 py-2 rounded-full text-sm font-bold flex items-center shadow-lg">
                      <X className="w-4 h-4 mr-1" />
                      {!item.is_available ? 'Not Available' : 'Out of Stock'}
                    </span>
                  )}
                  {item.track_inventory && item.inventory_count > 0 && item.inventory_count <= item.minimum_stock && (
                    <span className="bg-orange-500 text-white px-3 py-2 rounded-full text-sm font-bold flex items-center shadow-lg animate-pulse">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Low Stock ({item.inventory_count})
                    </span>
                  )}
                  {item.is_featured && (
                    <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </span>
                  )}
                  {item.is_alcoholic && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      21+
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
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className={`font-bold text-lg transition-colors line-clamp-1 ${
                    item.is_available && (!item.track_inventory || item.inventory_count > 0)
                      ? 'text-gray-900 group-hover:text-purple-600'
                      : 'text-gray-500'
                  }`}>
                    {item.name || 'Unnamed Item'}
                  </h3>
                  {item.description && (
                    <p className={`text-sm line-clamp-2 mt-1 ${
                      item.is_available && (!item.track_inventory || item.inventory_count > 0)
                        ? 'text-gray-600'
                        : 'text-gray-400'
                    }`}>
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${
                    item.is_available && (!item.track_inventory || item.inventory_count > 0)
                      ? 'text-purple-600'
                      : 'text-gray-400'
                  }`}>
                    {formatCurrency(item.price)}
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {item.track_inventory && (
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        item.inventory_count <= 0
                          ? 'bg-red-100 text-red-700'
                          : item.inventory_count <= item.minimum_stock
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        Stock: {item.inventory_count}
                      </span>
                    )}
                    {item.preparation_time > 0 && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.is_available && (!item.track_inventory || item.inventory_count > 0)
                          ? 'text-gray-500 bg-gray-100'
                          : 'text-gray-400 bg-gray-50'
                      }`}>
                        ~{item.preparation_time} min
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex space-x-2">
                    {item.is_vegetarian && (
                      <span className={item.is_available && (!item.track_inventory || item.inventory_count > 0)
                        ? 'text-green-600'
                        : 'text-gray-400'}>
                        Vegetarian
                      </span>
                    )}
                    {item.is_gluten_free && (
                      <span className={item.is_available && (!item.track_inventory || item.inventory_count > 0)
                        ? 'text-blue-600'
                        : 'text-gray-400'}>
                        Gluten Free
                      </span>
                    )}
                  </div>
                  {item.calories && (
                    <span className={item.is_available && (!item.track_inventory || item.inventory_count > 0)
                      ? 'text-gray-500'
                      : 'text-gray-400'}>
                      {item.calories} cal
                    </span>
                  )}
                </div>
              </div>
              {(!item.is_available || (item.track_inventory && item.inventory_count <= 0)) && (
                <div className="absolute inset-0 bg-gray-500/30 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                  <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                    {!item.is_available ? 'Currently Unavailable' : 'Out of Stock'}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <Coffee className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500 mb-2">No items found</p>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
      {showKeyboard && (
        <MenuKeyboard
          value={searchQuery}
          onChange={setSearchQuery}
          onClose={() => setShowKeyboard(false)}
          placeholder="Search menu items..."
        />
      )}
    </div>
  );
}