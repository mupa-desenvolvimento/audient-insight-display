import { useLocation } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";

export type ViewMode = "list" | "grid";

export type SortDirection = "asc" | "desc";

export type ListSort = {
  key: string;
  dir: SortDirection;
};

export type ListState<F> = {
  view: ViewMode;
  page: number;
  pageSize: number;
  search: string;
  filters: F;
  sort?: ListSort;
};

interface UseListStateOptions<F> {
  initialFilters: F;
  initialPage?: number;
  initialPageSize?: number;
  initialSearch?: string;
  initialSort?: ListSort;
  storageKeyOverride?: string;
}

export const useListState = <F,>({
  initialFilters,
  initialPage = 1,
  initialPageSize = 10,
  initialSearch = "",
  initialSort,
  storageKeyOverride,
}: UseListStateOptions<F>) => {
  const location = useLocation();

  const viewStorageKey = useMemo(() => {
    if (storageKeyOverride) return storageKeyOverride;
    return `list:view:${location.pathname}`;
  }, [location.pathname, storageKeyOverride]);

  const [view, setViewState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    const stored = window.localStorage.getItem(viewStorageKey);
    return stored === "grid" || stored === "list" ? stored : "list";
  });

  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [search, setSearchState] = useState(initialSearch);
  const [filters, setFiltersState] = useState<F>(initialFilters);
  const [sort, setSortState] = useState<ListSort | undefined>(initialSort);

  const setView = useCallback(
    (next: ViewMode) => {
      setViewState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(viewStorageKey, next);
      }
    },
    [viewStorageKey]
  );

  const setPage = useCallback((next: number) => {
    setPageState(next < 1 ? 1 : next);
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageState(1);
    setPageSizeState(next);
  }, []);

  const setSearch = useCallback((next: string) => {
    setPageState(1);
    setSearchState(next);
  }, []);

  const setFilters = useCallback((next: F) => {
    setPageState(1);
    setFiltersState(next);
  }, []);

  const setSort = useCallback((next: ListSort | undefined) => {
    setPageState(1);
    setSortState(next);
  }, []);

  const reset = useCallback(() => {
    setPageState(initialPage);
    setPageSizeState(initialPageSize);
    setSearchState(initialSearch);
    setFiltersState(initialFilters);
    setSortState(initialSort);
  }, [initialFilters, initialPage, initialPageSize, initialSearch, initialSort]);

  const state: ListState<F> = {
    view,
    page,
    pageSize,
    search,
    filters,
    sort,
  };

  return {
    state,
    setView,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    setSort,
    reset,
  };
};

