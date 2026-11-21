# 商家端侧边栏 · 功能导航（26 模块）

UrbanRadar 流动餐车 · 商户操作台左侧导航抽屉的独立源码切片。

对应界面：顶部店铺名与折叠按钮 → 搜索框 → 6 个分组手风琴 → 每项图标/名称/徽标/权限锁 → 底部拖拽滚动条。

来源工程构建：`v2.9.0d0fdb27`　导出：2026-11-21

---

## 文件

| 文件 | 行数 | 作用 |
|---|---|---|
| `MerchantSidebar.tsx` | 685 | 组件本体。纯展示 + 交互，不发请求、不读业务存储 |
| `tabsConfig.reference.ts` | — | 26 个模块的配置数组，侧边栏的唯一数据源 |
| `rbacEngine.ts` | 598 | `canAccessMerchantTab` 权限判定，决定每项是否置灰上锁 |
| `types.reference.ts` | — | `MerchantTab` / `TabItemConfig` / `MerchantSession` / `StaffRole` 摘录 |

## 26 个模块（6 组）

| 分组 | 数量 | 模块 |
|---|---|---|
| **实时经营** | 10 | 运营总控 · 供售打样 · 订单中心 · 员工与权限 · 后厨看板 · 台位矩阵 · 打印新版 · 挂账风控 · 退款审核 · 数据容灾 |
| **菜品供应** | 4 | 菜品沽清 · 物料与SKU · 打烊盘点 · 损耗监控 |
| **支付财务** | 4 | 营收分析 · 收款渠道 · 交班对账 · 操作审计 |
| **营销会员** | 4 | 营销活动 · 会员储值 · 用户档案 · 类目品牌 |
| **门店位置** | 1 | 停靠定位 |
| **系统硬件** | 3 | 扫码枪 · 云同步 · 版本追踪 |

`MerchantTab` 枚举共 28 个 id，`inventory` 与 `sop` 不在侧边栏挂出（从其他入口进入）。

## Props 契约

```ts
interface MerchantSidebarProps {
  activeTab: MerchantTab;
  onSelectTab: (tab: MerchantTab) => void;
  tabsConfig: TabItemConfig[];                  // 26 项
  categories: string[];                         // 分组顺序
  isCollapsed: boolean;                         // 折叠成图标条
  onToggleCollapse: () => void;
  isOpenMobile: boolean;                        // 移动端抽屉
  onCloseMobile: () => void;
  truckName?: string;                           // 顶部「01（重庆摊摊面）」
  merchantSession?: MerchantSession | null;     // 传了才做权限判定
  pinnedTabs?: string[];
  onTogglePinTab?: (tabId: string) => void;
}
```

## 内置交互

| 能力 | 实现要点 |
|---|---|
| 搜索 | 同时匹配 `label` / `category` / `id`，命中即展开全部分组 |
| 手风琴 | `collapsedCategories` 记录折叠态，搜索期间临时忽略 |
| 拖拽滚动 | 鼠标/触摸 + 惯性衰减动画（`inertiaAnimationRef`） |
| 逐项渐隐 | 按可见项到中心的距离算透明度（`visibleFlatTabs`） |
| 自动定位 | 切页签时 `scrollIntoView` 到当前项 |
| 权限锁 | 渲染前调 `canAccessMerchantTab(id, session)`，无权置灰 |
| 徽标 | `badge` 数字 + `badgeAlert` 告警色 |
| 常用置顶 | `pinnedTabs` + `onTogglePinTab` |

## 分组配色

配色硬编码在组件内的 `CATEGORY_STYLES`，**分类名必须与配置的 `category` 完全一致**，
否则静默回落到默认色（不报错，只是颜色不对）：

| 分组 | 主色 |
|---|---|
| 实时经营 | emerald |
| 菜品供应 | amber |
| 支付财务 | blue |
| 营销会员 | purple |
| 门店位置 | orange |
| 系统硬件 | slate |

## 依赖

- npm：`react`、`lucide-react`、`motion/react`
- 主工程内部（本仓不含）：`src/types.ts` 的 `StaffRole`、`src/utils/staffAndRiderAuthEngine.ts`
  的 `MerchantSession`、`src/utils/safeStorage.ts`、`src/components/merchant/MerchantSystemView.tsx`
  （`MerchantTab` 的真实出处，以及 `allTabsConfig` 的原始定义）

## 接回主工程

```bash
# 组件本体（权限引擎若未改动可跳过）
cp MerchantSidebar.tsx <主工程>/src/components/merchant/
cp rbacEngine.ts       <主工程>/src/utils/
```

`tabsConfig.reference.ts` 与 `types.reference.ts` **仅作阅读参考**，不要放进主工程：
真实类型与配置都在 `MerchantSystemView.tsx`，重复定义会形成两套真相。

## 摘录时的简化

`tabsConfig.reference.ts` 与源码有两处差异，接入请以源文件为准：

1. 动态徽标（待付订单 / 后厨票 / 在桌 / 挂账 / 退款 / 用户档案）在源码里由父组件状态计算，
   参考文件统一写成 `0`
2. 去掉了 `badgeAlert: true` 与 `description` 字段
