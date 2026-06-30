import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import type { AddressType, CryptoNetwork, RecentEntry } from './types';
import RecentHistory from './components/RecentHistory';

const STORAGE_KEY = 'qrHistory';
const MAX_RECENTS = 5;

function loadRecents(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as RecentEntry[];
  } catch (_e) { void _e; }
  return [];
}

function persistRecents(entries: RecentEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (_e) { void _e; }
}

const logoSvg = `data:image/svg+xml,%3Csvg viewBox='0 0 100 100' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100' height='100' rx='24' fill='%23091510'/%3E%3Crect x='22' y='22' width='20' height='20' rx='5' stroke='rgba(255,255,255,0.85)' stroke-width='3'/%3E%3Crect x='29' y='29' width='6' height='6' rx='1.5' fill='rgba(255,255,255,0.85)'/%3E%3Crect x='58' y='22' width='20' height='20' rx='5' stroke='rgba(255,255,255,0.85)' stroke-width='3'/%3E%3Crect x='65' y='29' width='6' height='6' rx='1.5' fill='rgba(255,255,255,0.85)'/%3E%3Crect x='22' y='58' width='20' height='20' rx='5' stroke='rgba(255,255,255,0.85)' stroke-width='3'/%3E%3Crect x='29' y='65' width='6' height='6' rx='1.5' fill='rgba(255,255,255,0.85)'/%3E%3Cpath d='M51 32 L31 53 L42 53 L36 71 L59 47 L47 47 Z' fill='%2334d399' stroke='%23091510' stroke-width='5' stroke-linejoin='round'/%3E%3C/svg%3E`;

