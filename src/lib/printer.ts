import { Receipt } from '../types/pos';

export interface PrinterSettings {
  enabled: boolean;
  autoprint: boolean;
  printerName: string;
  paperWidth: number;
  fontSize: number;
  lineSpacing: number;
  cutPaper: boolean;
  openDrawer: boolean;
  copies: number;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  enabled: true,
  autoprint: true,
  printerName: 'RONGTA 80mm Series Printer',
  paperWidth: 80,
  fontSize: 12,
  lineSpacing: 1.2,
  cutPaper: true,
  openDrawer: false,
  copies: 1,
};

// ESC/POS Commands for RONGTA Printer
const ESC = '\x1B';
const GS = '\x1D';

export const PRINTER_COMMANDS = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  FONT_SIZE_NORMAL: GS + '!' + '\x00',
  FONT_SIZE_DOUBLE_HEIGHT: GS + '!' + '\x01',
  FONT_SIZE_DOUBLE_WIDTH: GS + '!' + '\x10',
  FONT_SIZE_DOUBLE: GS + '!' + '\x11',
  LINE_FEED: '\n',
  CUT_PAPER: GS + 'V' + '\x41' + '\x00',
  OPEN_DRAWER: ESC + 'p' + '\x00' + '\x19' + '\xFA',
  BEEP: ESC + 'B' + '\x04' + '\x01',
};

class USBPrinter {
  private device: USBDevice | null = null;
  private settings: PrinterSettings = DEFAULT_PRINTER_SETTINGS;
  private isConnecting: boolean = false;

  constructor(settings?: Partial<PrinterSettings>) {
    if (settings) {
      this.settings = { ...DEFAULT_PRINTER_SETTINGS, ...settings };
    }
  }

