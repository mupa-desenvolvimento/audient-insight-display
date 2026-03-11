import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApiIntegrations } from "@/hooks/useApiIntegrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Server } from "lucide-react";

export default function ApiIntegrationsList() {
  const navigate = useNavigate();
  const { integrations, isLoading, setActive } = useApiIntegrations();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return integrations ?? [];
    return (integrations ?? []).filter((i) => {
      return (
        i.name.toLowerCase().includes(term) ||
        i.slug.toLowerCase().includes(term) ||
        i.base_url.toLowerCase().includes(term) ||
        String(i.request_url || "").toLowerCase().includes(term)
      );
    });
  }, [integrations, searchTerm]);

  return (
    <div className="space-y-6 p-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Price API Integrations</h1>
          <p className="text-muted-foreground mt-2">Configure autenticação, request e mapeamento para qualquer API externa</p>
        </div>
        <Button onClick={() => navigate("new")} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Nova Integração
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar integrações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-white/10"
          />
        </div>
      </div>

      <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Integrações</CardTitle>
          <CardDescription>Lista de integrações configuráveis para consulta de preço</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="w-[260px]">Nome</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Request URL</TableHead>
                <TableHead className="w-[120px]">Ativa</TableHead>
                <TableHead className="text-right w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhuma integração encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((integration) => (
                  <TableRow key={integration.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{integration.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{integration.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[320px] truncate" title={integration.base_url}>
                        <Server className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-mono text-muted-foreground truncate">{integration.base_url}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-muted-foreground">{integration.request_url || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={!!integration.is_active}
                        onCheckedChange={(checked) => setActive.mutate({ id: integration.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" className="h-8 px-2" onClick={() => navigate(`${integration.id}/edit`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
