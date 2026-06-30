import { useState, useEffect, useCallback } from 'react';
import type { RecentEntry } from '../types';

interface RecentHistoryProps {
  recents: RecentEntry[];
  onUseAgain: (entry: RecentEntry) => void;
  onClearAll: () => void;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

function formatAmount(entry: RecentEntry): string {
  if (!entry.amount) return 'Flexible Amount';
  const prefix = entry.addressType === 'crypto' ? '' : '\u20B9';
  return `${prefix}${entry.amount}`;
}

function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  return (
    <div className="history-modal-overlay" onClick={onCancel}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <p className="history-modal-title">Clear Recent History?</p>
        <p className="history-modal-desc">This action cannot be undone.</p>
        <div className="history-modal-actions">
          <button type="button" className="history-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="history-modal-confirm"
            onClick={() => { onConfirm(); onCancel(); }}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecentHistory({ recents, onUseAgain, onClearAll }: RecentHistoryProps) {
  const [, refresh] = useState(0);
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    const id = setInterval(() => refresh((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const handleClearCancel = useCallback(() => setShowClearModal(false), []);

  return (
    <div className="history-section">
      <div className="history-label-row">
        <p className="history-label">Recent History</p>
        {recents.length > 0 && (
          <button type="button" className="history-clear-btn" onClick={() => setShowClearModal(true)}>
            Clear All
          </button>
        )}
      </div>

      {showClearModal && (
        <ConfirmModal onConfirm={onClearAll} onCancel={handleClearCancel} />
      )}

      {recents.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="history-empty-title">No recent payments</p>
          <p className="history-empty-sub">Generated QR payments will appear here.</p>
        </div>
      ) : (
        <div className="history-list">
          {recents.map((entry) => (
            <div
              key={entry.id}
              className="history-item"
              onClick={() => onUseAgain(entry)}
            >
              <div className="history-item-body">
                <span className="history-item-name">{entry.merchantName || 'Payment'}</span>
                <div className="history-item-address">{entry.address}</div>
                <div className="history-item-meta">
                  <span className="history-item-amount">{formatAmount(entry)}</span>
                  <span className="history-item-time">{relativeTime(entry.timestamp)}</span>
                </div>
              </div>
              <button
                type="button"
                className="history-use-btn"
                onClick={(e) => { e.stopPropagation(); onUseAgain(entry); }}
              >
                Use
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
