# Task 4.5 - Admin Detection Analytics Dashboard

**Agent:** ChatGPT/Codex (GPT-5)
**Model:** GPT-5 or GPT-4o
**Environment:** Cursor or ChatGPT web interface
**Working Directory:** `/Users/aneshkondor/Coding/cursor_projects/ShopShadow`

---

## Your Role

You are implementing **Task 4.5: Admin Detection Analytics Dashboard** for ShopShadow.

This task enhances the admin dashboard with detection analytics, charts, device monitoring, and pending items queue overview across all users.

---

## CRITICAL REQUIREMENTS

1. ✅ **Follow specifications** in `PHASE_4_TASK_ASSIGNMENTS.md` (lines 880-1080)
2. ✅ **Create comprehensive memory log** (200+ lines)
3. ✅ **Use recharts library** (already in package.json)
4. ✅ **Commit locally** (DO NOT PUSH)

---

## Context Files to Read FIRST

1. **Task Assignment:**
   - `PHASE_4_TASK_ASSIGNMENTS.md` (lines 880-1080)

2. **Existing Admin Components:**
   - `frontend/frontend/src/components/admin/AdminOverview.tsx` (where to add analytics)
   - `frontend/frontend/src/components/admin/AdminOrders.tsx` (table pattern reference)

3. **Backend API:**
   - Phase 2 Task 2.8 (admin analytics endpoints)
   - May need to create: `GET /api/admin/detection-stats`

4. **Design Reference:**
   - `frontend/frontend/src/components/admin/AdminLayout.tsx` (admin design language)

---

## Deliverables

### 1. Detection Stats API (Backend - if doesn't exist)
**Path:** `backend/src/routes/admin.js` (add endpoint)

```javascript
// GET /api/admin/detection-stats
router.get('/detection-stats', requireAdmin, async (req, res) => {
  try {
    // Total detections
    const totalDetections = await pool.query(
      `SELECT COUNT(*) as count FROM basket_items WHERE added_at >= CURRENT_DATE`
    );

    // High/low confidence breakdown
    const highConfidence = await pool.query(
      `SELECT COUNT(*) as count FROM basket_items WHERE confidence >= 0.7 AND added_at >= CURRENT_DATE`
    );
    const lowConfidence = await pool.query(
      `SELECT COUNT(*) as count FROM pending_items WHERE status = 'pending'`
    );

    // Pending approvals
    const pendingApprovals = await pool.query(
      `SELECT COUNT(*) as count FROM pending_items WHERE status = 'pending'`
    );

    // Approval rate
    const approvalStats = await pool.query(
      `SELECT
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
         SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined
       FROM pending_items WHERE timestamp >= CURRENT_DATE`
    );

    // Average confidence
    const avgConfidence = await pool.query(
      `SELECT AVG(confidence) as avg FROM basket_items WHERE added_at >= CURRENT_DATE`
    );

    // Detections by hour (last 24 hours)
    const detectionsByHour = await pool.query(
      `SELECT
         EXTRACT(HOUR FROM added_at) as hour,
         COUNT(*) as count
       FROM basket_items
       WHERE added_at >= NOW() - INTERVAL '24 hours'
       GROUP BY hour
       ORDER BY hour`
    );

    // Device activity
    const deviceActivity = await pool.query(
      `SELECT
         id as device_id,
         last_heartbeat,
         status,
         (SELECT COUNT(*) FROM basket_items WHERE device_id = devices.id AND added_at >= CURRENT_DATE) as detection_count
       FROM devices
       ORDER BY last_heartbeat DESC`
    );

    const approved = parseInt(approvalStats.rows[0]?.approved || 0);
    const declined = parseInt(approvalStats.rows[0]?.declined || 0);
    const approvalRate = (approved + declined) > 0
      ? (approved / (approved + declined) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      stats: {
        totalDetections: parseInt(totalDetections.rows[0].count),
        highConfidence: parseInt(highConfidence.rows[0].count),
        lowConfidence: parseInt(lowConfidence.rows[0].count),
        pendingApprovals: parseInt(pendingApprovals.rows[0].count),
        approvalRate: parseFloat(approvalRate),
        avgConfidence: parseFloat(avgConfidence.rows[0].avg || 0).toFixed(2),
        detectionsToday: parseInt(totalDetections.rows[0].count),
        detectionsByHour: detectionsByHour.rows,
        deviceActivity: deviceActivity.rows
      }
    });
  } catch (error) {
    logger.error('Failed to fetch detection stats', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});
```

