import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useCompanies, Company, CompanyWithIntegrations, ApiIntegration } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Building2, Plug2, Trash2, Edit, Settings, Eye, EyeOff, Loader2, Link2, Unlink2, ChevronDown, Monitor } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export default function Companies() {
  const navigate = useNavigate();
  const { 
    companies, 
    availableIntegrations, 
    isLoading, 
    createCompany, 
    updateCompany, 
    deleteCompany,
    addCompanyIntegration,
    updateCompanyIntegration,
    removeCompanyIntegration
  } = useCompanies();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithIntegrations | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  
  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: "",
    slug: "",
    cnpj: ""
  });
  
  const [integrationForm, setIntegrationForm] = useState({
    integration_id: "",
    usuario: "",
    password: "",
    loja: "",
    image_base_url: "http://srv-mupa.ddns.net:5050/produto-imagem"
  });

  const handleCreateCompany = async () => {
    if (!companyForm.name || !companyForm.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    
    await createCompany.mutateAsync({
      name: companyForm.name,
      slug: companyForm.slug.toLowerCase().replace(/\s+/g, "-"),
      cnpj: companyForm.cnpj || null
    });
    
    setIsCreateDialogOpen(false);
    setCompanyForm({ name: "", slug: "", cnpj: "" });
  };

  const handleAddIntegration = async () => {
    if (!selectedCompany || !integrationForm.integration_id) {
      toast.error("Selecione uma integração");
      return;
    }
    
    if (!integrationForm.usuario || !integrationForm.password) {
      toast.error("Credenciais são obrigatórias");
      return;
    }
    
    if (!integrationForm.loja) {
      toast.error("Código da loja é obrigatório");
      return;
    }
    
    await addCompanyIntegration.mutateAsync({
      company_id: selectedCompany.id,
      integration_id: integrationForm.integration_id,
      credentials: {
        usuario: integrationForm.usuario,
        password: integrationForm.password
      } as unknown as Json,
      settings: {
        loja: integrationForm.loja,
        store_code: integrationForm.loja,
        image_base_url: integrationForm.image_base_url
      } as unknown as Json
    });
    
    setIsIntegrationDialogOpen(false);
    setIntegrationForm({
      integration_id: "",
      usuario: "",
      password: "",
      loja: "",
      image_base_url: "http://srv-mupa.ddns.net:5050/produto-imagem"
    });
    setSelectedCompany(null);
  };

  const handleRemoveIntegration = async (integrationId: string) => {
    if (!confirm("Tem certeza que deseja remover esta integração?")) return;
    
    await removeCompanyIntegration.mutateAsync(integrationId);
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Tem certeza que deseja excluir a empresa "${company.name}"?`)) return;
    
    await deleteCompany.mutateAsync(company.id);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground mt-1">
              Gerencie empresas e suas integrações de API
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Empresa</DialogTitle>
                <DialogDescription>
                  Adicione uma nova empresa/cliente ao sistema
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Zaffari"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (identificador único)</Label>
                  <Input
                    id="slug"
                    placeholder="Ex: zaffari"
                    value={companyForm.slug}
                    onChange={(e) => setCompanyForm({ 
                      ...companyForm, 
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-") 
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={companyForm.cnpj}
                    onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCompany} disabled={createCompany.isPending}>
                  {createCompany.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Empresa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {companies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma empresa cadastrada</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Crie uma empresa para começar a configurar integrações de API
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Empresa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {companies.map((company) => (
              <AccordionItem key={company.id} value={company.id} className="border rounded-lg bg-card">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <div className="font-semibold flex items-center gap-2">
                          {company.name}
                          <Badge variant={company.is_active ? "default" : "secondary"} className="text-xs">
                            {company.is_active ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">{company.slug}</code>
                          {company.cnpj && <span className="ml-2">• CNPJ: {company.cnpj}</span>}
                          <span className="ml-2">
                            • {company.integrations?.length || 0} integração(ões)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-6 pb-4">
                  <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/companies/${company.id}/display-config`);
                        }}
                      >
                        <Monitor className="h-4 w-4 mr-2" />
                        Tela de Consulta
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCompany(company);
                          setIsIntegrationDialogOpen(true);
                        }}
                      >
                        <Plug2 className="h-4 w-4 mr-2" />
                        Adicionar Integração
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCompany(company);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    
                    {company.integrations && company.integrations.length > 0 ? (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Integração</TableHead>
                              <TableHead>Loja</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Credenciais</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {company.integrations.map((ci) => {
                              const credentials = ci.credentials as Record<string, string> || {};
                              const settings = ci.settings as Record<string, string> || {};
                              
                              return (
                                <TableRow key={ci.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <Link2 className="h-4 w-4 text-primary" />
                                      {ci.integration?.name || "Integração"}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                      {settings.loja || settings.store_code || "-"}
                                    </code>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={ci.is_active ? "default" : "secondary"}>
                                      {ci.is_active ? "Ativa" : "Inativa"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">
                                        Usuário: {credentials.usuario || "-"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveIntegration(ci.id)}
                                    >
                                      <Unlink2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                        <Plug2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma integração configurada</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsIntegrationDialogOpen(true);
                          }}
                        >
                          Adicionar integração
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Dialog para adicionar integração */}
        <Dialog open={isIntegrationDialogOpen} onOpenChange={setIsIntegrationDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Configurar Integração</DialogTitle>
              <DialogDescription>
                Configure a integração de API para {selectedCompany?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="integration">Tipo de Integração</Label>
                <Select
                  value={integrationForm.integration_id}
                  onValueChange={(value) => setIntegrationForm({ ...integrationForm, integration_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a integração" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIntegrations.map((integration) => (
                      <SelectItem key={integration.id} value={integration.id}>
                        {integration.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Credenciais da API
                </h4>
                
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="usuario">Usuário</Label>
                    <Input
                      id="usuario"
                      placeholder="Usuário da API"
                      value={integrationForm.usuario}
                      onChange={(e) => setIntegrationForm({ ...integrationForm, usuario: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showCredentials ? "text" : "password"}
                        placeholder="Senha da API"
                        value={integrationForm.password}
                        onChange={(e) => setIntegrationForm({ ...integrationForm, password: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowCredentials(!showCredentials)}
                      >
                        {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Configurações</h4>
                
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="loja">Código da Loja</Label>
                    <Input
                      id="loja"
                      placeholder="Ex: 123"
                      value={integrationForm.loja}
                      onChange={(e) => setIntegrationForm({ ...integrationForm, loja: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Código da loja usado nas consultas de preço
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="image_base_url">URL Base para Imagens</Label>
                    <Input
                      id="image_base_url"
                      placeholder="http://..."
                      value={integrationForm.image_base_url}
                      onChange={(e) => setIntegrationForm({ ...integrationForm, image_base_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsIntegrationDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddIntegration} disabled={addCompanyIntegration.isPending}>
                {addCompanyIntegration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Integração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
