import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  ChevronDown,
  LayoutGrid,
  PanelLeftClose,
  PanelLeft,
  Lock,
  ChevronUp,
  Pin
} from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { MerchantTab } from './MerchantSystemView';
import { canAccessMerchantTab } from '../../utils/rbacEngine';
import { MerchantSession } from '../../utils/staffAndRiderAuthEngine';
import { LiveStrokeIcon } from '../common/LiveStrokeIcon';

export interface TabItemConfig {
  id: MerchantTab;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeAlert?: boolean;
}

interface MerchantSidebarProps {
  activeTab: MerchantTab;
  onSelectTab: (tab: MerchantTab) => void;
  tabsConfig: TabItemConfig[];
  categories: string[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  truckName?: string;
  merchantSession?: MerchantSession | null;
  pinnedTabs?: string[];
  onTogglePinTab?: (tabId: string) => void;
}

const CATEGORY_EN_SUBTITLES: Record<string, string> = {
  实时经营: 'LIVE OPERATIONS',
  菜品供应: 'MENU & SUPPLY',
  支付财务: 'FINANCE & AUDIT',
  营销会员: 'MARKETING & CRM',
  门店位置: 'STATION GPS',
  系统硬件: 'HARDWARE & SYNC'
};

const PRECISION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const MerchantSidebar: React.FC<MerchantSidebarProps> = ({
  activeTab,
  onSelectTab,
  tabsConfig,
  categories,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  truckName,
  merchantSession,
  pinnedTabs,
  onTogglePinTab
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Masonry & live SVG icon drawing state
  const [animEpoch, setAnimEpoch] = useState(0);
  const [revealedDelays, setRevealedDelays] = useState<Record<string, number>>({});
  const [hoverRedrawCounts, setHoverRedrawCounts] = useState<Record<string, number>>({});
  const [clickPulseCounts, setClickPulseCounts] = useState<Record<string, number>>({});
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchDrawKey, setSearchDrawKey] = useState(0);
  const [hoveredRailItem, setHoveredRailItem] = useState<{
    tab: TabItemConfig;
    index: string;
    top: number;
    left: number;
    isRestricted: boolean;
    isPinned: boolean;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopListRef = useRef<HTMLDivElement>(null);
  const mobileListRef = useRef<HTMLDivElement>(null);
  const desktopCatRailRef = useRef<HTMLDivElement>(null);
  const mobileCatRailRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const getActiveContainer = useCallback(() => {
    if (isOpenMobile && mobileListRef.current) {
      return mobileListRef.current;
    }
    return desktopListRef.current;
  }, [isOpenMobile]);

  const getActiveCatRail = useCallback(() => {
    if (isOpenMobile && mobileCatRailRef.current) {
      return mobileCatRailRef.current;
    }
    return desktopCatRailRef.current;
  }, [isOpenMobile]);

  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isScrollingActive, setIsScrollingActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [scrollThumbMetrics, setScrollThumbMetrics] = useState({ heightPct: 28, topPct: 0 });
  const [activeScrollCategory, setActiveScrollCategory] = useState<string | null>(null);

  const dragStartYRef = useRef(0);
  const dragStartScrollTopRef = useRef(0);
  const dragMovedRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inertiaAnimationRef = useRef<number | null>(null);
  const lastClientYRef = useRef(0);
  const velocityYRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const scrollDirRef = useRef<'down' | 'up'>('down');
  const revealedIdsRef = useRef<Set<string>>(new Set());
  const wasOffscreenRef = useRef<Set<string>>(new Set());

  const tabIndexMap = useMemo(() => {
    const map = new Map<string, string>();
    tabsConfig.forEach((tab, idx) => {
      map.set(tab.id, String(idx + 1).padStart(2, '0'));
    });
    return map;
  }, [tabsConfig]);

  const replayMasonry = useCallback(() => {
    revealedIdsRef.current.clear();
    wasOffscreenRef.current.clear();
    setRevealedDelays({});
    setAnimEpoch((e) => e + 1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCollapsed) return;
      const target = e.target as HTMLElement | null;
      const isEditing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if (e.key === '/' && !isEditing) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  const toggleCategory = (cat: string) => {
    const willExpand = Boolean(collapsedCategories[cat]);
    if (willExpand) {
      const catIds = tabsConfig.filter((t) => t.category === cat).map((t) => t.id);
      setRevealedDelays((prev) => {
        const next = { ...prev };
        catIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
    }
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    replayMasonry();
  };

  const filteredTabs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tabsConfig.filter((t) => {
      if (selectedCategory !== 'all' && !q && t.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        t.label.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [tabsConfig, searchQuery, selectedCategory]);

  const visibleCategories = useMemo(() => {
    if (selectedCategory !== 'all' && !searchQuery.trim()) {
      return categories.filter((c) => c === selectedCategory);
    }
    return categories;
  }, [categories, selectedCategory, searchQuery]);

  // Global sequential order (1st -> 2nd -> 3rd -> 4th -> 5th -> 6th...)
  const masonryOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    let globalOrder = 0;
    visibleCategories.forEach((cat) => {
      const isCatCollapsed =
        !searchQuery && selectedCategory === 'all' && Boolean(collapsedCategories[cat]);
      if (!isCatCollapsed) {
        const catTabs = filteredTabs.filter((t) => t.category === cat);
        catTabs.forEach((tab) => {
          map.set(tab.id, globalOrder++);
        });
      }
    });
    return map;
  }, [visibleCategories, filteredTabs, collapsedCategories, searchQuery, selectedCategory]);

  // Viewport-aware masonry brick observer: reveals visible bricks in strict horizontal order on load & scroll
  useEffect(() => {
    const container = getActiveContainer();
    if (!container) return;

    const brickEls = Array.from(container.querySelectorAll<HTMLElement>('[data-brick-id]'));
    if (brickEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => ({
            el: entry.target as HTMLElement,
            id: (entry.target as HTMLElement).dataset.brickId || '',
            order: Number((entry.target as HTMLElement).dataset.brickOrder || '0')
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.order - b.order);

        if (intersecting.length === 0) return;

        intersecting.forEach((item) => observer.unobserve(item.el));

        setRevealedDelays((prev) => {
          let changed = false;
          const next = { ...prev };
          let seq = 0;
          intersecting.forEach((item) => {
            revealedIdsRef.current.add(item.id);
            if (next[item.id] === undefined) {
              next[item.id] = 40 + seq * 60;
              seq += 1;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      },
      {
        root: container,
        rootMargin: '16px 0px',
        threshold: 0.02
      }
    );

    brickEls.forEach((el) => {
      const id = el.dataset.brickId;
      if (id && revealedDelays[id] === undefined) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [
    animEpoch,
    selectedCategory,
    searchQuery,
    collapsedCategories,
    isCollapsed,
    isOpenMobile,
    getActiveContainer
  ]);

  // Directional bidirectional scroll glide: animates already-revealed cards as they re-enter top/bottom edges
  useEffect(() => {
    const container = getActiveContainer();
    if (!container) return;

    const brickEls = Array.from(container.querySelectorAll<HTMLElement>('[data-brick-id]'));
    if (brickEls.length === 0) return;

    const scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          const id = el.dataset.brickId || '';
          if (!id || !revealedIdsRef.current.has(id)) return;

          if (!entry.isIntersecting) {
            wasOffscreenRef.current.add(id);
            return;
          }

          if (wasOffscreenRef.current.has(id)) {
            wasOffscreenRef.current.delete(id);
            if (typeof el.animate === 'function') {
              const order = Number(el.dataset.brickOrder || '0');
              const colIdx = order % 3;
              const offsetY = scrollDirRef.current === 'down' ? 14 : -14;
              el.animate(
                [
                  { opacity: 0.45, transform: `translate3d(0, ${offsetY}px, 0) scale(0.96)` },
                  { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
                ],
                {
                  duration: 240,
                  delay: colIdx * 26,
                  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  fill: 'none'
                }
              );
            }
          }
        });
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: 0.06
      }
    );

    brickEls.forEach((el) => scrollObserver.observe(el));
    return () => scrollObserver.disconnect();
  }, [
    animEpoch,
    selectedCategory,
    searchQuery,
    collapsedCategories,
    isCollapsed,
    isOpenMobile,
    getActiveContainer
  ]);

  const triggerIconRedraw = (tabId: string) => {
    setHoverRedrawCounts((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] || 0) + 1
    }));
  };

  const triggerClickPulse = (tabId: string) => {
    setClickPulseCounts((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] || 0) + 1
    }));
  };

  const handleSpecularMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pctX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100));
    e.currentTarget.style.setProperty('--mx-pos', `${(85 - pctX * 0.7).toFixed(1)}%`);
  };

  const activeTabConfig = useMemo(() => {
    return tabsConfig.find((t) => t.id === activeTab) || tabsConfig[0];
  }, [tabsConfig, activeTab]);

  const activeAccessCheck = useMemo(() => {
    return canAccessMerchantTab(activeTabConfig.id, merchantSession);
  }, [activeTabConfig.id, merchantSession]);

  const totalUrgentBadges = useMemo(() => {
    return tabsConfig
      .filter((t) => t.badgeAlert && t.badge && t.badge > 0)
      .reduce((sum, t) => sum + (t.badge || 0), 0);
  }, [tabsConfig]);

  const updateScrollState = useCallback(() => {
    const el = getActiveContainer();
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (Math.abs(scrollTop - lastScrollTopRef.current) > 1) {
      scrollDirRef.current = scrollTop >= lastScrollTopRef.current ? 'down' : 'up';
      lastScrollTopRef.current = scrollTop;
    }

    setCanScrollUp(scrollTop > 4);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 6);

    const maxScroll = scrollHeight - clientHeight;
    const pct = maxScroll > 0 ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)) : 0;
    setScrollPercentage(pct);

    const heightPct =
      scrollHeight > 0 ? Math.max(14, Math.min(86, (clientHeight / scrollHeight) * 100)) : 100;
    const topPct = maxScroll > 0 ? (pct / 100) * (100 - heightPct) : 0;
    setScrollThumbMetrics({ heightPct, topPct });

    const sectionEls = Array.from(el.querySelectorAll<HTMLElement>('[data-cat-section]'));
    const elRect = el.getBoundingClientRect();
    if (sectionEls.length > 0 && elRect.height > 0) {
      const safeMaxScroll = Math.max(0, maxScroll);
      const scrollRatio = safeMaxScroll > 0 ? Math.min(1, Math.max(0, scrollTop / safeMaxScroll)) : 0;
      const focalViewportY = elRect.top + 18 + scrollRatio * Math.max(0, clientHeight - 64);

      let currentCat: string | null = sectionEls[0]?.dataset.catSection || null;
      if (safeMaxScroll > 0 && scrollTop + clientHeight >= scrollHeight - 6) {
        currentCat = sectionEls[sectionEls.length - 1]?.dataset.catSection || currentCat;
      } else {
        sectionEls.forEach((sec) => {
          const secRect = sec.getBoundingClientRect();
          if (secRect.top <= focalViewportY) {
            currentCat = sec.dataset.catSection || currentCat;
          }
        });
      }
      setActiveScrollCategory(currentCat);
    } else {
      setActiveScrollCategory(null);
    }
  }, [getActiveContainer]);

  const handleScroll = useCallback(() => {
    setHoveredRailItem(null);
    updateScrollState();
    setIsScrollingActive(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrollingActive(false);
    }, 550);
  }, [updateScrollState]);

  useEffect(() => {
    if (!isCollapsed) {
      setHoveredRailItem(null);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const el = getActiveContainer();
    if (!el) return;
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (inertiaAnimationRef.current) cancelAnimationFrame(inertiaAnimationRef.current);
    };
  }, [updateScrollState, getActiveContainer, filteredTabs, collapsedCategories, selectedCategory]);

  const highlightedScrollCat = useMemo(() => {
    if (selectedCategory !== 'all') return selectedCategory;
    if (activeScrollCategory && visibleCategories.includes(activeScrollCategory)) {
      return activeScrollCategory;
    }
    return visibleCategories[0] || null;
  }, [selectedCategory, activeScrollCategory, visibleCategories]);

  // Keep the active/scroll-linked category pill centered within the visible horizontal rail
  useEffect(() => {
    if (isCollapsed || !highlightedScrollCat) return;
    const rail = getActiveCatRail();
    if (!rail) return;

    const pill = Array.from(rail.querySelectorAll<HTMLElement>('[data-cat-pill]')).find(
      (node) => node.dataset.catPill === highlightedScrollCat
    );
    if (!pill) return;

    const maxRailScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const targetLeft = Math.max(
      0,
      Math.min(maxRailScroll, pill.offsetLeft - rail.clientWidth / 2 + pill.offsetWidth / 2)
    );

    if (Math.abs(rail.scrollLeft - targetLeft) > 4) {
      rail.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [highlightedScrollCat, isCollapsed, isOpenMobile, getActiveCatRail]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTab]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = getActiveContainer();
    if (!el) return;

    const target = e.target as HTMLElement;
    if (target.closest('input') || target.closest('select')) return;

    if (inertiaAnimationRef.current) {
      cancelAnimationFrame(inertiaAnimationRef.current);
      inertiaAnimationRef.current = null;
    }

    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartScrollTopRef.current = el.scrollTop;
    lastClientYRef.current = e.clientY;
    velocityYRef.current = 0;
    dragMovedRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - dragStartYRef.current;
      if (Math.abs(delta) > 4) {
        dragMovedRef.current = true;
      }
      velocityYRef.current = moveEvent.clientY - lastClientYRef.current;
      lastClientYRef.current = moveEvent.clientY;

      const activeEl = getActiveContainer();
      if (activeEl) {
        activeEl.scrollTop = dragStartScrollTopRef.current - delta;
      }
      setIsScrollingActive(true);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const activeEl = getActiveContainer();
      if (Math.abs(velocityYRef.current) > 1.5 && activeEl) {
        let currentVelocity = velocityYRef.current * 1.45;
        const glide = () => {
          const currentEl = getActiveContainer();
          if (!currentEl || Math.abs(currentVelocity) < 0.3) {
            inertiaAnimationRef.current = null;
            dragMovedRef.current = false;
            setIsScrollingActive(false);
            return;
          }
          currentEl.scrollTop -= currentVelocity;
          currentVelocity *= 0.92;
          inertiaAnimationRef.current = requestAnimationFrame(glide);
        };
        inertiaAnimationRef.current = requestAnimationFrame(glide);
      } else {
        setTimeout(() => {
          dragMovedRef.current = false;
          setIsScrollingActive(false);
        }, 60);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const scrollSmoothBy = (direction: 'up' | 'down') => {
    const el = getActiveContainer();
    if (!el) return;
    const delta = direction === 'up' ? -220 : 220;
    el.scrollBy({ top: delta, behavior: 'smooth' });
  };

  const renderSidebarBody = (instanceKey: string) => (
    <div className="flex flex-col h-full bg-[#FCFCFB] text-[#111827] select-none font-sans overflow-hidden relative">
      {/* 1. Header */}
      <div
        className={`border-b border-[#E2E2DF] flex bg-[#FCFCFB] shrink-0 ${
          isCollapsed
            ? 'flex-col items-center gap-1.5 px-2 py-2.5'
            : 'items-center justify-between px-3 py-2.5 gap-2'
        }`}
      >
        <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={replayMasonry}
            onMouseMove={handleSpecularMove}
            title="点击重播砌筑与图标绘制动画"
            className={`specular-card rounded-[3px] bg-[#001020] text-[#3BB4FE] flex items-center justify-center shrink-0 relative cursor-pointer ${
              isCollapsed ? 'w-10 h-8' : 'w-8 h-8'
            }`}
          >
            <span className="specular-sweep" aria-hidden="true" />
            <LiveStrokeIcon
              icon={LayoutGrid}
              wrapperClassName="relative z-10"
              className="w-4 h-4"
              drawKey={animEpoch}
              staggerMs={65}
              durationMs={400}
              accentTrace={false}
            />
          </motion.button>
          <AnimatePresence initial={false} mode="popLayout">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.16, ease: PRECISION_EASE }}
                className="min-w-0"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-[#111827] leading-tight whitespace-nowrap">
                    功能导航
                  </span>
                  <span className="px-1.5 py-0.5 rounded-[2px] bg-[#006494] text-white text-[9.5px] font-bold leading-none tabular-nums whitespace-nowrap">
                    {tabsConfig.length}模块
                  </span>
                </div>
                <div className="text-[10px] text-[#71767B] truncate mt-0.5 font-mono">
                  {truckName ? truckName : 'NAV MATRIX'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onMouseMove={handleSpecularMove}
          onClick={() => {
            onToggleCollapse();
            replayMasonry();
          }}
          className={`specular-card hidden md:flex bg-[#FCFCFB] hover:bg-[#EAEAE8] rounded-[3px] text-[#71767B] hover:text-[#111827] transition-colors cursor-pointer items-center justify-center border border-[#CCCCCC] shrink-0 ${
            isCollapsed ? 'w-10 h-7' : 'w-7 h-7'
          }`}
          title={isCollapsed ? '展开三列网格导航' : '收起为图标导轨'}
          aria-label={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <span className="specular-sweep" aria-hidden="true" />
          <LiveStrokeIcon
            icon={isCollapsed ? PanelLeft : PanelLeftClose}
            wrapperClassName="relative z-10"
            className="w-3.5 h-3.5"
            drawKey={String(isCollapsed)}
            durationMs={340}
            accentTrace={false}
          />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onCloseMobile}
          className="md:hidden w-7 h-7 bg-[#FCFCFB] hover:bg-[#EAEAE8] rounded-[3px] text-[#71767B] hover:text-[#111827] transition-colors cursor-pointer items-center justify-center border border-[#CCCCCC] shrink-0"
          title="关闭导航栏"
          aria-label="关闭导航栏"
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* 2. Search & Category Filter Strip */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: PRECISION_EASE }}
            className="px-3 pt-2.5 pb-2 border-b border-[#E2E2DF] bg-[#FCFCFB] space-y-2 shrink-0"
          >
            <div className="relative flex items-center overflow-hidden rounded-[3px]">
              <LiveStrokeIcon
                icon={Search}
                wrapperClassName="absolute left-2.5 pointer-events-none z-10"
                className={`w-3.5 h-3.5 transition-colors duration-150 ${
                  isSearchFocused ? 'text-[#006494]' : 'text-[#71767B]'
                }`}
                drawKey={searchDrawKey}
                staggerMs={55}
                durationMs={340}
                accentTrace={isSearchFocused}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setSearchDrawKey((k) => k + 1);
                }}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (!val.trim()) {
                    replayMasonry();
                  }
                }}
                placeholder="搜索模块名称 / 编码..."
                className="w-full pl-8 pr-7 py-1.5 bg-[#F6F6F4] focus:bg-[#FCFCFB] border border-[#E2E2DF] focus:border-[#006494] rounded-[3px] text-[11px] text-[#111827] placeholder:text-[#8A9096] outline-none transition-colors"
              />
              {/* Bottom Search Focus Hairline Trace */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#006494] origin-left transition-transform duration-200 ease-out ${
                  isSearchFocused ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
              <AnimatePresence mode="wait" initial={false}>
                {searchQuery ? (
                  <motion.div
                    key="clear-group"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.14, ease: PRECISION_EASE }}
                    className="absolute right-2 flex items-center gap-1"
                  >
                    <span className="text-[9.5px] font-mono tabular-nums text-[#006494] bg-[#E8F3FA] px-1 py-0.5 rounded-[2px] leading-none">
                      {filteredTabs.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        replayMasonry();
                      }}
                      className="text-[#71767B] hover:text-[#111827] p-0.5 cursor-pointer"
                      aria-label="清空搜索"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.kbd
                    key="slash-kbd"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: isSearchFocused ? 0.4 : 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-2 text-[9.5px] font-mono text-[#71767B] bg-[#FCFCFB] px-1.5 py-0.5 rounded-[2px] border border-[#E2E2DF] pointer-events-none"
                  >
                    /
                  </motion.kbd>
                )}
              </AnimatePresence>
            </div>

            <div
              ref={instanceKey === 'mobile' ? mobileCatRailRef : desktopCatRailRef}
              onWheel={(e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth"
            >
              {['all', ...categories].map((cat) => {
                const isAll = cat === 'all';
                const isActiveCat = selectedCategory === cat;
                const isScrollLinked =
                  selectedCategory === 'all' && !isAll && highlightedScrollCat === cat;
                const label = isAll ? '全部' : cat;
                return (
                  <motion.button
                    key={cat}
                    type="button"
                    data-cat-pill={cat}
                    whileTap={{ scale: 0.94 }}
                    onMouseMove={isActiveCat ? undefined : handleSpecularMove}
                    onClick={(e) => {
                      e.currentTarget.scrollIntoView({
                        behavior: 'smooth',
                        inline: 'center',
                        block: 'nearest'
                      });
                      handleSelectCategory(isActiveCat && !isAll ? 'all' : cat);
                    }}
                    className={`relative px-2 py-1 rounded-[3px] text-[10.5px] font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                      isActiveCat
                        ? 'text-white border-[#001020]'
                        : isScrollLinked
                        ? 'specular-card bg-[#E8F3FA] text-[#006494] border-[#006494]'
                        : 'specular-card bg-[#F8F8F6] hover:bg-[#EAEAE8] text-[#71767B] hover:text-[#111827] border-[#E2E2DF]'
                    }`}
                  >
                    {!isActiveCat && <span className="specular-sweep" aria-hidden="true" />}
                    {isActiveCat && (
                      <motion.span
                        layoutId={`cat-pill-${instanceKey}`}
                        transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                        className="absolute inset-0 bg-[#001020] rounded-[2px]"
                      />
                    )}
                    {isScrollLinked && (
                      <motion.span
                        layoutId={`cat-spy-${instanceKey}`}
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute bottom-0 left-1 right-1 h-[2px] bg-[#006494] rounded-full z-10"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1">
                      {isScrollLinked && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3BB4FE] shrink-0" />
                      )}
                      {label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Sequential Masonry Brick-Laying Grid */}
      <div className="flex-1 relative min-h-0 overflow-hidden bg-[#FCFCFB]">
        {/* Top Real-Time Scroll Progress Hairline */}
        {(canScrollUp || canScrollDown) && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-[#E2E2DF]/40 z-30"
          >
            <div
              className="h-full origin-left bg-gradient-to-r from-[#006494] to-[#3BB4FE] transition-transform duration-100 ease-out"
              style={{ transform: `scaleX(${Math.max(0.04, scrollPercentage / 100)})` }}
            />
          </div>
        )}

        <AnimatePresence>
          {canScrollUp && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: PRECISION_EASE }}
              onClick={() => scrollSmoothBy('up')}
              className="absolute top-1.5 right-3 h-5 px-1.5 rounded-[2px] border border-[#CCCCCC] bg-[#FCFCFB]/95 hover:bg-[#EAEAE8] shadow-xs z-20 flex items-center justify-center cursor-pointer"
              title="向上滚动"
              aria-label="向上滚动"
            >
              <ChevronUp className="w-3 h-3 text-[#006494] scroll-hint-up" />
            </motion.button>
          )}
        </AnimatePresence>

        <div
          ref={instanceKey === 'mobile' ? mobileListRef : desktopListRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          className={`h-full overflow-y-auto overflow-x-hidden custom-scrollbar touch-pan-y ${
            isCollapsed ? 'p-1.5 space-y-2' : ''
          } ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        >
          {visibleCategories.map((cat, catIdx) => {
            const catTabs = filteredTabs.filter((t) => t.category === cat);
            if (catTabs.length === 0) return null;

            const catIndex = String(categories.indexOf(cat) + 1).padStart(2, '0');
            const isCatCollapsed =
              !searchQuery && selectedCategory === 'all' && Boolean(collapsedCategories[cat]);

            if (isCollapsed) {
              return (
                <div key={cat} className="space-y-1">
                  <div className="w-full border-t border-[#E2E2DF] pt-1.5 pb-0.5 flex flex-col items-center">
                    <span className="text-[9.5px] font-mono text-[#71767B] tabular-nums">
                      {catIndex}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    {catTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = activeTab === tab.id;
                      const isPinned = pinnedTabs ? pinnedTabs.includes(tab.id) : false;
                      const accessCheck = canAccessMerchantTab(tab.id, merchantSession);
                      const isRestricted = !accessCheck.allowed;
                      const globalOrder = masonryOrderMap.get(tab.id) ?? 0;
                      const delayMs = revealedDelays[tab.id];
                      const isRevealed = delayMs !== undefined;
                      const redrawCount = hoverRedrawCounts[tab.id] || 0;

                      return (
                        <button
                          key={`${instanceKey}-rail-${animEpoch}-${tab.id}`}
                          ref={isSelected ? activeItemRef : null}
                          type="button"
                          data-brick-id={tab.id}
                          data-brick-order={globalOrder}
                          onMouseEnter={(e) => {
                            triggerIconRedraw(tab.id);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredRailItem({
                              tab,
                              index: tabIndexMap.get(tab.id) || '00',
                              top: rect.top + rect.height / 2,
                              left: rect.right + 10,
                              isRestricted,
                              isPinned
                            });
                          }}
                          onMouseLeave={() => {
                            setHoveredRailItem((curr) => (curr?.tab.id === tab.id ? null : curr));
                          }}
                          onMouseMove={handleSpecularMove}
                          onClick={() => {
                            if (dragMovedRef.current) return;
                            triggerIconRedraw(tab.id);
                            triggerClickPulse(tab.id);
                            onSelectTab(tab.id);
                            onCloseMobile();
                          }}
                          style={
                            isRevealed
                              ? ({
                                  '--brick-delay': `${delayMs}ms`,
                                  '--icon-delay': `${delayMs + 100}ms`
                                } as React.CSSProperties)
                              : undefined
                          }
                          aria-label={`${tabIndexMap.get(tab.id)} · ${tab.label}`}
                          className={`specular-card w-10 h-10 rounded-[3px] flex items-center justify-center relative transition-colors cursor-pointer select-none border ${
                            isRevealed ? 'brick-enter' : 'brick-hidden'
                          } ${
                            isSelected
                              ? 'bg-[#FCFCFB] border-transparent text-[#006494]'
                              : isRestricted
                              ? 'bg-[#F6F6F4] border-[#E2E2DF] text-[#8A9096] hover:border-[#CCCCCC]'
                              : 'bg-[#FCFCFB] border-[#E2E2DF] text-[#111827] hover:border-[#006494] hover:bg-[#F5F8FA]'
                          }`}
                        >
                          <span className="specular-sweep" aria-hidden="true" />
                          {isSelected && (
                            <motion.span
                              layoutId={`rail-active-${instanceKey}`}
                              transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                              className="absolute inset-0 rounded-[3px] pointer-events-none"
                            >
                              <svg
                                key={`rail-trace-${activeTab}`}
                                className="w-full h-full"
                                viewBox="0 0 40 40"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                              >
                                <rect
                                  x="0.75"
                                  y="0.75"
                                  width="38.5"
                                  height="38.5"
                                  rx="2.5"
                                  fill="none"
                                  stroke="#006494"
                                  strokeWidth="1.25"
                                  pathLength={1}
                                  className="svg-border-trace"
                                />
                              </svg>
                            </motion.span>
                          )}
                          <LiveStrokeIcon
                            icon={Icon}
                            wrapperClassName="relative z-10"
                            className="w-4 h-4"
                            drawKey={`${animEpoch}-${redrawCount}`}
                            paused={!isRevealed}
                            delayMs={redrawCount > 0 ? 0 : (delayMs ?? 0) + 100}
                            staggerMs={55}
                            durationMs={390}
                            breathe={isSelected}
                          />
                          {isRestricted && (
                            <Lock className="w-2.5 h-2.5 text-[#C26D00] absolute top-1 left-1 z-10" />
                          )}
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span
                              className={`absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-[2px] text-[9.5px] font-bold font-mono tabular-nums flex items-center justify-center z-10 ${
                                tab.badgeAlert
                                  ? 'bg-[#D32F2F] text-white live-alert-pulse'
                                  : 'bg-[#006494] text-white'
                              }`}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const isPinnedCat = canScrollUp && activeScrollCategory === cat;

            return (
              <section key={cat} data-cat-section={cat}>
                {/* Sticky Category Header Strip with Bar & Line Trace */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  disabled={selectedCategory !== 'all'}
                  className={`sticky top-0 z-10 w-full px-3 py-1.5 bg-[#F4F4F2]/95 backdrop-blur-xs border-b border-[#E2E2DF] ${
                    catIdx > 0 ? 'border-t' : ''
                  } ${
                    isPinnedCat ? 'sticky-header-shadow' : ''
                  } flex items-center justify-between text-left transition-all duration-150 overflow-hidden ${
                    selectedCategory === 'all' ? 'cursor-pointer hover:bg-[#EAEAE8]' : 'cursor-default'
                  }`}
                >
                  <span
                    key={`cat-line-${cat}-${animEpoch}`}
                    aria-hidden="true"
                    style={{ animationDelay: `${catIdx * 45}ms` }}
                    className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[1px] line-trace-x ${
                      isPinnedCat ? 'bg-[#006494]/60' : 'bg-[#006494]/25'
                    }`}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      key={`cat-bar-${cat}-${animEpoch}`}
                      style={{ animationDelay: `${catIdx * 45}ms` }}
                      className={`w-[3px] h-3.5 rounded-[2px] shrink-0 bar-trace-y transition-colors duration-150 ${
                        isPinnedCat ? 'bg-[#006494]' : 'bg-[#001020]'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-[#111827] truncate">
                      {cat}
                    </span>
                    <span className="text-[9.5px] font-mono uppercase text-[#71767B] truncate">
                      {CATEGORY_EN_SUBTITLES[cat] || 'MODULES'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-[#71767B] tabular-nums">
                      {String(catTabs.length).padStart(2, '0')}
                    </span>
                    {selectedCategory === 'all' && (
                      <motion.span
                        animate={{ rotate: isCatCollapsed ? -90 : 0 }}
                        transition={{ duration: 0.18, ease: PRECISION_EASE }}
                        className="inline-flex items-center justify-center"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-[#71767B]" />
                      </motion.span>
                    )}
                  </div>
                </button>

                {/* 3-Column Sequential Masonry Brick-Laying Grid with Smooth Accordion Height */}
                <AnimatePresence initial={false}>
                  {!isCatCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: PRECISION_EASE }}
                      className="overflow-hidden bg-[#FCFCFB]"
                    >
                      <div className="p-2.5 grid grid-cols-3 gap-1.5">
                        {catTabs.map((tab) => {
                          const Icon = tab.icon;
                          const isSelected = activeTab === tab.id;
                          const accessCheck = canAccessMerchantTab(tab.id, merchantSession);
                          const isRestricted = !accessCheck.allowed;
                        const isPinned = pinnedTabs ? pinnedTabs.includes(tab.id) : false;
                        const hasBadge = tab.badge !== undefined && tab.badge > 0;
                        const cellIndex = tabIndexMap.get(tab.id) || '00';
                        const globalOrder = masonryOrderMap.get(tab.id) ?? 0;

                        const delayMs = revealedDelays[tab.id];
                        const isRevealed = delayMs !== undefined;
                        const redrawCount = hoverRedrawCounts[tab.id] || 0;
                        const pulseCount = clickPulseCounts[tab.id] || 0;

                        return (
                          <div
                            key={`${instanceKey}-${animEpoch}-${selectedCategory}-${tab.id}`}
                            data-brick-id={tab.id}
                            data-brick-order={globalOrder}
                            onMouseEnter={() => {
                              if (!isDragging) triggerIconRedraw(tab.id);
                            }}
                            style={
                              isRevealed
                                ? ({
                                    '--brick-delay': `${delayMs}ms`,
                                    '--icon-delay': `${delayMs + 120}ms`
                                  } as React.CSSProperties)
                                : undefined
                            }
                            className={`relative group ${isRevealed ? 'brick-enter' : 'brick-hidden'}`}
                          >
                            <motion.button
                              ref={isSelected ? activeItemRef : null}
                              type="button"
                              whileHover={isDragging ? undefined : { y: -2 }}
                              whileTap={isDragging ? undefined : { scale: 0.95 }}
                              transition={{ duration: 0.14, ease: PRECISION_EASE }}
                              onMouseMove={isDragging ? undefined : handleSpecularMove}
                              onClick={() => {
                                if (dragMovedRef.current) return;
                                triggerIconRedraw(tab.id);
                                triggerClickPulse(tab.id);
                                onSelectTab(tab.id);
                                onCloseMobile();
                              }}
                              title={`${cellIndex} · ${tab.label} · ${tab.category}${
                                isRestricted ? '（已锁定：需更高权限或店长放行）' : ''
                              }`}
                              className={`specular-card w-full h-[68px] rounded-[3px] border flex flex-col items-center justify-between px-1.5 pt-1.5 pb-2 transition-colors duration-150 cursor-pointer select-none relative overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#006494] ${
                                isSelected
                                  ? 'bg-[#FCFCFB] border-transparent'
                                  : isRestricted
                                  ? 'bg-[#F6F6F4] border-[#E2E2DF] hover:border-[#CCCCCC]'
                                  : 'bg-[#FCFCFB] border-[#E2E2DF] hover:border-[#006494]/70 hover:bg-[#F5F8FA]'
                              }`}
                            >
                              {/* Specular Diagonal Mirror Sheen */}
                              <span className="specular-sweep" aria-hidden="true" />
                              {/* Click Precision Confirmation Pulse */}
                              {pulseCount > 0 && (
                                <span
                                  key={`pulse-${pulseCount}`}
                                  aria-hidden="true"
                                  className="pointer-events-none absolute inset-0 rounded-[3px] border border-[#3BB4FE] click-ripple-ring z-20"
                                />
                              )}
                              {/* Hover Top Hairline Trace */}
                              {!isSelected && (
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px] bg-[#006494]/65 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-200 ease-out"
                                />
                              )}

                              {/* Shared Gliding Active Frame + Real-Time SVG Perimeter Path Trace */}
                              {isSelected && (
                                <motion.span
                                  layoutId={`active-card-ring-${instanceKey}`}
                                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                                  className="absolute inset-0 rounded-[3px] pointer-events-none"
                                  style={{ boxShadow: '0 2px 6px rgba(0, 100, 148, 0.14)' }}
                                >
                                  <svg
                                    key={`card-trace-${activeTab}-${animEpoch}`}
                                    className="w-full h-full"
                                    viewBox="0 0 100 68"
                                    preserveAspectRatio="none"
                                    aria-hidden="true"
                                  >
                                    <rect
                                      x="0.75"
                                      y="0.75"
                                      width="98.5"
                                      height="66.5"
                                      rx="2.5"
                                      fill="none"
                                      stroke="#006494"
                                      strokeWidth="1.25"
                                      vectorEffect="non-scaling-stroke"
                                      pathLength={1}
                                      className="svg-border-trace"
                                    />
                                  </svg>
                                  <span className="absolute top-0 left-0 w-1/2 h-[1.5px] bg-gradient-to-r from-transparent via-[#3BB4FE] to-transparent live-scan-shimmer" />
                                </motion.span>
                              )}

                              {/* Top Row: Index + Living Sky Beacon */}
                              <div className="w-full flex items-center justify-between leading-none relative z-10">
                                <span
                                  className={`px-1 py-0.5 rounded-[2px] font-mono text-[9.5px] font-bold leading-none tabular-nums transition-colors duration-150 ${
                                    isSelected
                                      ? 'bg-[#001020] text-white'
                                      : isRestricted
                                      ? 'text-[#8A9096]'
                                      : 'text-[#71767B]'
                                  }`}
                                >
                                  {cellIndex}
                                </span>

                                {isSelected && !hasBadge && !isPinned && (
                                  <span className="relative flex items-center justify-center w-2 h-2 shrink-0 group-hover:opacity-0 transition-opacity">
                                    <span className="absolute inset-0 rounded-full bg-[#3BB4FE] live-beacon-ring" />
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-[#3BB4FE]"
                                      style={{ boxShadow: '0 0 6px rgba(59, 180, 254, 0.7)' }}
                                    />
                                  </span>
                                )}
                              </div>

                              {/* Center Live-Drawing Vector Stroke Icon */}
                              <LiveStrokeIcon
                                icon={Icon}
                                wrapperClassName="relative z-10"
                                className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                  isSelected
                                    ? 'text-[#006494]'
                                    : isRestricted
                                    ? 'text-[#8A9096]'
                                    : 'text-[#111827] group-hover:text-[#006494]'
                                }`}
                                drawKey={`${animEpoch}-${redrawCount}`}
                                paused={!isRevealed}
                                delayMs={redrawCount > 0 ? 0 : (delayMs ?? 0) + 110}
                                staggerMs={58}
                                durationMs={410}
                                accentTrace={!isRestricted}
                                breathe={isSelected}
                              />

                              {/* Bottom Label */}
                              <span
                                className={`w-full text-center text-[11px] leading-tight truncate transition-colors duration-150 relative z-10 ${
                                  isSelected
                                    ? 'font-bold text-[#006494]'
                                    : isRestricted
                                    ? 'font-normal text-[#8A9096]'
                                    : 'font-semibold text-[#111827]'
                                }`}
                              >
                                {tab.label}
                              </span>
                            </motion.button>

                            {/* Lock Glyph */}
                            {isRestricted && !hasBadge && !isPinned && (
                              <span
                                title="岗位受限: 需更高权限或店长临时放行"
                                className={`pointer-events-none absolute top-1.5 right-1.5 z-20 flex items-center justify-center ${
                                  onTogglePinTab ? 'group-hover:opacity-0 transition-opacity' : ''
                                } text-[#C26D00]`}
                              >
                                <Lock className="w-2.5 h-2.5" />
                              </span>
                            )}

                            {isRestricted && (isPinned || hasBadge) && (
                              <span
                                title="岗位受限"
                                className="pointer-events-none absolute top-1.5 left-6 z-20 text-[#C26D00]"
                              >
                                <Lock className="w-2.5 h-2.5" />
                              </span>
                            )}

                            {/* Numeric Badge */}
                            {hasBadge && (
                              <span
                                className={`pointer-events-none absolute top-1.5 right-1.5 z-20 px-1 min-w-[15px] h-3.5 rounded-[2px] text-[9.5px] font-mono tabular-nums font-bold flex items-center justify-center transition-opacity ${
                                  onTogglePinTab ? 'group-hover:opacity-0' : ''
                                } ${
                                  tab.badgeAlert
                                    ? 'bg-[#D32F2F] text-white live-alert-pulse'
                                    : isSelected
                                    ? 'bg-[#006494] text-white'
                                    : 'bg-[#EAEAE8] text-[#111827]'
                                }`}
                              >
                                {tab.badge}
                              </span>
                            )}

                            {/* Pin Toggle with Spring Lock Rotation */}
                            {onTogglePinTab && (
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.82 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePinTab(tab.id);
                                }}
                                className={`absolute top-1 right-1 z-20 w-4 h-4 rounded-[2px] flex items-center justify-center transition-opacity cursor-pointer ${
                                  isPinned
                                    ? hasBadge
                                      ? 'opacity-0 group-hover:opacity-100'
                                      : 'opacity-100'
                                    : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                                } ${
                                  isPinned
                                    ? 'text-[#006494] bg-[#E8F3FA] border border-[#006494]/40'
                                    : 'text-[#71767B] hover:text-[#111827] hover:bg-[#EAEAE8]'
                                }`}
                                title={isPinned ? '取消固定常用模块' : '固定到顶部快捷栏'}
                                aria-label={isPinned ? '取消固定' : '固定到顶部快捷栏'}
                              >
                                <motion.span
                                  animate={{
                                    rotate: isPinned ? 0 : 45,
                                    scale: isPinned ? [1, 1.25, 1] : 1
                                  }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                                  className="inline-flex items-center justify-center"
                                >
                                  <Pin className={`w-2.5 h-2.5 ${isPinned ? 'fill-current' : ''}`} />
                                </motion.span>
                              </motion.button>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            );
          })}

          {filteredTabs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: PRECISION_EASE }}
              className="m-3 py-8 px-3 text-center space-y-2 border border-[#E2E2DF] bg-[#F8F8F6] rounded-[3px] flex flex-col items-center"
            >
              <LiveStrokeIcon
                icon={Search}
                className="w-5 h-5 text-[#8A9096]"
                drawKey={searchQuery}
                durationMs={380}
              />
              <p className="text-[11px] text-[#71767B]">
                未找到匹配「{searchQuery}」的功能模块
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  handleSelectCategory('all');
                }}
                className="text-[11px] font-bold text-[#006494] hover:underline underline-offset-2 cursor-pointer"
              >
                重置筛选
              </button>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {canScrollDown && (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20">
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16, ease: PRECISION_EASE }}
                onClick={() => scrollSmoothBy('down')}
                className="h-5 px-2.5 rounded-[2px] border border-[#CCCCCC] bg-[#FCFCFB]/95 hover:bg-[#EAEAE8] shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                title="向下滚动查看更多模块"
                aria-label="向下滚动"
              >
                <ChevronDown className="w-3 h-3 text-[#006494] scroll-hint-down" />
              </motion.button>
            </div>
          )}
        </AnimatePresence>

        {/* Precision Proportional Scroll Indicator Rail */}
        <AnimatePresence>
          {(isScrollingActive || isDragging) && (
            <motion.div
              initial={{ opacity: 0, x: 3 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 3 }}
              transition={{ duration: 0.16, ease: PRECISION_EASE }}
              className="absolute right-1 top-2 bottom-2 w-[3px] bg-[#EAEAE8] rounded-full overflow-hidden pointer-events-none z-30"
            >
              <div
                className={`absolute left-0 right-0 rounded-full transition-[top,background-color] duration-75 ${
                  isDragging
                    ? 'bg-[#3BB4FE] scroll-thumb-glow'
                    : 'bg-[#006494] scroll-thumb-glow'
                }`}
                style={{
                  height: `${scrollThumbMetrics.heightPct}%`,
                  top: `${scrollThumbMetrics.topPct}%`
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Bottom Status Strip */}
      <div className={`${isCollapsed ? 'px-2' : 'px-3'} py-2 border-t border-[#E2E2DF] bg-[#F8F8F6] shrink-0`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <AnimatePresence mode="wait">
              <motion.button
                key={activeTabConfig.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  triggerIconRedraw(activeTabConfig.id);
                  triggerClickPulse(activeTabConfig.id);
                }}
                title="点击定位并聚焦当前激活模块"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: PRECISION_EASE }}
                className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 text-left"
              >
                <span className="px-1.5 py-0.5 rounded-[2px] bg-[#001020] text-white font-mono text-[9.5px] font-bold tabular-nums shrink-0">
                  {tabIndexMap.get(activeTabConfig.id)}
                </span>
                <span className="truncate font-bold text-[#111827]">
                  {activeTabConfig.label}
                </span>
              </motion.button>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {totalUrgentBadges > 0 ? (
                <motion.span
                  key={`urgent-${totalUrgentBadges}`}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.14 }}
                  className="text-[#D32F2F] font-mono text-[10px] font-bold tabular-nums shrink-0 inline-flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F] live-alert-pulse" />
                  {totalUrgentBadges} 待处理
                </motion.span>
              ) : (
                <motion.span
                  key={`${activeTabConfig.id}-${activeAccessCheck.allowed}`}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.14 }}
                  className={`font-mono text-[10px] font-bold uppercase shrink-0 inline-flex items-center gap-1.5 ${
                    activeAccessCheck.allowed ? 'text-[#006494]' : 'text-[#C26D00]'
                  }`}
                >
                  <span className="relative flex items-center justify-center w-1.5 h-1.5">
                    {activeAccessCheck.allowed && (
                      <span className="absolute inset-0 rounded-full bg-[#3BB4FE] live-beacon-ring" />
                    )}
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeAccessCheck.allowed ? 'bg-[#3BB4FE]' : 'bg-[#C26D00]'
                      }`}
                    />
                  </span>
                  {activeAccessCheck.allowed
                    ? `ONLINE 0x${tabIndexMap.get(activeTabConfig.id)}`
                    : `HALTED 0x00`}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex justify-center">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                onToggleCollapse();
                replayMasonry();
              }}
              className="w-10 h-7 bg-[#FCFCFB] hover:bg-[#EAEAE8] border border-[#E2E2DF] rounded-[3px] flex items-center justify-center gap-1 cursor-pointer"
              title={`${tabIndexMap.get(activeTabConfig.id)} · ${activeTabConfig.label}（点击展开导航）`}
              aria-label="展开侧边栏"
            >
              <span className="px-1 py-0.5 rounded-[2px] bg-[#001020] text-white font-mono text-[9.5px] font-bold leading-none tabular-nums">
                {tabIndexMap.get(activeTabConfig.id)}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeAccessCheck.allowed ? 'bg-[#3BB4FE]' : 'bg-[#C26D00]'
                }`}
              />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="never">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 64 : 300 }}
        transition={{ duration: 0.22, ease: PRECISION_EASE }}
        className="hidden md:flex flex-col shrink-0 h-full z-30 border-r border-[#CCCCCC] bg-[#FCFCFB] overflow-hidden"
      >
        {renderSidebarBody('desktop')}
      </motion.aside>

      {/* Collapsed Rail Precision Floating Tooltip */}
      <AnimatePresence>
        {isCollapsed && hoveredRailItem && (
          <div
            style={{
              top: hoveredRailItem.top,
              left: hoveredRailItem.left,
              transform: 'translateY(-50%)'
            }}
            className="hidden md:block fixed z-50 pointer-events-none"
          >
            <motion.div
              key={hoveredRailItem.tab.id}
              initial={{ opacity: 0, x: -6, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -4, scale: 0.96 }}
              transition={{ duration: 0.14, ease: PRECISION_EASE }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] border border-[#CCCCCC] bg-[#FCFCFB] shadow-sm whitespace-nowrap"
            >
              <span className="px-1 py-0.5 rounded-[2px] bg-[#001020] text-white font-mono text-[9.5px] font-bold leading-none tabular-nums">
                {hoveredRailItem.index}
              </span>
              <div className="leading-tight">
                <div className="text-[11px] font-bold text-[#111827] flex items-center gap-1.5">
                  <span>{hoveredRailItem.tab.label}</span>
                  {hoveredRailItem.isRestricted && (
                    <span className="text-[9.5px] font-normal text-[#C26D00]">受限</span>
                  )}
                  {hoveredRailItem.isPinned && (
                    <span className="text-[9.5px] font-normal text-[#006494]">已置顶</span>
                  )}
                </div>
                <div className="text-[9.5px] text-[#71767B]">
                  {hoveredRailItem.tab.category}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Slide-Out Drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              className="relative w-[300px] max-w-[90vw] h-full shadow-xl z-10 bg-[#FCFCFB]"
            >
              {renderSidebarBody('mobile')}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
};
