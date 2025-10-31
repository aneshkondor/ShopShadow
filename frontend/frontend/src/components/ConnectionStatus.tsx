import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getDeviceStatus, type Device } from '../utils/api';

interface ConnectionStatusProps {
  deviceId: string | null;
  authToken: string | null;
  isDemo?: boolean;
}

export function ConnectionStatus({ deviceId, authToken, isDemo = false }: ConnectionStatusProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Demo mode - always show connected
    if (isDemo) {
      setIsConnected(true);
      return;
    }

    // No device or token - show disconnected
    if (!deviceId || !authToken) {
      setIsConnected(false);
      return;
    }

    // Check device status immediately
    const checkDeviceStatus = async () => {
      try {
        const deviceData = await getDeviceStatus(deviceId, authToken);
        setDevice(deviceData);

        if (!deviceData) {
          setIsConnected(false);
          return;
        }

        // Calculate if device is connected based on heartbeat
        const lastHeartbeat = new Date(deviceData.lastHeartbeat || 0).getTime();
        const now = Date.now();
        const secondsSinceHeartbeat = (now - lastHeartbeat) / 1000;

        // Connected if status is 'connected' and heartbeat within 60 seconds
        setIsConnected(
          deviceData.status === 'connected' && secondsSinceHeartbeat < 60
        );
      } catch (error) {
        console.error('Failed to check device status:', error);
        setIsConnected(false);
      }
    };

    // Initial check
    checkDeviceStatus();

    // Poll every 10 seconds
    const interval = setInterval(checkDeviceStatus, 10000);

    return () => clearInterval(interval);
  }, [deviceId, authToken, isDemo]);

  const getStatusColor = () => {
    if (isDemo && isConnected) return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]';

    if (!device) return 'bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.6)]';

    if (!device.lastHeartbeat) {
      return 'bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.6)]';
    }

    const lastHeartbeat = new Date(device.lastHeartbeat).getTime();
    const now = Date.now();
    const secondsSinceHeartbeat = (now - lastHeartbeat) / 1000;

    if (secondsSinceHeartbeat < 60 && device.status === 'connected') {
      return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]';
    }

    if (device.status === 'pending') {
      return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
    }

    return 'bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.6)]';
  };

  const getStatusText = () => {
    if (isDemo && isConnected) return 'Connected (Demo)';

    if (!device) return 'Disconnected';

    if (device.status === 'pending') return 'Pending';

    if (!device.lastHeartbeat) {
      return 'Disconnected';
    }

    const lastHeartbeat = new Date(device.lastHeartbeat).getTime();
    const secondsSinceHeartbeat = (Date.now() - lastHeartbeat) / 1000;

    return secondsSinceHeartbeat < 60 ? 'Connected' : 'Disconnected';
  };

  return (
    <div className="backdrop-blur-[10px] bg-white/40 border border-white/60 rounded-full px-4 py-2 flex items-center gap-2">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`w-2 h-2 rounded-full ${getStatusColor()}`}
      />
      <span className="text-slate-700 text-sm">
        {getStatusText()}
      </span>
    </div>
  );
}
