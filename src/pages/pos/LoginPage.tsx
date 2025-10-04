import React, { useState, useEffect, useRef } from 'react';
import { usePOSStore } from '../../store/posStore';
import { User, Lock, Utensils, Coffee, Wine, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface POSStore {
  login: (staffId: string, pin: string) => Promise<boolean>;
}

export function LoginPage() {
  const [staffId, setStaffId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeInput, setActiveInput] = useState<'staffId' | 'pin'>('staffId');
  const login = usePOSStore((state: POSStore) => state.login);
  const staffIdRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (activeInput === 'staffId') {
          setActiveInput('pin');
        } else {
          setActiveInput('staffId');
        }
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        if (activeInput === 'staffId' && staffId.length < 6) {
          setStaffId(prev => prev + e.key);
        } else if (activeInput === 'pin' && pin.length < 4) {
          setPin(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        if (activeInput === 'staffId') {
          setStaffId(prev => prev.slice(0, -1));
        } else {
          setPin(prev => prev.slice(0, -1));
        }
      } else if (e.key === 'Escape') {
        if (activeInput === 'staffId') {
          setStaffId('');
        } else {
          setPin('');
        }
      } else if (e.key === 'Enter' && staffId && pin.length === 4) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeInput, staffId, pin]);

  // Auto-focus the active input
  useEffect(() => {
    if (activeInput === 'staffId' && staffIdRef.current) {
      staffIdRef.current.focus();
    } else if (activeInput === 'pin' && pinRef.current) {
      pinRef.current.focus();
    }
  }, [activeInput]);

  const handleSubmit = async () => {
    if (!/^\d{1,6}$/.test(staffId)) {
      toast.error('Staff ID must be 1-6 digits');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);
    try {
      const success = await login(staffId, pin);
      if (!success) {
        toast.error('Invalid Staff ID or PIN');
        setPin('');
        setActiveInput('pin');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
      setPin('');
      setActiveInput('pin');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitInput = (digit: string) => {
    if (activeInput === 'staffId' && staffId.length < 6) {
      setStaffId(prev => prev + digit);
    } else if (activeInput === 'pin' && pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const clearActiveInput = () => {
    if (activeInput === 'staffId') {
      setStaffId('');
    } else {
      setPin('');
    }
  };

  const deleteLastDigit = () => {
    if (activeInput === 'staffId') {
      setStaffId(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-2xl">
            <div className="flex space-x-1">
              <Utensils className="w-5 h-5 text-indigo-600" />
              <Coffee className="w-5 h-5 text-purple-600" />
              <Wine className="w-5 h-5 text-pink-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Restaurant POS
          </h1>
          <p className="text-purple-200 text-sm">Staff Login</p>
        </div>

        {/* Main Login Interface */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-white/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Input Fields */}
            <div className="space-y-6">
              {/* Staff ID Input */}
              <div>
                <label
                  htmlFor="staffId"
                  className="block text-sm font-semibold text-white mb-3"
                >
                  <User className="inline w-4 h-4 mr-2" />
                  Staff ID
                </label>
                <div
                  ref={staffIdRef}
                  id="staffId"
                  tabIndex={0}
                  onClick={() => setActiveInput('staffId')}
                  onFocus={() => setActiveInput('staffId')}
                  className={`w-full px-4 py-3 backdrop-blur-sm border-2 rounded-xl transition-all cursor-pointer ${
                    activeInput === 'staffId'
                      ? 'bg-white/30 border-white/60 ring-2 ring-purple-400/50'
                      : 'bg-white/20 border-white/30'
                  }`}
                  aria-label="Staff ID input"
                  aria-describedby="staffIdHelp"
                  data-testid="input-staff-id"
                >
                  <div className="text-center">
                    <div className="text-xl font-mono text-white tracking-widest">
                      {staffId || '______'}
                    </div>
                  </div>
                </div>
                <div
                  id="staffIdHelp"
                  className="text-xs text-white/60 mt-1"
                >
                  {staffId.length > 0
                    ? `${staffId.length}/6 digits`
                    : 'Touch to enter Staff ID (max 6 digits)'}
                </div>
              </div>

              {/* PIN Input */}
              <div>
                <label
                  htmlFor="pin"
                  className="block text-sm font-semibold text-white mb-3"
                >
                  <Lock className="inline w-4 h-4 mr-2" />
                  PIN
                </label>
                <div
                  ref={pinRef}
                  id="pin"
                  tabIndex={0}
                  onClick={() => setActiveInput('pin')}
                  onFocus={() => setActiveInput('pin')}
                  className={`w-full px-4 py-3 backdrop-blur-sm border-2 rounded-xl transition-all cursor-pointer ${
                    activeInput === 'pin'
                      ? 'bg-white/30 border-white/60 ring-2 ring-purple-400/50'
                      : 'bg-white/20 border-white/30'
                  }`}
                  aria-label="PIN input"
                  aria-describedby="pinHelp"
                  data-testid="input-pin"
                >
                  <div className="flex justify-center space-x-2">
                    {[0, 1, 2, 3].map(index => (
                      <div
                        key={index}
                        className={`w-5 h-5 rounded-full transition-all duration-300 ${
                          index < pin.length
                            ? 'bg-gradient-to-r from-purple-400 to-pink-400 shadow-lg'
                            : 'bg-white/30'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>
                <div
                  id="pinHelp"
                  className="text-xs text-white/60 mt-1"
                >
                  {pin.length > 0
                    ? `${pin.length}/4 digits entered`
                    : 'Touch to enter PIN (4 digits)'}
                </div>
              </div>

              {/* Active Input Indicator */}
              <div className="text-center py-2">
                <div className="text-sm text-purple-200 font-medium">
                  Currently entering:{' '}
                  <span className="text-white font-bold">
                    {activeInput === 'staffId' ? 'Staff ID' : 'PIN'}
                  </span>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !staffId || pin.length !== 4}
                className="w-full min-h-12 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-base hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Sign in to POS system"
                data-testid="button-login"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Signing In...
                  </div>
                ) : (
                  'Sign In to POS'
                )}
              </button>
            </div>

            {/* Right Side - Always Visible Keypad */}
            <div className="space-y-4">
              <h3 className="text-center text-white font-semibold text-sm mb-4">
                Number Keypad
              </h3>

              {/* Number Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitInput(digit.toString())}
                    className="min-h-12 px-8 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-md font-medium text-sm transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      (activeInput === 'staffId' && staffId.length >= 6) ||
                      (activeInput === 'pin' && pin.length >= 4)
                    }
                    aria-label={`Number ${digit}`}
                    data-testid={`button-digit-${digit}`}
                  >
                    {digit}
                  </button>
                ))}
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={clearActiveInput}
                  className="min-h-12 px-8 py-2 bg-red-500/30 hover:bg-red-500/40 text-red-100 border border-red-400/30 rounded-md font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-400/50"
                  aria-label="Clear input"
                  data-testid="button-clear"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitInput('0')}
                  className="min-h-12 px-8 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-md font-medium text-sm transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    (activeInput === 'staffId' && staffId.length >= 6) ||
                    (activeInput === 'pin' && pin.length >= 4)
                  }
                  aria-label="Number 0"
                  data-testid="button-digit-0"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={deleteLastDigit}
                  className="min-h-12 px-8 py-2 bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 border border-amber-400/30 rounded-md font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  aria-label="Delete last digit"
                  data-testid="button-backspace"
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>

       
        </div>
      </div>
    </div>
  );
}