  async connect(): Promise<boolean> {
    if (this.isConnecting) {
      console.log('Connection already in progress');
      return false;
    }

    this.isConnecting = true;

    try {
      if (!navigator.usb) {
        console.error('WebUSB not supported in this browser');
        this.isConnecting = false;
        return false;
      }

      if (!window.isSecureContext) {
        console.error('WebUSB requires a secure context (HTTPS or localhost)');
        this.isConnecting = false;
        return false;
      }

      console.log('Checking for previously permitted devices...');
      const devices = await navigator.usb.getDevices();
      const permittedDevice = devices.find(
        (d) =>
          (d.vendorId === 0x0fe6 && d.productId === 0x811e) ||
          d.vendorId === 0x04b8 ||
          d.vendorId === 0x0483 ||
          d.vendorId === 0x1fc9 ||
          d.vendorId === 0x1a86 ||
          d.vendorId === 0x067b ||
          d.vendorId === 0x0525 ||
          d.vendorId === 0x1209 ||
          (d.vendorId === 0x0471 && d.productId === 0x0055)
      );

      if (permittedDevice) {
        console.log('Found previously permitted device:', {
          productName: permittedDevice.productName,
          vendorId: permittedDevice.vendorId,
          productId: permittedDevice.productId,
        });
        this.device = permittedDevice;
      } else {
        console.log('Requesting USB device access...');
        const filters = [
          { vendorId: 0x0fe6, productId: 0x811e },
          { vendorId: 0x04b8 },
          { vendorId: 0x0483 },
          { vendorId: 0x1fc9 },
          { vendorId: 0x1a86 },
          { vendorId: 0x067b },
          { vendorId: 0x0525 },
          { vendorId: 0x1209 },
          { vendorId: 0x0471, productId: 0x0055 },
        ];

        this.device = await navigator.usb.requestDevice({ filters });
      }

      if (!this.device) {
        console.error('No USB printer device selected');
        this.isConnecting = false;
        return false;
      }

      console.log('USB device selected:', {
        productName: this.device.productName,
        manufacturerName: this.device.manufacturerName,
        vendorId: this.device.vendorId,
        productId: this.device.productId,
      });

      if (!this.device.opened) {
        console.log('Opening USB device...');
        await this.device.open();
      }

      if (this.device.configuration === null) {
        console.log('Selecting USB configuration...');
        await this.device.selectConfiguration(1);
      }

      const interfaces = this.device.configuration?.interfaces || [];
      if (interfaces.length === 0) {
        throw new Error('No interfaces found on the device');
      }

      let interfaceClaimed = false;
      for (let i = 0; i < interfaces.length; i++) {
        try {
          console.log(`Attempting to claim interface ${i}...`);
          await this.device.claimInterface(i);
          interfaceClaimed = true;
          console.log(`Successfully claimed interface ${i}`);
          break;
        } catch (error) {
          console.log(`Failed to claim interface ${i}:`, error);
          continue;
        }
      }

      if (!interfaceClaimed) {
        throw new Error('Failed to claim any interface');
      }

      console.log('USB printer connected successfully:', this.device.productName || 'Unknown Device');
      this.isConnecting = false;
      return true;

    } catch (error) {
      console.error('Failed to connect to USB printer:', error);
      this.isConnecting = false;

      if (error instanceof Error) {
        if (error.name === 'SecurityError') {
          console.error('Security Error: Ensure HTTPS or localhost and printer is not in use');
        } else if (error.name === 'NotFoundError') {
          console.error('Device not found: Ensure printer is connected and powered on');
        } else if (error.name === 'NotSupportedError') {
          console.error('Not supported: Browser or device does not support WebUSB');
        }
      }
      
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.device && this.device.opened) {
        const interfaces = this.device.configuration?.interfaces || [];
        for (let i = 0; i < interfaces.length; i++) {
          try {
            await this.device.releaseInterface(i);
          } catch {
            // Ignore errors for unclaimed interfaces
          }
        }
        await this.device.close();
        console.log('USB printer disconnected');
      }
      this.device = null;
    } catch (error) {
      console.error('Error disconnecting USB printer:', error);
    }
  }

  private async sendData(data: string | Uint8Array): Promise<boolean> {
    try {
      if (!this.device || !this.device.opened) {
        console.error('Printer not connected or device not opened');
        return false;
      }

      const encoder = new TextEncoder();
      const dataToSend = typeof data === 'string' ? encoder.encode(data) : data;

      const interfaces = this.device.configuration?.interfaces || [];
      let endpoint = null;

      for (const iface of interfaces) {
        for (const alternate of iface.alternates) {
          for (const ep of alternate.endpoints) {
            if (ep.direction === 'out' && ep.type === 'bulk') {
              endpoint = ep;
              break;
            }
          }
          if (endpoint) break;
        }
        if (endpoint) break;
      }

      if (!endpoint) {
        for (const iface of interfaces) {
          for (const alternate of iface.alternates) {
            for (const ep of alternate.endpoints) {
              if (ep.direction === 'out') {
                endpoint = ep;
                break;
              }
            }
            if (endpoint) break;
          }
          if (endpoint) break;
        }
      }

      if (!endpoint) {
        console.error('No suitable OUT endpoint found');
        return false;
      }

      console.log('Sending data to endpoint:', endpoint.endpointNumber);
      await this.device.transferOut(endpoint.endpointNumber, dataToSend);
      return true;

    } catch (error) {
      console.error('Error sending data to printer:', error);
      return false;
    }
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private padText(left: string, right: string, totalWidth: number): string {
    const availableWidth = totalWidth - left.length - right.length;
    return left + ' '.repeat(Math.max(0, availableWidth)) + right;
  }

  private centerText(text: string, totalWidth: number): string {
    const padding = Math.max(0, Math.floor((totalWidth - text.length) / 2));
    return ' '.repeat(padding) + text + ' '.repeat(padding);
  }

 private formatReceiptText(receiptData: any): string {
  const { INIT, ALIGN_CENTER, ALIGN_LEFT, BOLD_ON, BOLD_OFF, FONT_SIZE_DOUBLE, FONT_SIZE_NORMAL, LINE_FEED, CUT_PAPER } = PRINTER_COMMANDS;
  const maxLineWidth = 48; // Increased width for 80mm paper with standard font

  let output = INIT; // Initialize printer

  // Header with business details
  output += ALIGN_CENTER + FONT_SIZE_DOUBLE + BOLD_ON;
  output += this.truncateText(receiptData.business_name || 'RESTAURANT POS', maxLineWidth) + LINE_FEED;
  output += FONT_SIZE_NORMAL + BOLD_OFF;


  if (receiptData.address) {
    output += this.centerText(this.truncateText(receiptData.address, maxLineWidth), maxLineWidth) + LINE_FEED;
  }
  if (receiptData.phone) {
    output += this.centerText(this.truncateText(receiptData.phone, maxLineWidth), maxLineWidth) + LINE_FEED;
  }
  if (receiptData.email) {
    output += this.centerText(this.truncateText(receiptData.email, maxLineWidth), maxLineWidth) + LINE_FEED;
  }
  output += LINE_FEED;
  output += this.centerText('Thank you for your visit!', maxLineWidth) + LINE_FEED;
  output += '='.repeat(maxLineWidth) + LINE_FEED + LINE_FEED;

  // Order details
  output += ALIGN_LEFT;
  output += this.padText(`Order: ${receiptData.order_number || 'N/A'}`, '', maxLineWidth) + LINE_FEED;
  output += this.padText(`Date: ${new Date(receiptData.timestamp || Date.now()).toLocaleString()}`, '', maxLineWidth) + LINE_FEED;
  
  if (receiptData.table) {
    output += this.padText(`Table: ${receiptData.table}`, '', maxLineWidth) + LINE_FEED;
  }
  
  if (receiptData.customer_name) {
    output += this.padText(`Customer: ${receiptData.customer_name}`, '', maxLineWidth) + LINE_FEED;
  }
  
  output += this.padText(`Type: ${receiptData.order_type?.replace('_', ' ') || 'N/A'}`, '', maxLineWidth) + LINE_FEED;
  
  if (receiptData.payment_method) {
    output += this.padText(`Payment: ${receiptData.payment_method.toUpperCase()}`, '', maxLineWidth) + LINE_FEED;
  }
  
  if (receiptData.payment_reference) {
    output += this.padText(`Ref: ${receiptData.payment_reference}`, '', maxLineWidth) + LINE_FEED;
  }
  
  output += LINE_FEED;

  // Items header
  output += BOLD_ON + this.centerText('Items', maxLineWidth) + BOLD_OFF + LINE_FEED;
  output += '='.repeat(maxLineWidth) + LINE_FEED;
  
  if (receiptData.items && receiptData.items.length > 0) {
    receiptData.items.forEach((item: any) => {
      const name = this.truncateText(item.name || 'Unknown Item', 28);
      const qty = item.quantity || 1;
      const totalPrice = item.total_price || 0;
      const priceFormatted = this.formatCurrency(totalPrice);
      output += this.padText(`${qty}x ${name}`, priceFormatted, maxLineWidth) + LINE_FEED;
      
      if (item.special_instructions) {
        output += this.padText(`  Note: ${this.truncateText(item.special_instructions, maxLineWidth - 2)}`, '', maxLineWidth) + LINE_FEED;
      }
    });
  }
  
  output += '='.repeat(maxLineWidth) + LINE_FEED;

  // Totals
  output += this.padText('Subtotal:', this.formatCurrency(receiptData.subtotal || 0), maxLineWidth) + LINE_FEED;
  
  if (receiptData.discount_amount > 0) {
    output += this.padText('Discount:', `-${this.formatCurrency(receiptData.discount_amount)}`, maxLineWidth) + LINE_FEED;
  }
  
  output += this.padText('Tax (Inclusive):', this.formatCurrency(receiptData.tax_amount || 0), maxLineWidth) + LINE_FEED;
  
  if (receiptData.tip_amount > 0) {
    output += this.padText('Tip:', this.formatCurrency(receiptData.tip_amount), maxLineWidth) + LINE_FEED;
  }
  
  output += '-'.repeat(maxLineWidth) + LINE_FEED;
  output += BOLD_ON + FONT_SIZE_NORMAL;
  output += this.padText('TOTAL:', this.formatCurrency(receiptData.total_amount || 0), maxLineWidth) + LINE_FEED;
  output += FONT_SIZE_NORMAL + BOLD_OFF;

  // Payment details for cash
  if (receiptData.payment_method === 'cash') {
    if (receiptData.cash_received > 0) {
      output += this.padText('Cash Received:', this.formatCurrency(receiptData.cash_received), maxLineWidth) + LINE_FEED;
    }
    if (receiptData.change_amount > 0) {
      output += this.padText('Change:', this.formatCurrency(receiptData.change_amount), maxLineWidth) + LINE_FEED;
    }
  }

  output += LINE_FEED;

  // Footer
  output += ALIGN_CENTER;
  output += this.truncateText(receiptData.receipt_footer || 'Thank you for dining with us!', maxLineWidth) + LINE_FEED;
  output += this.truncateText('Please come again soon', maxLineWidth) + LINE_FEED;
  output += '*'.repeat(maxLineWidth) + LINE_FEED;
  output += this.centerText('Powered by RESTAURANT POS', maxLineWidth) + LINE_FEED;
  output += LINE_FEED + LINE_FEED + LINE_FEED;

  if (this.settings.cutPaper) {
    output += CUT_PAPER;
  }

  return output;
}

  private formatShiftReportText(shiftData: any): string {
    const { INIT, ALIGN_CENTER, ALIGN_LEFT, BOLD_ON, BOLD_OFF, LINE_FEED, CUT_PAPER } = PRINTER_COMMANDS;
    const maxLineWidth = 48;

    let output = INIT;

    output += ALIGN_CENTER + BOLD_ON;
    output += this.truncateText(shiftData.business_name || 'RESTAURANT POS', maxLineWidth);
    output += LINE_FEED;
    if (shiftData.address) {
      output += this.truncateText(shiftData.address, maxLineWidth) + LINE_FEED;
    }
    if (shiftData.phone) {
      output += this.truncateText(shiftData.phone, maxLineWidth) + LINE_FEED;
    }
    if (shiftData.email) {
      output += this.truncateText(shiftData.email, maxLineWidth) + LINE_FEED;
    }
    output += 'SHIFT REPORT';
    output += LINE_FEED + LINE_FEED;
    output += BOLD_OFF + ALIGN_LEFT;

    output += this.padText(`Staff: ${shiftData.staff_name || 'N/A'}`, '', maxLineWidth) + LINE_FEED;
    output += this.padText(`ID: ${shiftData.staff_id || 'N/A'}`, '', maxLineWidth) + LINE_FEED;
    output += this.padText(`Role: ${shiftData.role || 'N/A'}`, '', maxLineWidth) + LINE_FEED;
    output += LINE_FEED;

    output += this.padText(`Start: ${new Date(shiftData.shift_start).toLocaleString()}`, '', maxLineWidth) + LINE_FEED;
    output += this.padText(`End: ${new Date(shiftData.shift_end).toLocaleString()}`, '', maxLineWidth) + LINE_FEED;
    output += this.padText(`Duration: ${shiftData.shift_duration || 0} hours`, '', maxLineWidth) + LINE_FEED;
    output += LINE_FEED;

    output += BOLD_ON + 'FINANCIAL SUMMARY' + BOLD_OFF + LINE_FEED;
    output += '-'.repeat(maxLineWidth) + LINE_FEED;
    output += this.padText('Starting Cash:', this.formatCurrency(shiftData.starting_cash || 0), maxLineWidth) + LINE_FEED;
    output += this.padText('Ending Cash:', this.formatCurrency(shiftData.ending_cash || 0), maxLineWidth) + LINE_FEED;
    output += this.padText('Cash Difference:', this.formatCurrency(shiftData.cash_difference || 0), maxLineWidth) + LINE_FEED;
    output += LINE_FEED;

    output += BOLD_ON + 'SALES SUMMARY' + BOLD_OFF + LINE_FEED;
    output += '-'.repeat(maxLineWidth) + LINE_FEED;
    output += this.padText('Total Orders:', `${shiftData.total_orders || 0}`, maxLineWidth) + LINE_FEED;
    output += this.padText('Total Sales:', this.formatCurrency(shiftData.total_sales || 0), maxLineWidth) + LINE_FEED;
    output += this.padText('Total Tips:', this.formatCurrency(shiftData.total_tips || 0), maxLineWidth) + LINE_FEED;
    output += LINE_FEED;

    output += BOLD_ON + 'PAYMENT BREAKDOWN' + BOLD_OFF + LINE_FEED;
    output += '-'.repeat(maxLineWidth) + LINE_FEED;
    output += this.padText('Cash Sales:', this.formatCurrency(shiftData.cash_sales || 0), maxLineWidth) + LINE_FEED;
    output += this.padText('Card Sales:', this.formatCurrency(shiftData.card_sales || 0), maxLineWidth) + LINE_FEED;
    output += this.padText('Mobile Sales:', this.formatCurrency(shiftData.mobile_sales || 0), maxLineWidth) + LINE_FEED;
    output += LINE_FEED;


    output += ALIGN_CENTER;
    output += this.truncateText(shiftData.receipt_footer || 'Thank you for your service!', maxLineWidth);
    output += LINE_FEED + LINE_FEED + LINE_FEED;

    if (this.settings.cutPaper) {
      output += CUT_PAPER;
    }

    return output;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value).replace('UGX', '').trim();
  }

  async printReceipt(receiptData: any): Promise<boolean> {
    try {
      if (!this.settings.enabled) {
        console.log('Printer disabled in settings');
        return false;
      }

      if (!this.device || !this.device.opened) {
        console.log('Printer not connected, attempting to connect...');
        const connected = await this.connect();
        if (!connected) {
          console.error('Failed to connect to printer');
          return false;
        }
      }

      const printData = receiptData.type === 'shift_report' 
        ? this.formatShiftReportText(receiptData)
        : this.formatReceiptText(receiptData);

      for (let i = 0; i < this.settings.copies; i++) {
        const success = await this.sendData(printData);
        if (!success) {
          console.error(`Failed to print copy ${i + 1}`);
          return false;
        }
        
        if (i < this.settings.copies - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (this.settings.openDrawer && receiptData.payment_method === 'cash') {
        await this.sendData(PRINTER_COMMANDS.OPEN_DRAWER);
      }

      console.log('Receipt printed successfully');
      return true;
    } catch (error) {
      console.error('Error printing receipt:', error);
      return false;
    }
  }

  updateSettings(newSettings: Partial<PrinterSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    console.log('Printer settings updated:', this.settings);
  }

  getSettings(): PrinterSettings {
    return { ...this.settings };
  }

  async testPrint(): Promise<boolean> {
    const taxRate = 18;
    const totalPrice = 1000;
    const subtotalExclTax = totalPrice / (1 + taxRate / 100);
    const taxAmount = totalPrice - subtotalExclTax;

    const testData = {
      type: 'test',
      business_name: 'Test Restaurant',
      logo_url: 'https://example.com/logo.png',
      address: '123 Test Street, Kampala',
      phone: '+256 123 456 789',
      order_number: 'TEST-001',
      timestamp: new Date().toISOString(),
      items: [
        { name: 'Test Item', quantity: 1, total_price: totalPrice }
      ],
      subtotal: subtotalExclTax,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalPrice,
      payment_method: 'cash',
      receipt_footer: 'Test Print Successful!'
    };

    return await this.printReceipt(testData);
  }

  isConnected(): boolean {
    return this.device !== null && this.device.opened;
  }
}

let printerInstance: USBPrinter | null = null;

export const getPrinterInstance = (settings?: Partial<PrinterSettings>): USBPrinter => {
  if (!printerInstance) {
    printerInstance = new USBPrinter(settings);
  } else if (settings) {
    printerInstance.updateSettings(settings);
  }
  return printerInstance;
};

export const printReceipt = async (receiptData: any, settings?: Partial<PrinterSettings>): Promise<{ success: boolean; error?: string }> => {
  try {
    const printer = getPrinterInstance(settings);
    const success = await printer.printReceipt(receiptData);
    
    return {
      success,
      error: success ? undefined : 'Failed to print receipt'
    };
  } catch (error) {
    console.error('Print receipt error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown printing error'
    };
  }
};

export const testPrinter = async (settings?: Partial<PrinterSettings>): Promise<{ success: boolean; error?: string }> => {
  try {
    const printer = getPrinterInstance(settings);
    const success = await printer.testPrint();
    
    return {
      success,
      error: success ? undefined : 'Test print failed'
    };
  } catch (error) {
    console.error('Test printer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Test print error'
    };
  }
};

export const connectPrinter = async (settings?: Partial<PrinterSettings>): Promise<{ success: boolean; error?: string }> => {
  try {
    const printer = getPrinterInstance(settings);
    const success = await printer.connect();
    
    return {
      success,
      error: success ? undefined : 'Failed to connect to printer'
    };
  } catch (error) {
    console.error('Connect printer error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection error'
    };
  }
};