### 2. Detection Stats API Function (Frontend)
**Path:** `frontend/frontend/src/utils/api.ts` (add)

```typescript
interface DetectionStats {
  totalDetections: number;
  highConfidence: number;
  lowConfidence: number;
  pendingApprovals: number;
  approvalRate: number;
  avgConfidence: number;
  detectionsToday: number;
  detectionsByHour: { hour: string; count: number }[];
  deviceActivity: {
    device_id: string;
    last_heartbeat: string;
    detection_count: number;
    status: 'active' | 'inactive' | 'pending';
  }[];
}

export async function getDetectionStats(token: string): Promise<DetectionStats> {
  const response = await fetch(`${API_BASE}/api/admin/detection-stats`, {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error('Failed to fetch detection stats');
  const data = await response.json();
  return data.stats;
}
```

### 3. Updated AdminOverview Component
**Path:** `frontend/frontend/src/components/admin/AdminOverview.tsx`

**Add Detection Analytics Section:**

```typescript
import { useState, useEffect } from 'react';
import { getDetectionStats } from '../../utils/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';

const [detectionStats, setDetectionStats] = useState<DetectionStats | null>(null);

useEffect(() => {
  if (!authToken) return;

  const fetchStats = async () => {
    try {
      const stats = await getDetectionStats(authToken);
      setDetectionStats(stats);
    } catch (error) {
      console.error('Failed to fetch detection stats:', error);
    }
  };

  fetchStats();
  const interval = setInterval(fetchStats, 15000); // Poll every 15s
  return () => clearInterval(interval);
}, [authToken]);

// In JSX:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  {/* Stat Card 1: Total Detections */}
  <GlassCard className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-600">Total Detections Today</p>
        <p className="text-3xl font-bold text-slate-900">
          {detectionStats?.totalDetections || 0}
        </p>
      </div>
      <TrendingUp className="w-10 h-10 text-blue-500" />
    </div>
  </GlassCard>

  {/* Stat Card 2: High Confidence */}
  <GlassCard className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-600">High Confidence</p>
        <p className="text-3xl font-bold text-green-700">
          {detectionStats?.highConfidence || 0}
        </p>
        <p className="text-xs text-slate-500">
          {detectionStats ?
            ((detectionStats.highConfidence / detectionStats.totalDetections) * 100).toFixed(0)
            : 0}%
        </p>
      </div>
      <CheckCircle className="w-10 h-10 text-green-500" />
    </div>
  </GlassCard>

  {/* Stat Card 3: Low Confidence */}
  <GlassCard className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-600">Low Confidence</p>
        <p className="text-3xl font-bold text-amber-700">
          {detectionStats?.lowConfidence || 0}
        </p>
        <p className="text-xs text-slate-500">
          {detectionStats ?
            ((detectionStats.lowConfidence / detectionStats.totalDetections) * 100).toFixed(0)
            : 0}%
        </p>
      </div>
      <AlertCircle className="w-10 h-10 text-amber-500" />
    </div>
  </GlassCard>

  {/* Stat Card 4: Pending Approvals */}
  <GlassCard className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-600">Pending Approvals</p>
        <p className="text-3xl font-bold text-orange-700">
          {detectionStats?.pendingApprovals || 0}
        </p>
      </div>
      <Clock className="w-10 h-10 text-orange-500" />
    </div>
  </GlassCard>
</div>

{/* Confidence Distribution Chart */}
<GlassCard className="p-6 mb-6">
  <h3 className="text-lg font-semibold mb-4">Confidence Distribution</h3>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={[
      { name: 'High (≥70%)', value: detectionStats?.highConfidence || 0, fill: '#10b981' },
      { name: 'Low (<70%)', value: detectionStats?.lowConfidence || 0, fill: '#f59e0b' }
    ]}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="value" fill="#8884d8" />
    </BarChart>
  </ResponsiveContainer>
</GlassCard>

{/* Detections Timeline */}
<GlassCard className="p-6 mb-6">
  <h3 className="text-lg font-semibold mb-4">Detections Last 24 Hours</h3>
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={detectionStats?.detectionsByHour || []}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="hour" label={{ value: 'Hour', position: 'insideBottom', offset: -5 }} />
      <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
</GlassCard>

{/* Device Activity Table */}
<GlassCard className="p-6">
  <h3 className="text-lg font-semibold mb-4">Device Activity</h3>
  <table className="w-full">
    <thead>
      <tr className="border-b border-slate-200">
        <th className="text-left py-2">Device ID</th>
        <th className="text-left py-2">Last Heartbeat</th>
        <th className="text-left py-2">Detections Today</th>
        <th className="text-left py-2">Status</th>
      </tr>
    </thead>
    <tbody>
      {detectionStats?.deviceActivity.map(device => (
        <tr key={device.device_id} className="border-b border-slate-100">
          <td className="py-2">{device.device_id.slice(0, 8)}...</td>
          <td className="py-2">
            {new Date(device.last_heartbeat).toLocaleTimeString()}
          </td>
          <td className="py-2">{device.detection_count}</td>
          <td className="py-2">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              device.status === 'active' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            {device.status}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</GlassCard>
```

