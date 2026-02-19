import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { ListControls } from "@/components/list/ListControls";
import { ListViewport } from "@/components/list/ListViewport";
import { UniversalPagination } from "@/components/list/UniversalPagination";
import { useListState } from "@/hooks/useListState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutoContent, AutoContentType } from "@/hooks/useAutoContent";

type StatusFilter = "all" | "active" | "inactive";

interface AutoContentFilters {
  status: StatusFilter;
}

const AUTO_CONTENT_TYPES: AutoContentType[] = [
  "weather",
  "news",
  "quote",
  "curiosity",
  "birthday",
  "nutrition",
  "instagram",
  "qr_campaign",
];

const MODULE_CONFIG: Record<
  AutoContentType,
  {
    title: string;
    description: string;
  }
> = {
  weather: {
    title: "Clima",
    description:
      "Exibe cards de clima atual e previsão rápida para a loja selecionada.",
  },
  news: {
    title: "Notícias",
    description:
      "Lista manchetes e chamadas rápidas de notícias para compor o canal.",
  },
  quote: {
    title: "Frases Motivacionais",
    description:
      "Mostra frases curtas para motivar clientes e equipe durante o dia.",
  },
  curiosity: {
    title: "Curiosidades",
    description:
      "Apresenta curiosidades rápidas para manter a programação dinâmica.",
  },
  birthday: {
    title: "Aniversariantes",
    description:
      "Utiliza a base de aniversariantes para gerar mensagens personalizadas.",
  },
  nutrition: {
    title: "Dicas de Nutrição",
    description:
      "Exibe dicas de alimentação e bem-estar alinhadas à operação da loja.",
  },
  instagram: {
    title: "Instagram Feed",
    description:
      "Traz posts selecionados do Instagram como cards visuais na TV.",
  },
  qr_campaign: {
    title: "QR Code de Campanhas",
    description:
      "Gera cards com QR Code para campanhas, formulários e landing pages.",
  },
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString("pt-BR");
};

const isValidModuleType = (value: string | undefined): value is AutoContentType => {
  if (!value) return false;
  return AUTO_CONTENT_TYPES.includes(value as AutoContentType);
};

