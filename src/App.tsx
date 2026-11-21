import React, { useMemo, useState } from 'react';
import {
  Menu,
  Lock,
  ShieldCheck,
  Pin,
  X,
  KeyRound,
  Power,
  ChevronDown,
  ChevronRight,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { MerchantSidebar } from './components/merchant/MerchantSidebar';
import { allTabsConfig, MerchantTab, SIDEBAR_CATEGORIES } from './components/merchant/MerchantSystemView';
import {
  canAccessMerchantTab,
  getActiveManagerOverride,
  getSecurityAuditLogs,
  revokeManagerOverride,
  ROLE_LEVEL_META,
  verifyAndGrantManagerOverride
} from './utils/rbacEngine';
import type { MerchantSession, StaffRole } from '../types.reference';
import { sc } from './tokens';
import { LiveStrokeIcon } from './components/common/LiveStrokeIcon';

const DEMO_SESSIONS: Record<StaffRole, MerchantSession> = {
  manager: {
    isLoggedIn: true,
    phone: '13800008000',
    staffId: 'ST-001',
    staffNo: '001',
    name: '张伟',
    role: 'manager',
    roleTitle: '店长 / 运营总管',
    permissions: ['all'],
    loginAt: '2026-11-21T08:00:00.000Z',
    authMethod: 'one_click'
  },
  cashier: {
    isLoggedIn: true,
    phone: '13800008001',
    staffId: 'ST-002',
    staffNo: '002',
    name: '李晓芳',
    role: 'cashier',
    roleTitle: '前台领班 / 收银员',
    permissions: [],
    loginAt: '2026-11-21T08:15:00.000Z',
    authMethod: 'phone_pwd'
  },
  grill_chef: {
    isLoggedIn: true,
    phone: '13800008002',
    staffId: 'ST-003',
    staffNo: '003',
    name: '陈强',
    role: 'grill_chef',
    roleTitle: '炭烤档口主厨',
    permissions: [],
    loginAt: '2026-11-21T08:20:00.000Z',
    authMethod: 'phone_sms'
  },
  barista: {
    isLoggedIn: true,
    phone: '13800008003',
    staffId: 'ST-004',
    staffNo: '004',
    name: '林思雨',
    role: 'barista',
    roleTitle: '特调水吧师',
    permissions: [],
    loginAt: '2026-11-21T08:30:00.000Z',
    authMethod: 'phone_sms'
  },
  rider: {
    isLoggedIn: true,
    phone: '13800008004',
    staffId: 'ST-005',
    staffNo: '005',
    name: '王磊',
    role: 'rider',
    roleTitle: '流动专送骑士',
    permissions: [],
    loginAt: '2026-11-21T08:40:00.000Z',
    authMethod: 'phone_sms'
  }
};

const ALL_ROLES: StaffRole[] = ['manager', 'cashier', 'grill_chef', 'barista', 'rider'];
const PRECISION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function App() {
  const [activeTab, setActiveTab] = useState<MerchantTab>('operations_deck');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [selectedRole, setSelectedRole] = useState<StaffRole | 'guest'>('manager');
  const [pinnedTabs, setPinnedTabs] = useState<string[]>(['operations_deck', 'orders', 'kds']);
  const [overridePin, setOverridePin] = useState('');
  const [overrideFeedback, setOverrideFeedback] = useState<string | null>(null);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [, setOverrideTick] = useState(0);

  const merchantSession = useMemo<MerchantSession | null>(() => {
    if (selectedRole === 'guest') return null;
    return DEMO_SESSIONS[selectedRole];
  }, [selectedRole]);

  const activeOverride = getActiveManagerOverride();

  const activeTabIndex = useMemo(() => {
    const idx = allTabsConfig.findIndex((t) => t.id === activeTab);
    return String(idx >= 0 ? idx + 1 : 1).padStart(2, '0');
  }, [activeTab]);

  const activeTabConfig = useMemo(() => {
    return allTabsConfig.find((t) => t.id === activeTab) || allTabsConfig[0];
  }, [activeTab]);

  const accessCheck = useMemo(() => {
    return canAccessMerchantTab(activeTab, merchantSession);
  }, [activeTab, merchantSession, activeOverride]);

  const roleMatrix = useMemo(() => {
    return ALL_ROLES.map((role) => {
      const check = canAccessMerchantTab(activeTab, DEMO_SESSIONS[role]);
      return {
        role,
        meta: ROLE_LEVEL_META[role],
        allowed: check.allowed
      };
    });
  }, [activeTab, activeOverride]);

  const auditLogs = useMemo(() => {
    return getSecurityAuditLogs();
  }, [activeTab, selectedRole, activeOverride]);

  const handleTogglePinTab = (tabId: string) => {
    setPinnedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((id) => id !== tabId) : [...prev, tabId]
    );
  };

  const handleGrantOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const operatorName = merchantSession ? `${merchantSession.name} (${merchantSession.roleTitle})` : '未登录访客';
    const result = verifyAndGrantManagerOverride(overridePin, operatorName, `访问模块: ${activeTabConfig.label}`);
    setOverrideFeedback(result.message);
    if (result.success) {
      setOverridePin('');
    }
    setOverrideTick((n) => n + 1);
  };

  const handleRevokeOverride = () => {
    revokeManagerOverride();
    setOverrideFeedback('已吊销临时放行授权');
    setOverrideTick((n) => n + 1);
  };

  const ActiveIcon = activeTabConfig.icon;
  const latestAudit = auditLogs[0];

  return (
    <MotionConfig reducedMotion="never">
      <div className="flex h-screen w-screen overflow-hidden bg-[#F4F4F2] text-[#111827] font-sans">
        <MerchantSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          tabsConfig={allTabsConfig}
          categories={SIDEBAR_CATEGORIES}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          isOpenMobile={isOpenMobile}
          onCloseMobile={() => setIsOpenMobile(false)}
          truckName="01（重庆摊摊面）"
          merchantSession={merchantSession}
          pinnedTabs={pinnedTabs}
          onTogglePinTab={handleTogglePinTab}
        />

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#F4F4F2]">
          <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 space-y-3">
            {/* Top Unit Selector Strip */}
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-end gap-3 min-w-0">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setIsOpenMobile(true)}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-[3px] border border-[#CCCCCC] bg-[#FCFCFB] text-[#111827] hover:bg-[#EAEAE8] cursor-pointer shrink-0"
                  title="打开功能导航"
                  aria-label="打开功能导航"
                >
                  <Menu className="w-4 h-4" />
                </motion.button>

                <div className="space-y-1 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase text-[#71767B] leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3BB4FE]" />
                    <span>UNIT SELECTOR · 站点实时切换</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] border border-[#CCCCCC] bg-[#FCFCFB] text-[11px] font-bold text-[#111827] whitespace-nowrap shadow-xs">
                    <LiveStrokeIcon
                      icon={Truck}
                      className="w-3.5 h-3.5 text-[#006494]"
                      drawKey={`${selectedRole}-${accessCheck.allowed}`}
                      staggerMs={55}
                      durationMs={380}
                    />
                    <span>01（重庆摊摊面）（静安大悦城）</span>
                    <span className="text-[#71767B] font-normal">
                      ({accessCheck.allowed ? '营业中' : '受限'})
                    </span>
                  </div>
                </div>

                {/* Pinned Quick Access with Smooth Enter/Exit */}
                <div className="hidden xl:flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {pinnedTabs.map((tabId) => {
                      const cfg = allTabsConfig.find((t) => t.id === tabId);
                      if (!cfg) return null;
                      const isCurrent = cfg.id === activeTab;
                      return (
                        <motion.div
                          key={tabId}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.16, ease: PRECISION_EASE }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] text-[11px] border shrink-0 whitespace-nowrap transition-colors ${
                            isCurrent
                              ? 'bg-[#FCFCFB] text-[#006494] border-[#006494] font-bold'
                              : 'bg-[#FCFCFB] text-[#71767B] border-[#CCCCCC] hover:text-[#111827] font-medium'
                          }`}
                        >
                          <Pin className={`w-2.5 h-2.5 rotate-45 ${isCurrent ? 'text-[#006494]' : 'text-[#8A9096]'}`} />
                          <button
                            type="button"
                            onClick={() => setActiveTab(cfg.id)}
                            className="cursor-pointer whitespace-nowrap"
                          >
                            {cfg.label}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePinTab(cfg.id)}
                            className="text-[#8A9096] hover:text-[#111827] cursor-pointer"
                            title="取消固定"
                            aria-label={`取消固定 ${cfg.label}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <AnimatePresence>
                  {activeOverride && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.16, ease: PRECISION_EASE }}
                      onClick={handleRevokeOverride}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-[11px] font-bold bg-[#FCFCFB] text-[#C26D00] border border-[#C26D00]/40 hover:bg-[#F8F8F6] cursor-pointer whitespace-nowrap"
                      title="点击吊销店长临时提权"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      临时提权中 · 吊销
                    </motion.button>
                  )}
                </AnimatePresence>

                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value as StaffRole | 'guest');
                    setOverrideFeedback(null);
                  }}
                  aria-label="切换操作岗位"
                  className="px-3 py-1.5 rounded-[3px] border border-[#CCCCCC] bg-[#FCFCFB] text-[11px] font-bold text-[#111827] outline-none focus:border-[#006494] cursor-pointer"
                >
                  <option value="manager">店长 / 运营总管 (manager)</option>
                  <option value="cashier">前台领班 / 收银员 (cashier)</option>
                  <option value="grill_chef">炭烤档口主厨 (grill_chef)</option>
                  <option value="barista">特调水吧师 (barista)</option>
                  <option value="rider">流动专送骑士 (rider)</option>
                  <option value="guest">未登录会话 (null)</option>
                </select>
              </div>
            </header>

            {/* Main Matrix Panel */}
            <div className="bg-[#FCFCFB] border border-[#CCCCCC] rounded-[3px] overflow-hidden">
              {/* Title Bar */}
              <div className="px-5 py-3.5 border-b border-[#E2E2DF] flex flex-wrap items-center justify-between gap-4 bg-[#FCFCFB]">
                <div className="flex items-center gap-3">
                  <span className="w-[3px] h-7 bg-[#001020] rounded-[2px] shrink-0" />
                  <div>
                    <h1 className="text-[15px] font-bold text-[#111827]">
                      模块权限与岗位通道主控矩阵
                    </h1>
                    <p className="text-[10px] font-mono uppercase text-[#71767B] mt-0.5">
                      MODULE OPERATIONAL STATUS & RBAC CHANNEL MATRIX
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[10.5px] font-mono uppercase text-[#71767B] border border-[#E2E2DF] rounded-[3px] px-3 py-1.5 bg-[#F8F8F6]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#006494]" />
                    激活 (ACTIVE)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#8A9096]" />
                    受限 (HALTED)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#C26D00]" />
                    提权 (OVERRIDE)
                  </span>
                </div>
              </div>

              {/* Column Sub-header Strip */}
              <div className="hidden lg:grid lg:grid-cols-12 px-5 py-2 bg-[#F8F8F6] border-b border-[#E2E2DF] text-[11px] font-bold text-[#71767B]">
                <div className="col-span-4">模块编号 / 标识 / 权限编码</div>
                <div className="col-span-2">【总开关】KILLSWITCH</div>
                <div className="col-span-6 flex items-center justify-between">
                  <span>【5 岗位独立权限通道】CHANNELS</span>
                  <span className="font-normal text-[10.5px] text-[#8A9096]">点击卡片切换岗位</span>
                </div>
              </div>

              {/* Active Module Row */}
              <div className="px-5 py-5 border-b border-[#E2E2DF] grid grid-cols-1 lg:grid-cols-12 gap-5 items-center bg-[#FCFCFB]">
                {/* Left Module Identity with Smooth Transition */}
                <div className="lg:col-span-4 min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTabConfig.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.16, ease: PRECISION_EASE }}
                      className="flex items-center gap-3.5 min-w-0"
                    >
                      <div
                        className={`w-9 h-9 rounded-[3px] font-mono text-[13px] font-bold tabular-nums flex items-center justify-center shrink-0 transition-colors duration-150 ${
                          accessCheck.allowed
                            ? 'bg-[#001020] text-white'
                            : 'bg-[#EAEAE8] text-[#8A9096]'
                        }`}
                      >
                        {activeTabIndex}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold text-[#111827]">
                            {activeTabConfig.label}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold leading-none transition-colors ${
                              accessCheck.allowed
                                ? activeOverride
                                  ? 'bg-[#EAEAE8] text-[#C26D00]'
                                  : 'bg-[#006494] text-white'
                                : 'bg-[#EAEAE8] text-[#71767B]'
                            }`}
                          >
                            {accessCheck.allowed
                              ? activeOverride
                                ? '临时放行'
                                : '已授权'
                              : '已锁定'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#71767B] mt-1 truncate">
                          {activeTabConfig.category} ·{' '}
                          <span className="font-mono">{activeTabConfig.id}</span>
                          {accessCheck.requirement && (
                            <>
                              {' '}
                              · <span className="font-mono">{accessCheck.requirement.requiredPermission}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Center Killswitch */}
                <div className="lg:col-span-2 flex items-center gap-3 shrink-0">
                  <motion.div
                    key={`power-${activeTabConfig.id}-${accessCheck.allowed}`}
                    animate={{ scale: accessCheck.allowed ? 1 : 0.96 }}
                    transition={{ duration: 0.18, ease: PRECISION_EASE }}
                    className={`w-9 h-9 rounded-[4px] flex items-center justify-center border relative shrink-0 transition-colors duration-150 ${
                      accessCheck.allowed
                        ? 'bg-[#001020] border-transparent text-[#3BB4FE]'
                        : 'bg-[#F0F0EE] border-[#E2E2DF] text-[#8A9096]'
                    }`}
                  >
                    {accessCheck.allowed && (
                      <svg
                        key={`killswitch-trace-${activeTabConfig.id}-${selectedRole}`}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 36 36"
                        aria-hidden="true"
                      >
                        <rect
                          x="0.75"
                          y="0.75"
                          width="34.5"
                          height="34.5"
                          rx="3.5"
                          fill="none"
                          stroke="#3BB4FE"
                          strokeOpacity="0.65"
                          strokeWidth="1.25"
                          pathLength={1}
                          className="svg-border-trace"
                        />
                      </svg>
                    )}
                    <LiveStrokeIcon
                      icon={Power}
                      className="w-4 h-4"
                      drawKey={`${activeTabConfig.id}-${accessCheck.allowed}-${selectedRole}`}
                      staggerMs={70}
                      durationMs={400}
                      accentTrace={false}
                    />
                    {accessCheck.allowed && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#3BB4FE] live-beacon-ring" />
                    )}
                    <span
                      style={
                        accessCheck.allowed
                          ? { boxShadow: `0 0 6px ${sc.effect.brandAccentGlow}` }
                          : undefined
                      }
                      className={`w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5 transition-colors ${
                        accessCheck.allowed ? 'bg-[#3BB4FE]' : 'bg-[#8A9096]'
                      }`}
                    />
                  </motion.div>
                  <div>
                    <div className="text-[11.5px] font-bold text-[#111827] flex items-center gap-1.5">
                      <LiveStrokeIcon
                        icon={ActiveIcon}
                        className="w-3.5 h-3.5 text-[#006494]"
                        drawKey={`${activeTabConfig.id}-${selectedRole}`}
                        staggerMs={55}
                        durationMs={400}
                      />
                      {accessCheck.allowed ? '全通道放行' : '岗位受限'}
                    </div>
                    <div
                      className={`font-mono text-[10px] font-bold uppercase mt-0.5 ${
                        accessCheck.allowed
                          ? activeOverride
                            ? 'text-[#C26D00]'
                            : 'text-[#006494]'
                          : 'text-[#71767B]'
                      }`}
                    >
                      {accessCheck.allowed
                        ? activeOverride
                          ? `OVERRIDE 0x${activeTabIndex}`
                          : `ONLINE 0x${activeTabIndex}`
                        : `HALTED 0x00`}
                    </div>
                  </div>
                </div>

                {/* Right 5 Role Channel Cards with Smooth Toggle Knob Physics */}
                <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {roleMatrix.map((item) => {
                    const isCurrentRole = selectedRole === item.role;
                    return (
                      <motion.button
                        key={item.role}
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.14, ease: PRECISION_EASE }}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pctX = Math.max(
                            0,
                            Math.min(100, ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100)
                          );
                          e.currentTarget.style.setProperty('--mx-pos', `${(85 - pctX * 0.7).toFixed(1)}%`);
                        }}
                        onClick={() => {
                          setSelectedRole(item.role);
                          setOverrideFeedback(null);
                        }}
                        className={`specular-card text-left rounded-[3px] border p-2.5 transition-colors cursor-pointer ${
                          item.allowed
                            ? isCurrentRole
                              ? 'bg-[#FCFCFB] border-[#006494]'
                              : 'bg-[#FCFCFB] border-[#006494]/40 hover:border-[#006494] hover:bg-[#F5F8FA]'
                            : isCurrentRole
                            ? 'bg-[#F6F6F4] border-[#C26D00]'
                            : 'bg-[#F6F6F4] border-[#E2E2DF] hover:border-[#CCCCCC]'
                        }`}
                      >
                        <span className="specular-sweep" aria-hidden="true" />
                        <div className="flex items-center justify-between gap-2 relative z-10">
                          <span
                            className={`text-[11.5px] font-bold truncate ${
                              item.allowed ? 'text-[#111827]' : 'text-[#8A9096]'
                            }`}
                          >
                            {item.meta.name.split(' / ')[0]}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`w-6 h-3 rounded-full p-0.5 flex items-center shrink-0 transition-colors duration-150 ${
                              item.allowed
                                ? 'bg-[#006494] justify-end'
                                : 'bg-[#CCCCCC] justify-start'
                            }`}
                          >
                            <motion.span
                              layout
                              transition={{ type: 'spring', stiffness: 550, damping: 35 }}
                              className="w-2 h-2 rounded-full bg-white"
                            />
                          </span>
                        </div>
                        <div
                          className={`text-[11px] font-bold mt-1.5 relative z-10 ${
                            item.allowed ? 'text-[#006494]' : 'text-[#8A9096]'
                          }`}
                        >
                          {item.allowed ? '开启中' : '已打样'}
                        </div>
                        <div className="text-[9.5px] font-normal text-[#71767B] mt-0.5 truncate relative z-10">
                          {item.role}
                          {isCurrentRole ? ' · 当前选中' : ''}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Specification Strip */}
              <div className="bg-[#F8F8F6] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTabConfig.id}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.14, ease: PRECISION_EASE }}
                    className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E2DF] text-[11px]"
                  >
                    <div className="px-5 py-3">
                      <span className="text-[#71767B]">所需权限编码：</span>
                      <span className="font-mono font-bold text-[#111827]">
                        {accessCheck.requirement ? accessCheck.requirement.requiredPermission : 'default:open'}
                      </span>
                    </div>
                    <div className="px-5 py-3">
                      <span className="text-[#71767B]">最低要求岗位：</span>
                      <span className="font-bold text-[#111827]">
                        {accessCheck.requirement
                          ? ROLE_LEVEL_META[accessCheck.requirement.minimumRole].name
                          : '全员可访问'}
                      </span>
                    </div>
                    <div className="px-5 py-3">
                      <span className="text-[#71767B]">安全敏感级别：</span>
                      <span className={`font-bold ${accessCheck.requirement?.isSensitive ? 'text-[#D32F2F]' : 'text-[#111827]'}`}>
                        {accessCheck.requirement?.isSensitive ? '敏感控制模块' : '常规作业模块'}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {accessCheck.requirement?.helpTip && (
                <div className="px-5 py-3 border-t border-[#E2E2DF] text-[11px] text-[#71767B] bg-[#FCFCFB]">
                  {accessCheck.requirement.helpTip}
                </div>
              )}

              <AnimatePresence>
                {!accessCheck.allowed && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: PRECISION_EASE }}
                    className="px-5 py-3.5 border-t border-[#E2E2DF] bg-[#F8F8F6] space-y-2.5"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-[#C26D00] font-bold">
                      <LiveStrokeIcon
                        icon={Lock}
                        className="w-3.5 h-3.5"
                        drawKey={`${activeTabConfig.id}-${selectedRole}`}
                        accentTrace={false}
                      />
                      {accessCheck.reason}
                    </div>
                    {merchantSession && (
                      <form onSubmit={handleGrantOverride} className="flex flex-wrap items-center gap-2">
                        <input
                          type="password"
                          value={overridePin}
                          onChange={(e) => setOverridePin(e.target.value)}
                          placeholder="输入店长临时授权码 (默认 8888)"
                          className="px-3 py-1.5 rounded-[3px] border border-[#CCCCCC] bg-[#FCFCFB] text-[11px] text-[#111827] outline-none focus:border-[#006494] w-56"
                        />
                        <motion.button
                          type="submit"
                          whileTap={{ scale: 0.96 }}
                          className="px-3.5 py-1.5 rounded-[3px] bg-[#006494] text-white text-[11px] font-bold hover:opacity-90 cursor-pointer whitespace-nowrap"
                        >
                          店长临时放行
                        </motion.button>
                      </form>
                    )}
                    {overrideFeedback && (
                      <div className="text-[11px] text-[#C26D00]">{overrideFeedback}</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {accessCheck.allowed && accessCheck.reason && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="px-5 py-3 border-t border-[#E2E2DF] bg-[#E8F3FA] text-[11px] text-[#006494] font-bold flex items-center gap-2"
                  >
                    <LiveStrokeIcon
                      icon={ShieldCheck}
                      className="w-4 h-4 shrink-0"
                      drawKey={`${activeTabConfig.id}-${Boolean(activeOverride)}`}
                    />
                    {accessCheck.reason}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Drawer with Smooth Expand/Collapse */}
            <div className="bg-[#FCFCFB] border border-[#CCCCCC] rounded-[3px] overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAuditDrawerOpen((prev) => !prev)}
                className="w-full px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-[#F8F8F6] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <motion.span
                    animate={{ rotate: isAuditDrawerOpen ? 90 : 0 }}
                    transition={{ duration: 0.16, ease: PRECISION_EASE }}
                    className="inline-flex items-center justify-center shrink-0"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-[#71767B]" />
                  </motion.span>
                  <span className="text-[11.5px] font-bold text-[#111827] shrink-0">
                    权限审计总线与访问记录
                  </span>
                  <span className="px-1.5 py-0.5 rounded-[2px] bg-[#EAEAE8] text-[9.5px] font-mono uppercase text-[#71767B] shrink-0">
                    DRAWER
                  </span>
                  {latestAudit && (
                    <span className="text-[11px] text-[#006494] truncate">
                      最新审计：{latestAudit.operator} · {latestAudit.details}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-[#71767B] shrink-0">
                  <span className="hidden sm:inline">
                    {isAuditDrawerOpen ? '收起审计记录' : '点击展开审计与权限记录'}
                  </span>
                  <span className="w-6 h-6 rounded-[3px] border border-[#CCCCCC] bg-[#FCFCFB] flex items-center justify-center">
                    <motion.span
                      animate={{ rotate: isAuditDrawerOpen ? 180 : 0 }}
                      transition={{ duration: 0.18, ease: PRECISION_EASE }}
                      className="inline-flex items-center justify-center"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-[#71767B]" />
                    </motion.span>
                  </span>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isAuditDrawerOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: PRECISION_EASE }}
                    className="overflow-hidden border-t border-[#E2E2DF]"
                  >
                    <div className="divide-y divide-[#E2E2DF] text-[11px]">
                    {auditLogs.slice(0, 6).map((log, idx) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.18, delay: idx * 0.025, ease: PRECISION_EASE }}
                        className={`px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          idx % 2 === 1 ? 'bg-[#F4F4F2]' : 'bg-[#FCFCFB]'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-[#111827]">{log.operator}</span>
                          <span className="text-[#71767B] mx-1.5">·</span>
                          <span className="text-[#71767B]">{log.details}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded-[2px] font-bold uppercase ${
                              log.status === 'denied'
                                ? 'bg-[#EAEAE8] text-[#D32F2F]'
                                : log.status === 'granted'
                                ? 'bg-[#EAEAE8] text-[#C26D00]'
                                : 'bg-[#E8F3FA] text-[#006494]'
                            }`}
                          >
                            {log.status}
                          </span>
                          <span className="text-[#71767B] tabular-nums">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

export default App;
