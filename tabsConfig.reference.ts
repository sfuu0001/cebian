/**
 * 侧边栏导航配置（参考实现，摘自 MerchantSystemView.tsx 的 allTabsConfig）
 * ---------------------------------------------------------------------------
 * 这份数组是「功能导航 · 26 模块」的唯一数据源，MerchantSidebar 只负责渲染。
 * 摘录时做了两处简化，接入真实工程请以源文件为准：
 *   1. 动态徽标（待付订单 / 后厨票数 / 在桌数 / 挂账数 / 用户档案数）
 *      在源码里由父组件状态计算，这里统一写成 0
 *   2. 去掉 `badgeAlert: true` 告警色标记
 */
import {
  LayoutDashboard, Radio, ShoppingBag, ShieldCheck, ChefHat, UtensilsCrossed,
  Printer, Clock, ShieldAlert, Tag, Package, Shield, TrendingDown, TrendingUp,
  CreditCard, RotateCcw, SlidersHorizontal, Users, Fingerprint, Sparkles,
  Barcode, Cloud, GitBranch
} from 'lucide-react';
import type { TabItemConfig } from './types.reference';

export const allTabsConfig: TabItemConfig[] = [
    // 实时经营 — 营业核心高频作业链路
    { id: 'operations_deck', label: '运营总控', category: '实时经营', icon: LayoutDashboard },
    { id: 'precision_console', label: '供售打样', category: '实时经营', icon: Radio },
    { id: 'orders', label: '订单中心', category: '实时经营', icon: ShoppingBag, badge: 0 },
    { id: 'staff_center', label: '员工与权限', category: '实时经营', icon: ShieldCheck },
    { id: 'kds', label: '后厨看板', category: '实时经营', icon: ChefHat, badge: 0 },
    { id: 'tables', label: '台位矩阵', category: '实时经营', icon: UtensilsCrossed, badge: 0 },
    { id: 'printing_v2', label: '打印新版', category: '实时经营', icon: Printer },
    // 【2026-11-19 归一批次三】master_control 实时漏斗并入运营总控子页签「漏斗与容灾」
    { id: 'held', label: '挂账风控', category: '实时经营', icon: Clock, badge: 0 },
    { id: 'contingency', label: '退款审核', category: '实时经营', icon: ShieldAlert, badge: 0 },
    // 【2026-11-19 归一批次四】调度中枢降级为运营总控内「应急调度」入口（新窗口 ?preview=radar-console），删独立 tab
    { id: 'data_fallback', label: '数据容灾', category: '实时经营', icon: ShieldCheck },

    // 菜品供应 — 菜品、原料、库存与损耗
    { id: 'menu', label: '菜品沽清', category: '菜品供应', icon: Tag },
    // 【2026-11-19 归一批次二】craft_standards → 菜品页配方弹窗；processing_loss → loss 页初加工通道
    // 【2026-11-19 归一批次三】materials+sku_params 合并为「物料与SKU」（SKU 子页签保留店长级权限门）
    { id: 'materials', label: '物料与SKU', category: '菜品供应', icon: Package },
    { id: 'inventory_close', label: '打烊盘点', category: '菜品供应', icon: Shield },
    { id: 'loss', label: '损耗监控', category: '菜品供应', icon: TrendingDown },

    // 支付财务
    { id: 'analytics', label: '营收分析', category: '支付财务', icon: TrendingUp },
    { id: 'payment_channels', label: '收款渠道', category: '支付财务', icon: CreditCard },
    { id: 'shifts', label: '交班对账', category: '支付财务', icon: RotateCcw },
    { id: 'audit', label: '操作审计', category: '支付财务', icon: Shield },

    // 营销会员
    { id: 'marketing', label: '营销活动', category: '营销会员', icon: SlidersHorizontal },
    { id: 'members', label: '会员储值', category: '营销会员', icon: Users },
    { id: 'user_data_mgmt', label: '用户档案', category: '营销会员', icon: Fingerprint, badge: 0 },
    { id: 'category_brands', label: '类目品牌', category: '营销会员', icon: Sparkles },

    // 门店位置
    { id: 'gps', label: '停靠定位', category: '门店位置', icon: Radio },

    // 系统硬件
    { id: 'scanner', label: '扫码枪', category: '系统硬件', icon: Barcode },
    { id: 'cloud_sync', label: '云同步', category: '系统硬件', icon: Cloud },
    { id: 'version_tracking', label: '版本追踪', category: '系统硬件', icon: GitBranch }
  ];
