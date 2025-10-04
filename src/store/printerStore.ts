import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PrinterSettings, DEFAULT_PRINTER_SETTINGS, getPrinterInstance } from '../lib/printer';

interface PrinterState {
  settings: PrinterSettings;
  isConnected: boolean;
  isConnecting: boolean;
  lastError: string | null;
  updateSettings: (newSettings: Partial<PrinterSettings>) => void;
  connectPrinter: () => Promise<boolean>;
  disconnectPrinter: () => Promise<void>;
  testPrint: () => Promise<boolean>;
  clearError: () => void;
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_PRINTER_SETTINGS,
      isConnected: false,
      isConnecting: false,
      lastError: null,

      updateSettings: (newSettings: Partial<PrinterSettings>) => {
        const updatedSettings = { ...get().settings, ...newSettings };
        set({ settings: updatedSettings });
        
        // Update printer instance settings
        const printer = getPrinterInstance(updatedSettings);
        console.log('Printer settings updated:', updatedSettings);
      },

      connectPrinter: async () => {
        set({ isConnecting: true, lastError: null });
        try {
          const { connectPrinter } = await import('../lib/printer');
          const result = await connectPrinter(get().settings);
          set({ 
            isConnected: result.success, 
            isConnecting: false,
            lastError: result.error || null
          });
          
          if (!result.success) {
            console.error('Failed to connect to USB printer:', result.error);
          }
          
          return result.success;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
          set({ 
            isConnected: false, 
            isConnecting: false, 
            lastError: errorMessage 
          });
          return false;
        }
      },

      disconnectPrinter: async () => {
        try {
          const printer = getPrinterInstance();
          await printer.disconnect();
          set({ isConnected: false, lastError: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown disconnection error';
          set({ lastError: errorMessage });
        }
      },

      testPrint: async () => {
        set({ lastError: null });
        try {
          const printer = getPrinterInstance(get().settings);
          const success = await printer.testPrint();
          
          if (!success) {
            set({ lastError: 'Test print failed' });
          }
          
          return success;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Test print error';
          set({ lastError: errorMessage });
          return false;
        }
      },

      clearError: () => {
        set({ lastError: null });
      },
    }),
    {
      name: 'printer-settings',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);