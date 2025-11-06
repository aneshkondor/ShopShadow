import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { ConnectionStatus } from './ConnectionStatus';
import { PendingItemsCard, type PendingItem } from './PendingItemsCard';
import { EmptyState } from './EmptyState';
import { ShoppingBasket, LogOut, Trash2, History, Tag, Unplug, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import {
  fetchBasket,
  removeBasketItem,
  fetchPendingItems,
  approvePendingItem,
  declinePendingItem,
  type BasketItem as APIBasketItem,
  getAuthToken,
  getDeviceStatus,
  disconnectDevice,
  clearDevice,
  type Device
} from '../utils/api';

interface BasketItem {
  id: string;
  name: string;
  quantity: number;
  price: number; // Price per unit
}

interface DashboardProps {
  onLogout: () => void;
  onCheckout: (items: BasketItem[], total: number) => void;
  onViewOrders: () => void;
  onViewProducts: () => void;
  onNavigateToConnection?: () => void;
  isDemo?: boolean;
  authToken: string | null;
  userId: string | null;
  connectedDevice: Device | null;
}

export function Dashboard({ onLogout, onCheckout, onViewOrders, onViewProducts, onNavigateToConnection, isDemo = false, authToken, userId, connectedDevice }: DashboardProps) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [device, setDevice] = useState<Device | null>(connectedDevice);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingBasket, setIsLoadingBasket] = useState(true);
  const [basketTotal, setBasketTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(true);

  // Fallback for demo mode
  const effectiveAuthToken = authToken || 'demo-token';
  const effectiveUserId = userId || 'demo-user-id';

  // AbortController ref to cancel previous fetch when new one starts
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingAbortControllerRef = useRef<AbortController | null>(null);

  // Mounted ref and interval tracking for cleanup
  const mountedRef = useRef(true);
  const pollIntervalsRef = useRef<{
    basket?: NodeJS.Timeout;
    pending?: NodeJS.Timeout;
    device?: NodeJS.Timeout;
  }>({});

  const mapApiBasketItems = (apiItems: APIBasketItem[]): BasketItem[] =>
    apiItems.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }));

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Cancel all intervals on unmount
      Object.values(pollIntervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  // Poll device status
  useEffect(() => {
    if (isDemo) {
      setIsConnected(true);
      return;
    }

    if (!device?.id || !effectiveAuthToken) {
      setIsConnected(false);
      return;
    }

    const checkDeviceStatus = async () => {
      if (!mountedRef.current) return; // Guard

      try {
        const deviceData = await getDeviceStatus(device.id, effectiveAuthToken);

        if (mountedRef.current) { // Guard state update
          setDevice(deviceData);

          if (!deviceData) {
            setIsConnected(false);
            return;
          }

          const lastHeartbeat = new Date(deviceData.lastHeartbeat || 0).getTime();
          const secondsSinceHeartbeat = (Date.now() - lastHeartbeat) / 1000;

          setIsConnected(
            deviceData.status === 'connected' && secondsSinceHeartbeat < 60
          );
        }
      } catch (error) {
        console.error('Failed to check device status:', error);
        if (mountedRef.current) {
          setIsConnected(false);
        }
      }
    };

    checkDeviceStatus();
    const interval = setInterval(checkDeviceStatus, 10000);
    pollIntervalsRef.current.device = interval; // Store reference

    return () => {
      if (pollIntervalsRef.current.device) {
        clearInterval(pollIntervalsRef.current.device);
      }
    };
  }, [device?.id, effectiveAuthToken, isDemo]);

  // Polling logic: Fetch basket every 5 seconds
  useEffect(() => {
    if (!effectiveUserId || !effectiveAuthToken) {
      console.warn('No user ID or auth token available');
      setIsLoadingBasket(false);
      return;
    }

    let isMounted = true;

    const fetchBasketData = async () => {
      // Cancel previous fetch if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this fetch
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const basketResponse = await fetchBasket(effectiveUserId, effectiveAuthToken);

        // Only update state if component is still mounted and fetch wasn't aborted
        if (isMounted && !abortController.signal.aborted) {
          // Convert API basket items to component basket items
          const rawItems = Array.isArray(basketResponse.data.items) ? basketResponse.data.items : [];
          const nextItems = mapApiBasketItems(rawItems);
          const nextItemCount = rawItems.reduce((sum, entry) => sum + entry.quantity, 0);

          setItems(nextItems);
          setBasketTotal(Number(basketResponse.data.total ?? 0));
          setItemCount(nextItemCount);
          setIsLoadingBasket(false);
          setPollingError(null);
        }
      } catch (error: any) {
        // Only show error on initial load, not on polling failures
        if (isMounted && !abortController.signal.aborted) {
          console.error('Failed to fetch basket:', error);
          setPollingError(error.message);

          // Only show toast on initial load failure
          if (isLoadingBasket) {
            toast.error('Failed to load basket', {
              duration: 3000,
              position: 'bottom-right',
            });
          }
          setIsLoadingBasket(false);
        }
      }
    };

    // Initial fetch
    fetchBasketData();

    // Poll every 5 seconds (matches Flask detection interval)
    const intervalId = setInterval(fetchBasketData, 5000);
    pollIntervalsRef.current.basket = intervalId; // Store reference

    // Cleanup
    return () => {
      isMounted = false;
      if (pollIntervalsRef.current.basket) {
        clearInterval(pollIntervalsRef.current.basket);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [effectiveUserId, effectiveAuthToken, isLoadingBasket]);

  // Poll pending items every 5 seconds
  useEffect(() => {
    if (isDemo) {
      setPendingItems([]);
      setIsLoadingPending(false);
      if (pendingAbortControllerRef.current) {
        pendingAbortControllerRef.current.abort();
      }
      return;
    }

    if (!effectiveUserId || !effectiveAuthToken) {
      setPendingItems([]);
      setIsLoadingPending(false);
      if (pendingAbortControllerRef.current) {
        pendingAbortControllerRef.current.abort();
      }
      return;
    }

    let isMounted = true;

    const loadPendingItems = async (initialLoad = false) => {
      if (pendingAbortControllerRef.current) {
        pendingAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      pendingAbortControllerRef.current = controller;

      if (initialLoad) {
        setIsLoadingPending(true);
      }

      try {
        const pending = await fetchPendingItems(
          effectiveUserId,
          effectiveAuthToken,
          controller.signal
        );

        if (isMounted && !controller.signal.aborted) {
          setPendingItems(pending);
        }
      } catch (error: any) {
        if (controller.signal.aborted || !isMounted) {
          return;
        }
        console.error('Failed to fetch pending items:', error);
        if (initialLoad) {
          toast.error('Failed to load pending approvals', {
            duration: 3000,
            position: 'bottom-right',
          });
        }
      } finally {
        if (isMounted && initialLoad) {
          setIsLoadingPending(false);
        }
      }
    };

    loadPendingItems(true);
    const intervalId = setInterval(() => loadPendingItems(false), 5000);
    pollIntervalsRef.current.pending = intervalId; // Store reference

    return () => {
      isMounted = false;
      if (pollIntervalsRef.current.pending) {
        clearInterval(pollIntervalsRef.current.pending);
      }
      if (pendingAbortControllerRef.current) {
        pendingAbortControllerRef.current.abort();
      }
    };
  }, [effectiveAuthToken, effectiveUserId, isDemo]);

  // Disconnect device
  const handleDisconnect = async () => {
    if (!device || !effectiveAuthToken) return;

    try {
      // CRITICAL: Cancel all polling FIRST
      if (pollIntervalsRef.current.basket) {
        clearInterval(pollIntervalsRef.current.basket);
        pollIntervalsRef.current.basket = undefined;
      }
      if (pollIntervalsRef.current.pending) {
        clearInterval(pollIntervalsRef.current.pending);
        pollIntervalsRef.current.pending = undefined;
      }
      if (pollIntervalsRef.current.device) {
        clearInterval(pollIntervalsRef.current.device);
        pollIntervalsRef.current.device = undefined;
      }

      // Call disconnect API
      await disconnectDevice(device.id, effectiveAuthToken);
      clearDevice();

      // Clear device state ONLY (keep user logged in)
      setDevice(null);
      setIsConnected(false);
      setItems([]); // Clear basket
      setPendingItems([]); // Clear pending

      toast.success('Device disconnected. You can reconnect anytime.', {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          color: '#1e293b',
        },
      });
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect device', {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          color: '#1e293b',
        },
      });
    }
  };

  // Handle item removal via API
  const handleRemoveItem = async (id: string) => {
    try {
      await removeBasketItem(id, effectiveAuthToken);

      // Optimistically update UI
      setItems(items.filter(item => item.id !== id));

      toast.success('Item removed from basket', {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          color: '#1e293b',
        },
      });
    } catch (error: any) {
      console.error('Failed to remove item:', error);
      toast.error('Failed to remove item. Please try again.', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
  };

  const handleApprovePending = async (itemId: string, quantity: number) => {
    if (!authToken) {
      throw new Error('Authentication required to approve items');
    }

    try {
      const response = await approvePendingItem(itemId, quantity, authToken);

      setPendingItems(prev => prev.filter(item => item.id !== itemId));

      if (response?.data) {
        const rawItems = Array.isArray(response.data.items) ? response.data.items : [];
        const nextItems = mapApiBasketItems(rawItems);
        const nextItemCount = rawItems.reduce((sum, entry) => sum + entry.quantity, 0);

        setItems(nextItems);
        setBasketTotal(Number(response.data.total ?? 0));
        setItemCount(nextItemCount);
        setIsLoadingBasket(false);
      }
    } catch (error) {
      console.error('Failed to approve pending item:', error);
      throw error;
    }
  };

  const handleDeclinePending = async (itemId: string) => {
    if (!authToken) {
      throw new Error('Authentication required to decline items');
    }

    try {
      await declinePendingItem(itemId, authToken);
      setPendingItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Failed to decline pending item:', error);
      throw error;
    }
  };

  const totalItems = itemCount;
  const totalCost = basketTotal;

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-4 sm:p-6 pb-4"
      >
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4 sm:mb-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
                <ShoppingBasket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900">Shop Shadow</h1>
                {isDemo && <p className="text-xs text-slate-600">Demo Mode</p>}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <ConnectionStatus
                deviceId={device?.id || null}
                authToken={effectiveAuthToken}
                isDemo={isDemo}
              />
              {!isDemo && device && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="text-slate-600 hover:text-rose-600 transition-colors p-2"
                      title="Disconnect Device"
                      disabled={isDisconnecting}
                    >
                      <Unplug className="w-5 h-5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white/95 backdrop-blur-md">
                    <AlertDialogTitle>Disconnect Device?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your basket items will be cleared, but new detections will stop. You can reconnect anytime.
                    </AlertDialogDescription>
                    <div className="flex gap-2 justify-end mt-4">
                      <AlertDialogCancel className="bg-white/50">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDisconnect}
                        className="bg-rose-500 text-white hover:bg-rose-600"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <button
                onClick={onViewProducts}
                className="text-slate-600 hover:text-slate-800 transition-colors p-2"
                title="Product Catalog"
              >
                <Tag className="w-5 h-5" />
              </button>
              {!isDemo && (
                <button
                  onClick={onViewOrders}
                  className="text-slate-600 hover:text-slate-800 transition-colors p-2"
                  title="Order History"
                >
                  <History className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onLogout}
                className="text-slate-600 hover:text-slate-800 transition-colors p-2"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
            <div className="sm:hidden">
              <ConnectionStatus
                deviceId={device?.id || null}
                authToken={effectiveAuthToken}
                isDemo={isDemo}
              />
            </div>
          </div>
          
          {/* Mobile Navigation Buttons */}
          <div className={`grid ${!isDemo && device ? 'grid-cols-4' : 'grid-cols-3'} gap-2 sm:hidden mt-4 pt-4 border-t border-slate-200/50`}>
            {!isDemo && device && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <GlassButton
                    variant="secondary"
                    className="flex flex-col items-center justify-center py-3 px-2 text-slate-700"
                  >
                    <Unplug className="w-5 h-5 mb-1" />
                    <span className="text-xs">Disconnect</span>
                  </GlassButton>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white/95 backdrop-blur-md">
                  <AlertDialogTitle>Disconnect Device?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your basket items will be cleared, but new detections will stop. You can reconnect anytime.
                  </AlertDialogDescription>
                  <div className="flex gap-2 justify-end mt-4">
                    <AlertDialogCancel className="bg-white/50">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      className="bg-rose-500 text-white hover:bg-rose-600"
                    >
                      Disconnect
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <GlassButton
              variant="secondary"
              onClick={onViewProducts}
              className="flex flex-col items-center justify-center py-3 px-2 text-slate-700"
            >
              <Tag className="w-5 h-5 mb-1" />
              <span className="text-xs">Products</span>
            </GlassButton>
            {!isDemo && (
              <GlassButton
                variant="secondary"
                onClick={onViewOrders}
                className="flex flex-col items-center justify-center py-3 px-2 text-slate-700"
              >
                <History className="w-5 h-5 mb-1" />
                <span className="text-xs">Orders</span>
              </GlassButton>
            )}
            <GlassButton
              variant="secondary"
              onClick={onLogout}
              className="flex flex-col items-center justify-center py-3 px-2 text-slate-700"
            >
              <LogOut className="w-5 h-5 mb-1" />
              <span className="text-xs">Logout</span>
            </GlassButton>
          </div>
        </GlassCard>
      </motion.header>

      {/* Main Content */}
      <main className="px-6">
        <div className="space-y-6">
          {/* No Device Connected Warning */}
          {!isDemo && !isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <GlassCard className="p-6 bg-amber-50 border-amber-200">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-2">
                      No Device Connected
                    </h3>
                    <p className="text-amber-700 text-sm mb-4">
                      Connect a detection device to start shopping. You can browse products and view order history while disconnected.
                    </p>
                    {onNavigateToConnection && (
                      <GlassButton
                        onClick={onNavigateToConnection}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        Connect Device
                      </GlassButton>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {!isDemo && pendingItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PendingItemsCard
                items={pendingItems}
                onApprove={handleApprovePending}
                onDecline={handleDeclinePending}
                isLoading={isLoadingPending}
              />
            </motion.div>
          )}

          {isLoadingBasket ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-slate-200/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-900">Your Basket</h2>
                <span className="text-slate-600">{totalItems} items</span>
              </div>

              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GlassCard hover className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-slate-900 truncate">{item.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-slate-600 text-sm">Qty: {item.quantity}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 text-sm">${item.price.toFixed(2)} each</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                          {/* TODO: Remove in production - items should only update via Raspberry Pi detection */}
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-2"
                            title="Demo only - not available in production"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {/* Bottom Bar with Total and Checkout */}
      {items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 to-transparent"
        >
          <GlassCard className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Total Amount</p>
                  <p className="text-slate-900 text-3xl">${totalCost.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-600 text-sm">Items</p>
                  <p className="text-slate-900 text-2xl">{totalItems}</p>
                </div>
              </div>
              <GlassButton
                variant="primary"
                onClick={() => onCheckout(items, totalCost)}
                disabled={!isDemo && !isConnected}
                className={`w-full text-white py-4 ${!isDemo && !isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {!isDemo && !isConnected ? 'Connect Device to Checkout' : 'Proceed to Checkout'}
              </GlassButton>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
