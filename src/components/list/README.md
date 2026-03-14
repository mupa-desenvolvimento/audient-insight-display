# Padrão de Páginas de Listagem

Todas as páginas de listagem devem seguir o mesmo padrão usando os componentes compartilhados abaixo.

## Componentes

| Componente | Caminho | Descrição |
|---|---|---|
| `PageShell` | `@/components/layout/PageShell` | Layout da página com header, controls, content e footer |
| `ListControls` | `@/components/list/ListControls` | Barra de busca + filtros + toggle lista/grade |
| `ListViewport` | `@/components/list/ListViewport` | Área de conteúdo com scroll |
| `UniversalPagination` | `@/components/list/UniversalPagination` | Paginação universal |
| `useListState` | `@/hooks/useListState` | Hook de estado (view, page, search, filters, sort) |

## Template Mínimo

```tsx
import { useMemo } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ListViewport } from "@/components/list/ListViewport";
import { ListControls } from "@/components/list/ListControls";
import { UniversalPagination } from "@/components/list/UniversalPagination";
import { useListState } from "@/hooks/useListState";

type StatusFilter = "all" | "active" | "inactive";

interface MyFilters {
  status: StatusFilter;
}

export default function MyPage() {
  const { state, setView, setPage, setPageSize, setSearch, setFilters, reset } =
    useListState<MyFilters>({
      initialFilters: { status: "all" },
      initialPageSize: 12,
    });

  // 1. Filtrar dados
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesTerm = !state.search || item.name.toLowerCase().includes(state.search.toLowerCase());
      const matchesStatus = state.filters.status === "all" || item.status === state.filters.status;
      return matchesTerm && matchesStatus;
    });
  }, [items, state.search, state.filters]);

  // 2. Paginar
  const total = filtered.length;
  const startIndex = (state.page - 1) * state.pageSize;
  const paginated = filtered.slice(startIndex, startIndex + state.pageSize);

  return (
    <PageShell
      className="animate-fade-in"
      header={
        <div className="flex items-center justify-between gap-4 py-4">
          <p className="text-muted-foreground">Descrição da página</p>
          <Button>Ação Principal</Button>
        </div>
      }
      controls={
        <div className="py-2">
          <ListControls
            state={state}
            onSearchChange={setSearch}
            onViewChange={setView}
            onClearFilters={reset}
          >
            {/* Filtros personalizados aqui */}
          </ListControls>
        </div>
      }
      footer={
        <UniversalPagination
          page={state.page}
          pageSize={state.pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      }
    >
      <ListViewport>
        {state.view === "list" ? (
          {/* Renderizar tabela */}
        ) : (
          {/* Renderizar grid de cards */}
        )}
      </ListViewport>
    </PageShell>
  );
}
```

## Regras

1. **Sempre** usar `PageShell` como wrapper principal
2. **Sempre** incluir toggle lista/grade via `ListControls`
3. **Sempre** incluir paginação via `UniversalPagination`
4. **Nunca** perder botões/ações ao alternar entre lista e grade
5. **Sempre** usar `useMemo` para filtros e `useListState` para estado
6. Grid view: Cards com ações. List view: Table com as mesmas ações
7. Empty state: Ícone + mensagem + botão de ação quando aplicável
8. Loading state: Loader centralizado com `Loader2` do lucide
