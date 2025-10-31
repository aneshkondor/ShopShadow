import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { AlertCircle, Plus, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { PendingItem as PendingItemModel } from '../utils/api';

export type PendingItem = PendingItemModel;

export interface PendingItemsCardProps {
  items: PendingItem[];
  onApprove: (itemId: string, quantity: number) => Promise<void>;
  onDecline: (itemId: string) => Promise<void>;
  isLoading?: boolean;
}

type BadgePalette = { bg: string; text: string };

const MIN_QTY = 1;

const getConfidenceBadgeColor = (confidence: number): BadgePalette => {
  if (confidence >= 0.6) return { bg: 'bg-amber-100', text: 'text-amber-700' };
  if (confidence >= 0.5) return { bg: 'bg-orange-100', text: 'text-orange-700' };
  return { bg: 'bg-red-100', text: 'text-red-700' };
};

const formatConfidencePercent = (confidence: number) =>
  Math.round(Math.max(0, Math.min(1, confidence)) * 100);

const getRelativeTime = (timestamp: string) => {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return 'Time unavailable';
  const diff = Math.max(0, Date.now() - parsed.getTime());
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const initializeQuantities = (items: PendingItem[]) =>
  items.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = Math.max(MIN_QTY, Math.round(item.quantity) || MIN_QTY);
    return acc;
  }, {});

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
export function PendingItemsCard({ items, onApprove, onDecline, isLoading = false }: PendingItemsCardProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => initializeQuantities(items));
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setQuantities((prev) => {
      const next = { ...prev }; let mutated = false;
      items.forEach((item) => {
        if (next[item.id] === undefined) { next[item.id] = Math.max(MIN_QTY, Math.round(item.quantity) || MIN_QTY); mutated = true; }
      });
      Object.keys(next).forEach((id) => {
        if (!items.some((item) => item.id === id)) { delete next[id]; mutated = true; }
      });
      return mutated ? next : prev;
    });
  }, [items]);

  const updateQuantity = (itemId: string, delta: number, max: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] ?? MIN_QTY;
      const next = clamp(current + delta, MIN_QTY, max);
      return next === current ? prev : { ...prev, [itemId]: next };
    });
  };

  const handleAction = async (type: 'approve' | 'decline', item: PendingItem) => {
    const percent = formatConfidencePercent(item.confidence);
    const label = `${item.name} (${percent}% confidence)`;
    const quantity = quantities[item.id] ?? Math.max(MIN_QTY, item.quantity);
    setProcessingId(item.id);
    try {
      if (type === 'approve') {
        await onApprove(item.id, quantity);
        toast.success('Item approved and added to basket.', { position: 'bottom-right' });
        setAnnouncement(`Approved ${label} with quantity ${quantity}.`);
      } else {
        await onDecline(item.id);
        toast.success('Item declined and removed from review queue.', { position: 'bottom-right' });
        setAnnouncement(`Declined ${label}.`);
      }
    } catch (error) {
      console.error(`Failed to ${type} pending item`, error);
      toast.error(`Unable to ${type} item. Please try again.`, { position: 'bottom-right' });
      setAnnouncement(`${type === 'approve' ? 'Approval' : 'Decline'} failed for ${label}.`);
    } finally {
      setProcessingId(null);
    }
  };
  return (
    <GlassCard className="p-6 border-amber-200/60 bg-gradient-to-br from-amber-50/70 via-white/30 to-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/90 to-amber-600/70 text-white shadow-lg">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-slate-900">Items Awaiting Approval</h2>
            <p className="text-sm text-slate-600">Review low-confidence detections before checkout.</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-500/20 px-4 py-1 text-sm font-medium text-amber-700" aria-label={`${items.length} pending item${items.length === 1 ? '' : 's'}`}>
          {items.length}
        </span>
      </div>

      <div className="sr-only" aria-live="polite">{announcement}</div>
      <div className="mt-6 space-y-4">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div key="pending-empty" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-200/60 bg-white/50 p-8 text-center" role="status">
              <p className="text-slate-600">All detections confirmed! No items need approval.</p>
            </motion.div>
          ) : (
            items.map((item) => {
              const quantity = quantities[item.id] ?? Math.max(MIN_QTY, item.quantity);
              const max = Math.max(MIN_QTY, item.quantity * 2);
              const { bg, text } = getConfidenceBadgeColor(item.confidence);
              const percent = formatConfidencePercent(item.confidence); const isProcessing = processingId === item.id; const disabled = isLoading || isProcessing;
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
                  <div
                    className="rounded-2xl border border-amber-200/50 bg-white/45 p-5 shadow-inner backdrop-blur-xl"
                    role="group"
                    tabIndex={0}
                    aria-labelledby={`pending-item-${item.id}`}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAction('approve', item);
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        handleAction('decline', item);
                      }
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 id={`pending-item-${item.id}`} className="text-lg font-semibold text-slate-900">{item.name}</h3>
                          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${bg} ${text}`}>
                            <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                            {percent}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">Detected: {item.quantity} • Device #{item.device_id} • {getRelativeTime(item.timestamp)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">Adjust quantity</span>
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-white/60 px-2 py-2 shadow-sm">
                          <button type="button" onClick={() => updateQuantity(item.id, -1, max)} className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/80 text-slate-700 transition hover:bg-white" aria-label={`Decrease quantity for ${item.name}`} disabled={quantity <= MIN_QTY || disabled}>
                            <Minus className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <span className="min-w-[3ch] text-center text-lg font-semibold text-slate-900" aria-live="polite" aria-atomic="true">{quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, 1, max)} className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/80 text-slate-700 transition hover:bg-white" aria-label={`Increase quantity for ${item.name}`} disabled={quantity >= max || disabled}>
                            <Plus className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:items-center">
                      <GlassButton variant="success" onClick={() => handleAction('approve', item)} disabled={disabled} className="flex items-center justify-center gap-2 text-white" aria-label={`Approve ${item.name} with quantity ${quantity}`}>
                        {isProcessing && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}<span>Approve</span>
                      </GlassButton>
                      <GlassButton variant="error" onClick={() => handleAction('decline', item)} disabled={disabled} className="flex items-center justify-center gap-2 text-white" aria-label={`Decline ${item.name}`}>
                        {isProcessing && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}<span>Decline</span>
                      </GlassButton>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
