import { useMemo } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ListControls } from "@/components/list/ListControls";
import { ListViewport } from "@/components/list/ListViewport";
import { UniversalPagination } from "@/components/list/UniversalPagination";
import { useListState } from "@/hooks/useListState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ExampleStatus = "active" | "inactive";

interface ExampleItem {
  id: number;
  name: string;
  status: ExampleStatus;
  category: string;
  createdAt: string;
}

interface ExampleFilters {
  status: "all" | ExampleStatus;
}

const MOCK_ITEMS: ExampleItem[] = Array.from({ length: 48 }).map((_, index) => {
  const id = index + 1;
  const isActive = id % 3 !== 0;
  const categoryIndex = id % 4;
  const category =
    categoryIndex === 0
      ? "Display"
      : categoryIndex === 1
      ? "Campanha"
      : categoryIndex === 2
      ? "Promoção"
      : "Institucional";

  return {
    id,
    name: `Item ${id.toString().padStart(2, "0")}`,
    status: isActive ? "active" : "inactive",
    category,
    createdAt: new Date(Date.now() - id * 86400000).toISOString(),
  };
});

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString("pt-BR");
};

const ExampleListPage = () => {
  const { state, setView, setPage, setPageSize, setSearch, setFilters, reset } = useListState<ExampleFilters>({
    initialFilters: {
      status: "all",
    },
    initialPageSize: 10,
  });

  const filteredItems = useMemo(() => {
    const searchLower = state.search.toLowerCase();

    return MOCK_ITEMS.filter((item) => {
      const matchesSearch =
        searchLower.length === 0 ||
        item.name.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower);

      const matchesStatus =
        state.filters.status === "all" ? true : item.status === state.filters.status;

      return matchesSearch && matchesStatus;
    });
  }, [state.search, state.filters]);

  const { pageItems, total } = useMemo(() => {
    const totalItems = filteredItems.length;
    const startIndex = (state.page - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    const itemsSlice = filteredItems.slice(startIndex, endIndex);

    return {
      pageItems: itemsSlice,
      total: totalItems,
    };
  }, [filteredItems, state.page, state.pageSize]);

  const handleClearFilters = () => {
    reset();
  };

  const header = (
    <div className="px-4 pt-3 pb-2">
      <p className="text-muted-foreground">
        Exemplo de listagem com padrão global de controles, scroll e paginação
      </p>
    </div>
  );

  const controls = (
    <div className="px-4 pb-2">
      <ListControls
        state={state}
        onSearchChange={setSearch}
        onViewChange={setView}
        onClearFilters={handleClearFilters}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <Select
            value={state.filters.status}
            onValueChange={(value) =>
              setFilters({
                status: value as ExampleFilters["status"],
              })
            }
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ListControls>
    </div>
  );

  const footer = (
    <UniversalPagination
      page={state.page}
      pageSize={state.pageSize}
      total={total}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );

  const isLoading = false;
  const hasError = false;

  let content: JSX.Element;

  if (isLoading) {
    content = (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Carregando dados de exemplo...
      </div>
    );
  } else if (hasError) {
    content = (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Erro ao carregar dados</CardTitle>
            <CardDescription>
              Não foi possível carregar a lista de itens. Tente novamente mais tarde.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  } else if (total === 0) {
    content = (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Nenhum resultado encontrado</CardTitle>
            <CardDescription>
              Ajuste a busca ou os filtros para encontrar itens.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  } else if (state.view === "list") {
    content = (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Visualização em lista</CardTitle>
          <CardDescription>Exibe os itens em formato de tabela</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "active" ? "default" : "secondary"}>
                      {item.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                </TableRow>
            ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  } else {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pageItems.map((item) => (
          <Card key={item.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{item.name}</CardTitle>
                <Badge variant={item.status === "active" ? "default" : "secondary"}>
                  {item.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <CardDescription>{item.category}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0 text-xs text-muted-foreground">
              Criado em {formatDate(item.createdAt)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <PageShell header={header} controls={controls} footer={footer}>
      <ListViewport>
        {content}
      </ListViewport>
    </PageShell>
  );
};

export default ExampleListPage;
