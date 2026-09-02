/**
 * CommandSearchBar
 *
 * Universal Cmd+K-style command & navigation search bar for top nav.
 * Fully supports route pages, modal actions, and dynamic employee search
 * with full keyboard navigation across all items.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Search, X, Zap, LayoutGrid, Users } from "lucide-react";

import useDebounce from "../../hooks/useDebounce";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { useSearchEmployees, useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useGlobalModal, GlobalModalKey } from "../../context/GlobalModalContext";
import SearchCard from "../Employee/SearchCard";
import { Employee } from "../../types/employee";
import { UiPermissionModule } from "../../services/permissionService";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StaticSearchItem {
  id: string;
  label: string;
  description: string; // "Module › Page"
  category: "page" | "action-route" | "action-modal";
  url?: string;
  modal_key?: string;
  searchTerms: string;
}

type FlatKeyboardItem =
  | { type: "static"; item: StaticSearchItem }
  | { type: "employee"; employee: Employee };

// ─── Pure helpers ────────────────────────────────────────────────────────────

function buildStaticItems(modules: UiPermissionModule[]): StaticSearchItem[] {
  const items: StaticSearchItem[] = [];

  for (const mod of modules) {
    // ── Page entries ──────────────────────────────────────────────────────
    for (const page of mod.pages) {
      if (!page.enabled) continue;
      if (!page.url && !page.modal_key) continue;

      const label = page.page_name;
      const desc = mod.app_name;

      items.push({
        id: `page::${mod.app_name}::${page.page_name}`,
        label,
        description: desc,
        category: page.modal_key ? "action-modal" : "page",
        url: page.url,
        modal_key: page.modal_key,
        searchTerms: `${label} ${desc} ${mod.app_name}`.toLowerCase(),
      });
    }

    // ── Action entries ────────────────────────────────────────────────────
    for (const page of mod.pages) {
      for (const action of page.actions) {
        if (!action.enabled) continue;
        if (!action.url && !action.modal_key) continue;

        const label = action.label || action.action_name.replace(/_/g, " ");
        const desc = `${mod.app_name} › ${page.page_name}`;

        items.push({
          id: `action::${page.page_name}::${action.action_name}`,
          label,
          description: desc,
          category: action.modal_key ? "action-modal" : "action-route",
          url: action.url,
          modal_key: action.modal_key,
          searchTerms: `${label} ${desc} ${action.action_name}`.toLowerCase(),
        });
      }
    }
  }
  return items;
}

function filterItems(
  query: string,
  items: StaticSearchItem[],
): StaticSearchItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const tokens = clean.split(/\s+/).filter(Boolean);
  const exact: StaticSearchItem[] = [];
  const partial: StaticSearchItem[] = [];

  for (const item of items) {
    const labelLower = item.label.toLowerCase();

    if (labelLower.startsWith(clean)) {
      exact.push(item);
      continue;
    }

    const matchesAllTokens = tokens.every((token) =>
      item.searchTerms.includes(token),
    );

    if (matchesAllTokens) {
      partial.push(item);
    }
  }

  return [...exact, ...partial];
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="flex items-center gap-3 px-3 py-2 animate-pulse">
    <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
    <div className="flex-1 space-y-1.5 min-w-0">
      <div className="h-3.5 bg-gray-200 rounded w-2/5" />
      <div className="h-2.5 bg-gray-100 rounded w-1/3" />
    </div>
  </div>
);

// ─── Result row ──────────────────────────────────────────────────────────────

const ResultRow: React.FC<{
  item: StaticSearchItem;
  active: boolean;
  onSelect: () => void;
}> = ({ item, active, onSelect }) => {
  const Icon =
    item.category === "page"
      ? LayoutGrid
      : item.category === "action-modal"
        ? Zap
        : ArrowRight;

  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        active
          ? "bg-primary-50 text-primary-700 font-medium"
          : "hover:bg-gray-50 text-gray-800"
      }`}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
    >
      <span
        className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-lg ${
          item.category === "page"
            ? "bg-primary-100 text-primary-600"
            : item.category === "action-modal"
              ? "bg-amber-100 text-amber-600"
              : "bg-emerald-100 text-emerald-600"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium leading-tight truncate">
          {item.label}
        </span>
        <span className="block text-xs text-gray-500 truncate mt-0.5">
          {item.description}
        </span>
      </span>
      {item.category === "action-modal" && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-200 shrink-0">
          Modal
        </span>
      )}
    </button>
  );
};

// ─── Section header ──────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  label: string;
}> = ({ icon, label }) => (
  <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 border-b border-gray-100 mb-1">
    <span className="text-gray-400">{icon}</span>
    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
      {label}
    </span>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

const CommandSearchBar: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<Employee[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { openGlobalModal } = useGlobalModal();
  const { setTargetEmployee } = useTargetUser();
  const { isDesktop } = useScreenSize();
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });

  const debouncedQuery = useDebounce(query, 250);

  const { data: allPermissions } = useGetUiPermission();
  const { data: employees, isLoading: empLoading } = useSearchEmployees(
    debouncedQuery.split(" ").join(","),
  );

  // ── Build static items from permission data ──────────────────────────────
  const staticItems = useMemo(
    () => buildStaticItems(allPermissions ?? []),
    [allPermissions],
  );

  const filteredStatic = useMemo(
    () => filterItems(debouncedQuery, staticItems),
    [debouncedQuery, staticItems],
  );

  const pageItems = filteredStatic.filter((i) => i.category === "page");
  const actionItems = filteredStatic.filter((i) => i.category !== "page");
  const hasQuery = debouncedQuery.trim().length > 0;

  // ── All items flattened for unified keyboard navigation ─────────────────
  const allFlatItems: FlatKeyboardItem[] = useMemo(() => {
    if (hasQuery) {
      const items: FlatKeyboardItem[] = [
        ...pageItems.map((item) => ({ type: "static" as const, item })),
        ...actionItems.map((item) => ({ type: "static" as const, item })),
      ];
      if (employees && employees.length > 0) {
        items.push(
          ...employees.map((employee) => ({
            type: "employee" as const,
            employee,
          })),
        );
      }
      return items;
    } else {
      return recentSearches.map((employee) => ({
        type: "employee" as const,
        employee,
      }));
    }
  }, [hasQuery, pageItems, actionItems, employees, recentSearches]);

  const totalKeyboardItems = allFlatItems.length;

  // ── Recent employee searches ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const parsed = JSON.parse(
        sessionStorage.getItem("recentSearches") || "[]",
      );
      if (Array.isArray(parsed)) setRecentSearches(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  // ── Keyboard shortcut Ctrl/Cmd + K ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Close on route change ─────────────────────────────────────────────────
  useEffect(() => {
    setIsOpen(false);
    setQuery("");
  }, [location.pathname]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  // ── Reset active index when results change ────────────────────────────────
  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  // ── Selection handlers ────────────────────────────────────────────────────
  const handleSelectStatic = useCallback(
    (item: StaticSearchItem) => {
      if (item.category === "action-modal" && item.modal_key) {
        openGlobalModal(item.modal_key as GlobalModalKey);
      } else if (item.url) {
        navigate(item.url);
      }
      setIsOpen(false);
      setQuery("");
    },
    [navigate, openGlobalModal],
  );

  const handleSelectEmployee = useCallback(
    (emp: Employee) => {
      let searches: Employee[] = [];
      try {
        searches = JSON.parse(sessionStorage.getItem("recentSearches") || "[]");
      } catch {
        /* ignore */
      }
      searches = searches.filter(
        (d) =>
          d.employee_name?.toLowerCase() !== emp.employee_name?.toLowerCase(),
      );
      searches.unshift(emp);
      const trimmed = searches.slice(0, 7);
      sessionStorage.setItem("recentSearches", JSON.stringify(trimmed));
      setRecentSearches(trimmed);

      if (currentEmployee?.name === emp.employee_id) {
        navigate("/webapp/employee-profile");
      } else {
        setTargetEmployee(
          emp.employee_id ?? emp.employee ?? null,
          "/webapp/employee-profile",
          isDesktop,
        );
      }
      setIsOpen(false);
      setQuery("");
    },
    [currentEmployee, navigate, setTargetEmployee, isDesktop],
  );

  const removeRecentSearch = useCallback((idx: number) => {
    setRecentSearches((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      sessionStorage.setItem("recentSearches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleClearQuery = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuery("");
    inputRef.current?.focus();
  }, []);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, totalKeyboardItems - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const current = allFlatItems[activeIndex];
      if (!current) return;

      if (current.type === "static") {
        handleSelectStatic(current.item);
      } else if (current.type === "employee") {
        handleSelectEmployee(current.employee);
      }
    }
  };

  // ── Calculate active index offsets for sections ───────────────────────────
  const employeeStartIndex = pageItems.length + actionItems.length;
  const activeEmployeeIdx =
    hasQuery && activeIndex >= employeeStartIndex
      ? activeIndex - employeeStartIndex
      : !hasQuery
        ? activeIndex
        : undefined;

  return (
    <div
      className="w-full sm:max-w-[480px] md:max-w-[540px] min-w-0 flex flex-col relative z-50"
      ref={containerRef}
    >
      {/* ── Compact Search Input ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 bg-white rounded-xl px-3.5 h-11 border border-gray-200/90 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all cursor-text w-full"
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        <Search className="text-gray-400 w-4 h-4 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          id="command-search"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search pages, actions, members…"
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          autoComplete="off"
          inputMode="search"
          aria-label="Global command search"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />

        {query ? (
          <button
            type="button"
            onMouseDown={handleClearQuery}
            onTouchStart={handleClearQuery}
            onClick={handleClearQuery}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 shrink-0 font-mono">
            ⌘K
          </kbd>
        )}
      </div>

      {/* ── Dropdown Panel ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 w-full bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
          aria-label="Search results"
        >
          <div className="max-h-[min(460px,70vh)] overflow-y-auto p-1.5 divide-y divide-gray-100 custom-scrollbar">
            {/* ── No query: show recent searches ────────────────────────── */}
            {!hasQuery && (
              <div className="py-1">
                {recentSearches.length > 0 ? (
                  <>
                    <SectionHeader
                      icon={<Users className="h-3 w-3" />}
                      label="Recent Searches"
                    />
                    <div className="px-0.5">
                      <SearchCard
                        employees={recentSearches}
                        onRemove={removeRecentSearch}
                        showRemove
                        activeIdx={activeEmployeeIdx}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-sm text-gray-400 py-6 px-4">
                    <p className="text-xs text-gray-400">
                      Search members, pages, or quick actions
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Has query: show grouped results ───────────────────────── */}
            {hasQuery && (
              <>
                {/* Pages Group */}
                {pageItems.length > 0 && (
                  <div className="py-1">
                    <SectionHeader
                      icon={<LayoutGrid className="h-3 w-3" />}
                      label="Pages"
                    />
                    <div className="space-y-0.5">
                      {pageItems.map((item, idx) => (
                        <ResultRow
                          key={item.id}
                          item={item}
                          active={activeIndex === idx}
                          onSelect={() => handleSelectStatic(item)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Group */}
                {actionItems.length > 0 && (
                  <div className="py-1">
                    <SectionHeader
                      icon={<Zap className="h-3 w-3" />}
                      label="Actions"
                    />
                    <div className="space-y-0.5">
                      {actionItems.map((item, idx) => (
                        <ResultRow
                          key={item.id}
                          item={item}
                          active={activeIndex === pageItems.length + idx}
                          onSelect={() => handleSelectStatic(item)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Employees Group */}
                {(empLoading || (employees && employees.length > 0)) && (
                  <div className="py-1">
                    <SectionHeader
                      icon={<Users className="h-3 w-3" />}
                      label="Employees"
                    />
                    {empLoading ? (
                      <div className="space-y-1">
                        <Skeleton />
                        <Skeleton />
                      </div>
                    ) : (
                      <div className="px-0.5">
                        <SearchCard
                          employees={employees!}
                          onRemove={removeRecentSearch}
                          activeIdx={activeEmployeeIdx}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {!empLoading &&
                  pageItems.length === 0 &&
                  actionItems.length === 0 &&
                  (!employees || employees.length === 0) && (
                    <div className="text-center text-sm text-gray-400 py-6">
                      No results for &ldquo;<span className="text-gray-700 font-medium">{query}</span>&rdquo;
                    </div>
                  )}
              </>
            )}
          </div>

          {/* ── Footer Navigation Hints ────────────────────────────────────── */}
          <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-1.5 flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-white px-1 rounded border border-gray-200">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-white px-1 rounded border border-gray-200">↵</kbd> select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-white px-1 rounded border border-gray-200">Esc</kbd> close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandSearchBar;