const AutoContentModulePage = () => {
  const params = useParams<{ moduleType: string }>();

  const moduleType: AutoContentType = isValidModuleType(params.moduleType)
    ? params.moduleType
    : "weather";

  const config = MODULE_CONFIG[moduleType];

  const {
    items,
    isLoadingItems,
    itemsError,
    settings,
    isLoadingSettings,
    settingsError,
    toggleModule,
    generateNow,
    uploadBirthdays,
  } = useAutoContent({
    type: moduleType,
    limit: 200,
  });

  const { state, setView, setPage, setPageSize, setSearch, setFilters, reset } =
    useListState<AutoContentFilters>({
      initialFilters: {
        status: "all",
      },
      initialPageSize: 10,
      storageKeyOverride: `auto-content:${moduleType}`,
    });

  const currentSetting = settings.find((setting) => setting.module_type === moduleType);

  const [weatherCity, setWeatherCity] = useState("");
  const [weatherState, setWeatherState] = useState("");

  useEffect(() => {
    if (moduleType === "weather" && currentSetting) {
      setWeatherCity(currentSetting.weather_city ?? "");
      setWeatherState(currentSetting.weather_state ?? "");
    }
  }, [moduleType, currentSetting]);

  const filteredItems = useMemo(() => {
    const searchLower = state.search.toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        state.filters.status === "all" ? true : item.status === state.filters.status;

      const titleMatch = item.title.toLowerCase().includes(searchLower);
      const descriptionMatch =
        item.description?.toLowerCase().includes(searchLower) ?? false;
      const categoryMatch = item.category?.toLowerCase().includes(searchLower) ?? false;

      const matchesSearch =
        searchLower.length === 0 || titleMatch || descriptionMatch || categoryMatch;

      return matchesStatus && matchesSearch;
    });
  }, [items, state.search, state.filters.status]);

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

  const handleToggleModule = (enabled: boolean) => {
    const refreshInterval =
      currentSetting?.refresh_interval_minutes && currentSetting.refresh_interval_minutes > 0
        ? currentSetting.refresh_interval_minutes
        : moduleType === "weather"
          ? 60
          : 30;

    toggleModule.mutate({
      moduleType,
      enabled,
      refreshIntervalMinutes: refreshInterval,
      weatherCity: moduleType === "weather" ? weatherCity : undefined,
      weatherState: moduleType === "weather" ? weatherState : undefined,
    });
  };

  const handleChangeInterval = (minutes: number) => {
    if (!currentSetting) return;

    toggleModule.mutate({
      moduleType,
      enabled: currentSetting.enabled,
      refreshIntervalMinutes: minutes,
      weatherCity: moduleType === "weather" ? weatherCity : undefined,
      weatherState: moduleType === "weather" ? weatherState : undefined,
    });
  };

  const handleGenerateNow = () => {
    generateNow.mutate({
      moduleType,
      refreshIntervalMinutes: currentSetting?.refresh_interval_minutes,
      weatherCity: moduleType === "weather" ? weatherCity : undefined,
      weatherState: moduleType === "weather" ? weatherState : undefined,
    });
  };

  const handleUploadCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const csv = await file.text();

    uploadBirthdays.mutate({
      csv,
      fileName: file.name,
    });

    event.target.value = "";
  };

  const header = (
    <div className="px-4 pt-3 pb-2">
      <h2 className="text-lg font-semibold">{config.title}</h2>
      <p className="text-muted-foreground text-sm mt-1">{config.description}</p>
    </div>
  );

  const controls = (
    <div className="px-4 pb-2 space-y-3">
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
                status: value as AutoContentFilters["status"],
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

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={currentSetting?.enabled ?? false}
            onCheckedChange={handleToggleModule}
            disabled={isLoadingSettings || toggleModule.isPending}
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {currentSetting?.enabled ? "Módulo ativado" : "Módulo desativado"}
            </span>
            <span className="text-xs text-muted-foreground">
              Disponibiliza cards deste módulo para uso em playlists.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Frequência</span>
            <Select
              value={String(currentSetting?.refresh_interval_minutes ?? 30)}
              onValueChange={(value) => handleChangeInterval(Number(value))}
              disabled={!currentSetting || toggleModule.isPending}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Intervalo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={handleGenerateNow}
            disabled={!currentSetting?.enabled || generateNow.isPending}
          >
            Gerar mock agora
          </Button>
        </div>
      </div>

      {moduleType === "weather" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Cidade</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={weatherCity}
              onChange={(event) => setWeatherCity(event.target.value)}
              placeholder="Ex.: São Paulo"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Estado</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={weatherState}
              onChange={(event) => setWeatherState(event.target.value)}
              placeholder="Ex.: SP"
            />
          </div>
        </div>
      )}

      {moduleType === "birthday" && (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Importar aniversariantes via CSV</span>
            <span className="text-xs text-muted-foreground">
              O arquivo será usado para gerar cards automáticos de parabéns.
            </span>
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={handleUploadCsv}
            className="text-sm"
          />
        </div>
      )}
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

  const isLoading = isLoadingItems;
  const hasError = Boolean(itemsError || settingsError);

  let content: JSX.Element;

  if (isLoading) {
    content = (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Carregando conteúdo automático...
      </div>
    );
  } else if (hasError) {
    content = (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Erro ao carregar conteúdo automático</CardTitle>
            <CardDescription>
              Verifique sua conexão e tente novamente em alguns instantes.
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
            <CardTitle>Nenhum conteúdo gerado ainda</CardTitle>
            <CardDescription>
              Ative o módulo e clique em &quot;Gerar mock agora&quot; para criar os primeiros
              cards.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  } else if (state.view === "list") {
    content = (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Conteúdos gerados</CardTitle>
          <CardDescription>
            Lista de cards disponíveis para uso nas playlists deste tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs uppercase">
                    {item.type}
                  </TableCell>
                  <TableCell>{item.category ?? "-"}</TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "active" ? "default" : "secondary"}>
                      {item.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-xs text-muted-foreground">
                    {item.source}
                  </TableCell>
                  <TableCell>{formatDate(item.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  } else {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols 3 xl:grid-cols-4">
        {pageItems.map((item) => (
          <Card key={item.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <Badge variant={item.status === "active" ? "default" : "secondary"}>
                  {item.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {item.category ? `${item.category} • ${item.type}` : item.type}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0 text-xs text-muted-foreground space-y-1">
              {item.description && <p>{item.description}</p>}
              <p className="flex justify-between">
                <span>Fonte: {item.source}</span>
                <span>{formatDate(item.created_at)}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <PageShell header={header} controls={controls} footer={footer}>
      <ListViewport>{content}</ListViewport>
    </PageShell>
  );
};

export default AutoContentModulePage;