### 4. Memory Log
**Path:** `apm/Memory/Phase_04_Frontend_Enhancement/Task_4_5_Admin_detection_analytics.md`

**Requirements (200+ lines):**
- Executive summary
- Backend endpoint design (if created)
- Chart selection rationale (Bar vs. Pie vs. Line)
- Polling strategy (15 seconds, why different from user polling)
- Data aggregation approach
- Device activity monitoring logic
- Testing evidence (screenshots of charts)
- Git commit hash

---

## Validation Checklist

Before committing:

- [ ] Backend endpoint returns correct data
- [ ] Frontend fetches stats every 15 seconds
- [ ] 4 stat cards display correctly
- [ ] Confidence distribution chart shows green/amber
- [ ] Detections timeline shows last 24 hours
- [ ] Device activity table shows all devices
- [ ] Status indicators accurate (green/red dots)
- [ ] Charts responsive (mobile view)
- [ ] Admin-only access (requires admin token)
- [ ] Memory log 200+ lines

---

## Git Commit

```bash
git add backend/src/routes/admin.js frontend/frontend/src/utils/api.ts frontend/frontend/src/components/admin/AdminOverview.tsx apm/Memory/Phase_04_Frontend_Enhancement/Task_4_5_Admin_detection_analytics.md

git commit -m "feat: add detection analytics to admin dashboard (Task 4.5)

- Create admin detection stats backend endpoint
- Add detection stats API function (frontend)
- Create 4 stat cards (total, high/low confidence, pending)
- Implement confidence distribution bar chart
- Add detections timeline line chart (24 hours)
- Create device activity monitoring table
- Implement 15-second polling for real-time updates
- Status indicators for device health
- Responsive design for mobile
- Comprehensive memory log (200+ lines)

Admin can monitor detection system performance.

🤖 Generated with ChatGPT/Codex"
```

**DO NOT PUSH** - Stay local until Phase 4 complete.

---

## Success Criteria

1. ✅ Admin can view detection breakdown
2. ✅ Charts display correctly (bar chart, line chart)
3. ✅ Device activity table shows all devices
4. ✅ Polling updates every 15 seconds
5. ✅ Mobile responsive
6. ✅ Admin-only access
7. ✅ Memory log 200+ lines

---

**BEGIN TASK 4.5 NOW**

Give admins visibility into the detection system!