function App() {
  const [merchantName, setMerchantName] = useState('');
  const [addressType, setAddressType] = useState<AddressType>('upi');
  const [upiId, setUpiId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [isAddressTouched, setIsAddressTouched] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const activePayloadRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  const validateUpiId = (id: string): boolean => {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return upiRegex.test(id);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const detectNetwork = (address: string): CryptoNetwork | null => {
    if (/^(ltc1|LTC1)[a-zA-HJ-NP-Z0-9]{25,87}$/.test(address)) return "ltc";
    if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(address)) return "ltc";
    if (/^T[a-zA-Z0-9]{33}$/.test(address)) return "usdt-trc20";
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return "usdt-erc20";
    return null;
  };

  const validateCryptoAddress = (addr: string): boolean => {
    return detectNetwork(addr) !== null;
  };

  const validateAmount = (amt: string): boolean => {
    if (!amt) return true;
    const amountRegex = /^\d+(\.\d{1,2})?$/;
    return amountRegex.test(amt) && parseFloat(amt) > 0;
  };

  const getFieldLabel = (): string => {
    switch (addressType) {
      case 'upi': return 'UPI ID';
      case 'phone': return 'Phone Number';
      case 'crypto': return 'Wallet Address';
    }
  };

  const getFieldPlaceholder = (): string => {
    switch (addressType) {
      case 'upi': return 'merchant@upi';
      case 'phone': return '9876543210';
      case 'crypto': return 'Enter crypto wallet address';
    }
  };

  const getFieldValue = (): string => {
    switch (addressType) {
      case 'upi': return upiId;
      case 'phone': return phoneNumber;
      case 'crypto': return cryptoAddress;
    }
  };

  const setFieldValue = (value: string) => {
    switch (addressType) {
      case 'upi': setUpiId(value.toLowerCase()); break;
      case 'phone': setPhoneNumber(value.replace(/\D/g, '')); break;
      case 'crypto': setCryptoAddress(value); break;
    }
  };

  const getFieldError = (): string => {
    switch (addressType) {
      case 'upi': return errors.upiId || '';
      case 'phone': return errors.phoneNumber || '';
      case 'crypto': return errors.crypto || '';
    }
  };

  const generateQrData = useCallback((): string | null => {
    const newErrors: Record<string, string> = {};

    let paymentAddress = '';
    if (addressType === 'upi') {
      if (!upiId.trim()) {
        newErrors.upiId = 'UPI ID is required';
      } else if (!validateUpiId(upiId)) {
        newErrors.upiId = 'Invalid UPI ID format';
      } else {
        paymentAddress = upiId;
      }
    } else if (addressType === 'phone') {
      if (!phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!validatePhoneNumber(phoneNumber)) {
        newErrors.phoneNumber = 'Invalid phone number';
      } else {
        paymentAddress = phoneNumber + '@paytm';
      }
    } else {
      if (!cryptoAddress.trim()) {
        newErrors.crypto = 'Wallet address is required';
      } else {
        const detected = detectNetwork(cryptoAddress);
        if (!detected) {
          newErrors.crypto = 'Paste a valid LTC or USDT address';
        } else {
          if (detected === "ltc") paymentAddress = `litecoin:${cryptoAddress}`;
          else if (detected === "usdt-trc20") paymentAddress = cryptoAddress;
          else if (detected === "usdt-erc20") paymentAddress = `ethereum:${cryptoAddress}`;
        }
      }
    }

    if (amount && !validateAmount(amount)) {
      newErrors.amount = 'Invalid amount format';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return null;
    }

    if (addressType === 'upi' || addressType === 'phone') {
      const params = new URLSearchParams();
      params.append('pa', paymentAddress);
      if (merchantName.trim()) params.append('pn', merchantName);
      if (amount) params.append('am', amount);
      if (note) params.append('tn', note);
      params.append('cu', 'INR');
      return `upi://pay?${params.toString()}`;
    }

    let qrData = paymentAddress;
    if (amount && addressType === 'crypto') {
      qrData += `?amount=${amount}`;
    }
    return qrData;
  }, [addressType, upiId, phoneNumber, cryptoAddress, merchantName, amount, note]);

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  const getModeLabel = useCallback((): string => {
    switch (addressType) {
      case 'upi': return 'UPI';
      case 'phone': return 'Phone Pay';
      case 'crypto': {
        const detected = detectNetwork(cryptoAddress);
        switch (detected) {
          case 'ltc': return 'Litecoin';
          case 'usdt-trc20':
          case 'usdt-erc20': return 'USDT';
          default: return 'Crypto';
        }
      }
    }
  }, [addressType, cryptoAddress]);

  const addRecent = useCallback((payload: string) => {
    const currentAddress = addressType === 'upi' ? upiId : addressType === 'phone' ? phoneNumber : cryptoAddress;
    if (!currentAddress.trim() || !payload) return;
    const entry: RecentEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      merchantName: merchantName.trim() || 'Payment',
      address: currentAddress,
      addressType,
      amount,
      note,
      payload,
      timestamp: Date.now(),
    };
    const next = [entry, ...recents.filter((r) => r.address !== currentAddress)].slice(0, MAX_RECENTS);
    setRecents(next);
    persistRecents(next);
  }, [merchantName, addressType, upiId, phoneNumber, cryptoAddress, amount, note, recents]);

  useEffect(() => {
    const data = generateQrData();
    if (data) {
      const encoded = encodeURIComponent(data);
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encoded}&format=png&margin=10`;
      setQrUrl(url);
      activePayloadRef.current = data;
    } else {
      setQrUrl('');
      activePayloadRef.current = null;
    }
  }, [generateQrData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = generateQrData();
      if (data && data !== lastSavedRef.current) {
        lastSavedRef.current = data;
        addRecent(data);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [generateQrData, addRecent]);

  const getQrImgUrl = useCallback((data: string, size = 360) => {
    const encoded = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=png&margin=10`;
  }, []);

  const handleGenerate = () => {
    const data = generateQrData();
    if (!data) return;
    const downloadUrl = getQrImgUrl(data, 512);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = merchantName.trim()
      ? `${addressType.toUpperCase()}-QR-${merchantName.replace(/\s+/g, '-')}.png`
      : `${addressType.toUpperCase()}-QR-Code.png`;
    link.click();
    setSuccess('QR Code downloaded successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDownload = () => {
    const data = activePayloadRef.current || generateQrData();
    if (!data) return;
    const downloadUrl = getQrImgUrl(data, 512);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = merchantName.trim()
      ? `${addressType.toUpperCase()}-QR-${merchantName.replace(/\s+/g, '-')}.png`
      : `${addressType.toUpperCase()}-QR-Code.png`;
    link.click();
    setSuccess('QR Code downloaded successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRecentClick = useCallback((entry: RecentEntry) => {
    setErrors({});
    setAddressType(entry.addressType);
    setMerchantName(entry.merchantName);
    if (entry.addressType === 'upi') setUpiId(entry.address);
    else if (entry.addressType === 'phone') setPhoneNumber(entry.address);
    else setCryptoAddress(entry.address);
    setAmount(entry.amount);
    setNote(entry.note);
    setSuccess('');
  }, []);

  const handleClearRecents = useCallback(() => {
    setRecents([]);
    persistRecents([]);
  }, []);

  const isFormValid = (
    (addressType === 'upi' && validateUpiId(upiId)) ||
    (addressType === 'phone' && validatePhoneNumber(phoneNumber)) ||
    (addressType === 'crypto' && validateCryptoAddress(cryptoAddress))
  ) && (!amount || validateAmount(amount));

  const getSegmentIndex = (): number => {
    if (addressType === 'upi') return 0;
    if (addressType === 'phone') return 1;
    return 2;
  };

  return (
    <div className="page">
      <div className="ambient-bg" />
      
      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center px-4 py-3">
        <header className="text-center mb-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src={logoSvg} alt="QR Vault" className="logo-img" />
            <div className="text-left">
              <h1 className="logo-wordmark">QR Vault</h1>
              <span className="logo-tagline">your payment<span className="period">.</span> one scan<span className="period">.</span></span>
            </div>
          </div>
            
          <p className="header-subtitle mx-auto" style={{ fontSize: '13px', color: 'rgba(140,200,170,0.45)', fontWeight: 400 }}>
            Generate dynamic payments in milliseconds.
          </p>
        </header>

        {success && (
          <div className="max-w-xl mx-auto mb-3 flex-shrink-0">
            <div className="glass-card p-2">
              <p className="success-text">
                <CheckCircle2 size={14} />
                {success}
              </p>
            </div>
          </div>
        )}

        <div className="main-grid flex-1 min-h-0">
          <div className="glass-card p-6 card-content">
            <h2 className="text-[15px] font-semibold mb-5" style={{ color: '#a7f3d0' }}>
              Payment Details
            </h2>

            <div className="card-fields">
              <div className="form-row animate-slide-in">
                <label className="field-label">Merchant / Payee Name</label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Enter merchant name"
                  className="glass-input"
                />
              </div>

              <div className="form-row animate-slide-in" style={{ animationDelay: '0.03s' }}>
                <label className="field-label">Payment Address Type</label>
                <div className="segment-container">
                  <div 
                    className="segment-indicator" 
                    data-active={getSegmentIndex()}
                  />
                  <button
                    type="button"
                    className={`segment-btn ${addressType === 'upi' ? 'active' : ''}`}
                    onClick={() => setAddressType('upi')}
                  >
                    ◈ UPI ID
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${addressType === 'phone' ? 'active' : ''}`}
                    onClick={() => setAddressType('phone')}
                  >
                    ◎ Phone
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${addressType === 'crypto' ? 'active' : ''}`}
                    onClick={() => setAddressType('crypto')}
                  >
                    ◆ Crypto
                  </button>
                </div>
              </div>


              <div className="form-row animate-slide-in" style={{ animationDelay: '0.09s' }}>
                <label className="field-label">
                  {getFieldLabel()}<span className="required">*</span>
                </label>
                <div className="relative">
                  <input
                    type={addressType === 'phone' ? 'tel' : 'text'}
                    value={getFieldValue()}
                    onChange={(e) => setFieldValue(e.target.value)}
                    placeholder={getFieldPlaceholder()}
                    maxLength={addressType === 'phone' ? 10 : undefined}
                    className={`glass-input ${addressType === 'crypto' ? 'mono' : ''} pr-8`}
                    style={getFieldError() || (addressType === 'crypto' && isAddressTouched && cryptoAddress && !detectNetwork(cryptoAddress)) ? { borderColor: '#f87171' } : {}}
                    onBlur={() => addressType === 'crypto' && setIsAddressTouched(true)}
                    onFocus={() => addressType === 'crypto' && setIsAddressTouched(false)}
                  />
                  {getFieldValue() && (
                    <button
                      type="button"
                      onClick={() => setFieldValue('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors"
                      style={{ color: 'rgba(180, 230, 200, 0.4)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(180, 230, 200, 0.8)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(180, 230, 200, 0.4)'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {addressType === 'crypto' && detectNetwork(cryptoAddress) && (
                  <div className="mt-2 flex">
                    <span 
                      className="flex items-center gap-1.5"
                      style={{ 
                        background: 'rgba(52,211,153,0.08)', 
                        border: '1px solid rgba(52,211,153,0.15)', 
                        borderRadius: '100px', 
                        padding: '3px 10px', 
                        fontSize: '11px', 
                        color: '#6ee7b7' 
                      }}
                    >
                      ✦ {detectNetwork(cryptoAddress) === 'ltc' ? 'Litecoin (LTC)' : 'USDT'} detected
                    </span>
                  </div>
                )}

                {addressType === 'crypto' && isAddressTouched && cryptoAddress && !detectNetwork(cryptoAddress) && (
                  <p className="error-text">
                    <AlertCircle size={11} />
                    ⊗ Address format not recognized
                  </p>
                )}

                {getFieldError() && (
                  <p className="error-text">
                    <AlertCircle size={11} />
                    {getFieldError()}
                  </p>
                )}
                {addressType === 'upi' && !errors.upiId && (
                  <p className="hint">Example: yourname@paytm, 1234567890@ybl</p>
                )}
                {addressType === 'phone' && !errors.phoneNumber && (
                  <p className="hint">10-digit Indian mobile number</p>
                )}
              </div>

              <div className="form-row animate-slide-in" style={{ animationDelay: '0.12s' }}>
                <label className="field-label">
                  Amount {addressType !== 'crypto' ? '(₹)' : ''}
                </label>
                <div className="relative">
                  {addressType !== 'crypto' && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13.5px]" style={{ color: 'rgba(180, 230, 200, 0.5)' }}>₹</span>
                  )}
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`glass-input ${addressType !== 'crypto' ? 'pl-8' : ''}`}
                    style={errors.amount ? { borderColor: '#f87171' } : {}}
                  />
                </div>
                {errors.amount && (
                  <p className="error-text">
                    <AlertCircle size={11} />
                    {errors.amount}
                  </p>
                )}
                {!errors.amount && (
                  <p className="hint">Leave empty for flexible amount</p>
                )}
              </div>

              <div className="form-row animate-slide-in" style={{ animationDelay: '0.15s' }}>
                <label className="field-label">Description / Notes</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payment for services"
                  className="notes-input"
                />
              </div>
            </div>

            <div className="card-footer">
                <button
                  onClick={handleGenerate}
                  disabled={!isFormValid}
                  className="btn-generate"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Download size={16} />
                    Generate & Download QR
                  </span>
                </button>
            </div>
          </div>

          <div className="glass-card p-6 card-content">
            <h2 className="text-[15px] font-semibold mb-5" style={{ color: '#a7f3d0' }}>
              QR Preview
            </h2>

            <div className="flex flex-col flex-1 min-h-[200px]">
              {qrUrl ? (
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="qr-container mb-4">
                    <img src={qrUrl} alt="QR Code" />
                  </div>
                    
                  <div className="mode-badge mb-3">
                    {getModeLabel()}
                  </div>

                  {amount && (
                    <p className="text-2xl font-bold mb-1" style={{ color: '#34d399' }}>
                      ₹{amount}
                    </p>
                  )}

                  {merchantName && (
                    <p className="text-sm mb-3" style={{ color: 'rgba(180, 230, 200, 0.7)' }}>
                      {merchantName}
                    </p>
                  )}

                  <div className="flex justify-center">
                    <button onClick={handleDownload} className="btn-download">
                      <Download size={13} />
                      Download PNG
                    </button>
                  </div>

                  <RecentHistory recents={recents} onUseAgain={handleRecentClick} onClearAll={handleClearRecents} />

                  <div className="flex justify-center gap-3 mt-4">
                    <span className="trust-badge">
                      <Zap size={10} style={{ color: 'rgba(52, 211, 153, 0.6)' }} />
                      Instant QR
                    </span>
                    <span className="trust-badge">
                      No data stored
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col flex-1">
                  <div className="flex flex-col items-center justify-center pt-6 pb-2">
                    <div style={{ position: 'relative', width: '84px', height: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <span className="pulse-ring"></span>
                      <span className="pulse-ring pulse-ring--delay"></span>
                      <div className="pulse-center">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <rect x="7" y="7" width="3" height="3" />
                          <rect x="14" y="7" width="3" height="3" />
                          <rect x="7" y="14" width="3" height="3" />
                          <rect x="14" y="14" width="3" height="3" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(180, 230, 200, 0.5)' }}>
                      Fill in the details to generate
                    </p>
                  </div>

                  <RecentHistory recents={recents} onUseAgain={handleRecentClick} onClearAll={handleClearRecents} />

                  <div className="flex justify-center gap-3 mt-auto pt-4">
                    <span className="trust-badge">
                      <Zap size={10} style={{ color: 'rgba(52, 211, 153, 0.6)' }} />
                      Instant QR
                    </span>
                    <span className="trust-badge">
                      No data stored
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="site-footer">
          <div className="footer-row-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(52, 211, 153, 0.4)' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>No payments stored or processed</span>
            <span className="footer-dot">·</span>
            <span>QR codes are generated locally</span>
          </div>

          <div className="footer-row-2">
            <span>Supports GPay · PhonePe · BHIM · Paytm · Litecoin · USDT</span>
            <span className="footer-dot">·</span>
            <span>Designed by <a href="https://t.me/obeiwn27" target="_blank" rel="noopener noreferrer" className="footer-credit-link">Manas Kale</a></span>
            <span className="footer-dot">·</span>
            <span>© 2026</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
