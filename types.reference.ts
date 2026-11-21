/**
 * 类型摘录（参考实现）
 * ---------------------------------------------------------------------------
 * 这三个类型在主工程里的真实出处：
 *   MerchantTab         ← src/components/merchant/MerchantSystemView.tsx（export）
 *   TabItemConfig       ← src/components/merchant/MerchantSidebar.tsx（export）
 *   MerchantSession     ← src/utils/staffAndRiderAuthEngine.ts（export，此处删减了设备指纹等字段）
 *   StaffRole           ← src/types.ts
 *
 * 放在一起只为方便单文件阅读侧边栏；接回主工程时请直接 import 原模块，不要用这份副本。
 */
import type React from 'react';

export type StaffRole = 'manager' | 'cashier' | 'grill_chef' | 'barista' | 'rider';

/** 商户操作台的页签枚举（28 个 id，侧边栏实际挂出其中 26 个） */
export type MerchantTab =
  | 'printing_v2'
  | 'operations_deck'
  | 'precision_console'
  | 'data_fallback'
  | 'tables'
  | 'orders'
  | 'contingency'
  | 'kds'
  | 'held'
  | 'scanner'
  | 'payment_channels'
  | 'marketing'
  | 'category_brands'
  | 'members'
  | 'materials'
  | 'inventory_close'
  | 'loss'
  | 'inventory'
  | 'sop'
  | 'shifts'
  | 'version_tracking'
  | 'cloud_sync'
  | 'audit'
  | 'gps'
  | 'menu'
  | 'user_data_mgmt'
  | 'analytics'
  | 'staff_center';

/** 侧边栏每一项的配置结构 */
export interface TabItemConfig {
  id: MerchantTab;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeAlert?: boolean;
}

/** 商户登录会话（此处为渲染侧边栏所需的最小字段集） */
export interface MerchantSession {
  isLoggedIn: boolean;
  phone: string;
  staffId: string;
  staffNo: string;
  name: string;
  role: StaffRole;
  roleTitle: string;
  permissions: string[];
  loginAt: string;
  authMethod: 'phone_sms' | 'phone_pwd' | 'one_click';
}
