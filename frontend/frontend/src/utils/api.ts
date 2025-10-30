/**
 * API client for ShopShadow backend
 * Handles authentication and device management endpoints
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

// ============================================================================
// Type Definitions
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: User;
}

export interface Device {
  id: string;
  name: string | null;
  status: 'connected' | 'disconnected' | 'offline';
  batteryLevel: number;
  firmwareVersion: string | null;
  lastHeartbeat: string | null;
  itemCount?: number;
}

export interface DeviceConnectResponse {
  success: boolean;
  data: {
    device: Device;
  };
}

export interface DeviceStatusResponse {
  success: boolean;
  data: {
    device: Device;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get authentication headers for API requests
 */
function getAuthHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Handle API errors and extract error message
 */
function handleApiError(error: any): string {
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

// ============================================================================
// Auth API Functions
// ============================================================================

/**
 * Login user with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data;
}

/**
 * Sign up new user
 */
export async function signup(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Signup failed');
  }

  return data;
}

/**
 * Logout user
 */
export async function logout(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Logout failed');
  }
}

// ============================================================================
// Device API Functions
// ============================================================================

/**
 * Connect user to device using 4-digit pairing code
 *
 * @param code - 4-digit code displayed on device
 * @param token - JWT authentication token
 * @returns Connected device details
 * @throws Error if code is invalid, expired, or device already connected
 */
export async function connectDevice(code: string, token: string): Promise<Device> {
  const response = await fetch(`${API_BASE}/api/devices/connect`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect device');
  }

  const data: DeviceConnectResponse = await response.json();
  return data.data.device;
}

/**
 * Get device status and update heartbeat
 *
 * @param deviceId - UUID of the device
 * @param token - JWT authentication token
 * @returns Device status including connection state and battery level
 * @throws Error if device not found or user unauthorized
 */
export async function getDeviceStatus(deviceId: string, token: string): Promise<Device | null> {
  const response = await fetch(`${API_BASE}/api/devices/${deviceId}/status`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    // Return null if device not found or error (don't throw to allow graceful handling)
    return null;
  }

  const data: DeviceStatusResponse = await response.json();
  return data.data.device;
}

/**
 * Disconnect user from device and clear basket
 *
 * @param deviceId - UUID of the device to disconnect
 * @param token - JWT authentication token
 * @throws Error if device not found or user unauthorized
 */
export async function disconnectDevice(deviceId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/devices/disconnect`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect device');
  }
}

// ============================================================================
// LocalStorage Helpers
// ============================================================================

const AUTH_TOKEN_KEY = 'shopshadow_auth_token';
const REFRESH_TOKEN_KEY = 'shopshadow_refresh_token';
const USER_KEY = 'shopshadow_user';
const DEVICE_KEY = 'shopshadow_device';

/**
 * Store auth tokens and user in localStorage
 */
export function storeAuthData(token: string, refreshToken: string, user: User): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get user from localStorage
 */
export function getUser(): User | null {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

/**
 * Clear all auth data from localStorage
 */
export function clearAuthData(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(DEVICE_KEY);
}

/**
 * Store device in localStorage
 */
export function storeDevice(device: Device): void {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
}

/**
 * Get device from localStorage
 */
export function getStoredDevice(): Device | null {
  const deviceJson = localStorage.getItem(DEVICE_KEY);
  if (!deviceJson) return null;
  try {
    return JSON.parse(deviceJson);
  } catch {
    return null;
  }
}

/**
 * Clear device from localStorage
 */
export function clearDevice(): void {
  localStorage.removeItem(DEVICE_KEY);
}

// ============================================================================
// Basket API Functions
// ============================================================================

/**
 * BasketItem represents a single item in the user's shopping basket
 */
export interface BasketItem {
  id: string;              // Unique basket item ID
  productId: string;       // Product identifier
  name: string;            // Product name
  price: number;           // Price per unit
  category: string;        // Product category
  imageUrl: string;        // Product image URL
  quantity: number;        // Number of units
  confidence: number | null; // ML detection confidence (0-1), null if manually added
  subtotal: number;        // Total cost for this item (price * quantity)
  addedAt: string;         // ISO timestamp when added to basket
  deviceId: string;        // Device that detected this item
}

/**
 * BasketResponse represents the complete basket state from the backend
 */
export interface BasketResponse {
  success: boolean;
  data: {
    items: BasketItem[];   // Array of basket items
    total: number;         // Total cost of all items
    itemCount: number;     // Total number of items (sum of quantities)
  };
}

/**
 * Fetch the user's basket from the backend
 *
 * @param userId - The user's unique identifier
 * @param token - JWT authentication token
 * @returns Promise resolving to basket data
 * @throws Error if the request fails
 *
 * @example
 * ```typescript
 * const basket = await fetchBasket('user-123', 'jwt-token');
 * console.log(`Total: $${basket.data.total}`);
 * ```
 */
export async function fetchBasket(userId: string, token: string): Promise<BasketResponse> {
  const response = await fetch(`${API_BASE}/api/basket/${userId}`, {
    method: 'GET',
    headers: getAuthHeaders(token)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch basket: ${response.status}`);
  }

  return response.json();
}

/**
 * Remove an item from the basket
 *
 * @param itemId - The basket item ID to remove
 * @param token - JWT authentication token
 * @returns Promise resolving when item is removed
 * @throws Error if the request fails
 *
 * @example
 * ```typescript
 * await removeBasketItem('item-123', 'jwt-token');
 * ```
 */
export async function removeBasketItem(itemId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/basket/items/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to remove item: ${response.status}`);
  }
}

// ============================================================================
// Admin Analytics API Functions
// ============================================================================

export interface DetectionTimelinePoint {
  hour: string;
  count: number;
}

export interface DeviceActivityEntry {
  deviceId: string;
  deviceName: string | null;
  deviceCode: string | null;
  lastHeartbeat: string | null;
  detectionCount: number;
  status: 'active' | 'inactive' | 'pending';
}

export interface DetectionStats {
  totalDetections: number;
  highConfidence: number;
  lowConfidence: number;
  pendingApprovals: number;
  approvalRate: number;
  avgConfidence: number;
  detectionsToday: number;
  detectionsByHour: DetectionTimelinePoint[];
  deviceActivity: DeviceActivityEntry[];
}

export interface AdminPendingItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  deviceId: string | null;
  deviceName: string | null;
  deviceCode: string | null;
  productId: string | null;
  productName: string | null;
  quantity: number;
  confidence: number;
  status: string;
  timestamp: string;
  deviceLastHeartbeat: string | null;
}

export interface PendingItemsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PendingItemsQueryParams {
  status?: string;
  minConfidence?: number;
  maxConfidence?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'confidence' | 'quantity';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PendingItemsResponse {
  pendingItems: AdminPendingItem[];
  pagination: PendingItemsPagination;
}

/**
 * Fetch detection statistics for admin dashboard
 */
export async function getDetectionStats(token: string): Promise<DetectionStats> {
  try {
    const response = await fetch(`${API_BASE}/api/admin/detection-stats`, {
      method: 'GET',
      headers: getAuthHeaders(token)
    });

    const data = await response.json().catch(() => ({ stats: {} }));

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch detection stats');
    }

    const stats = data.stats ?? {};
    const rawTimeline = Array.isArray(stats.detectionsByHour) ? stats.detectionsByHour : [];
    const rawDevices = Array.isArray(stats.deviceActivity) ? stats.deviceActivity : [];

    return {
      totalDetections: Number(stats.totalDetections ?? 0),
      highConfidence: Number(stats.highConfidence ?? 0),
      lowConfidence: Number(stats.lowConfidence ?? 0),
      pendingApprovals: Number(stats.pendingApprovals ?? 0),
      approvalRate: Number(stats.approvalRate ?? 0),
      avgConfidence: Number(stats.avgConfidence ?? 0),
      detectionsToday: Number(stats.detectionsToday ?? stats.totalDetections ?? 0),
      detectionsByHour: rawTimeline.map((point: any) => ({
        hour: point.hour?.toString().padStart(2, '0') ?? '00',
        count: Number(point.count ?? 0)
      })),
      deviceActivity: rawDevices.map((device: any) => ({
        deviceId: device.device_id ?? device.deviceId ?? '',
        deviceName: device.device_name ?? device.deviceName ?? null,
        deviceCode: device.device_code ?? device.deviceCode ?? null,
        lastHeartbeat: device.last_heartbeat ?? device.lastHeartbeat ?? null,
        detectionCount: Number(device.detection_count ?? device.detectionCount ?? 0),
        status: device.status ?? 'pending'
      }))
    };
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}

/**
 * Fetch pending items queue for admin dashboard
 */
export async function getAdminPendingItems(
  token: string,
  params: PendingItemsQueryParams = {}
): Promise<PendingItemsResponse> {
  try {
    const searchParams = new URLSearchParams();
    const knownParams: Record<string, string | number | undefined> = {
      status: params.status ?? 'pending',
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search
    };

    if (params.minConfidence !== undefined) {
      knownParams.minConfidence = params.minConfidence;
    }
    if (params.maxConfidence !== undefined) {
      knownParams.maxConfidence = params.maxConfidence;
    }

    Object.entries(knownParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const url = queryString
      ? `${API_BASE}/api/admin/pending-items?${queryString}`
      : `${API_BASE}/api/admin/pending-items`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(token)
    });

    const data = await response.json().catch(() => ({ pendingItems: [], pagination: {} }));

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch pending items');
    }

    const pendingItems = Array.isArray(data.pendingItems) ? data.pendingItems : [];
    const pagination = data.pagination ?? {};

    return {
      pendingItems: pendingItems.map((item: any) => ({
        id: item.id,
        userId: item.userId ?? null,
        userEmail: item.userEmail ?? null,
        userName: item.userName ?? null,
        deviceId: item.deviceId ?? null,
        deviceName: item.deviceName ?? null,
        deviceCode: item.deviceCode ?? null,
        productId: item.productId ?? null,
        productName: item.productName ?? item.name ?? null,
        quantity: Number(item.quantity ?? 0),
        confidence: Number(item.confidence ?? 0),
        status: item.status ?? 'pending',
        timestamp: item.timestamp,
        deviceLastHeartbeat: item.deviceLastHeartbeat ?? null
      })),
      pagination: {
        page: Number(pagination.page ?? 1),
        limit: Number(pagination.limit ?? (params.limit ?? 50)),
        total: Number(pagination.total ?? pendingItems.length),
        totalPages: Number(pagination.totalPages ?? 1)
      }
    };
  } catch (error) {
    throw new Error(handleApiError(error));
  }
}
