import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Layout, Palette, Type, Image } from "lucide-react";
import { useProductDisplaySettings, layoutPresets, defaultSettings, ProductDisplaySettings } from "@/hooks/useProductDisplaySettings";
import { useCompanies } from "@/hooks/useCompanies";
import { cn } from "@/lib/utils";

const ProductDisplayConfig = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies } = useCompanies();
  const { settings, isLoading, saveSettings, isSaving } = useProductDisplaySettings(companyId);

  const [localSettings, setLocalSettings] = useState<Partial<ProductDisplaySettings>>({});

  const company = companies?.find((c) => c.id === companyId);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const updateSetting = <K extends keyof ProductDisplaySettings>(key: K, value: ProductDisplaySettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (presetId: number) => {
    const preset = layoutPresets.find((p) => p.id === presetId);
    if (preset) {
      setLocalSettings((prev) => ({
        ...prev,
        layout_preset: presetId,
        ...preset.settings,
      }));
    }
  };

  const handleSave = () => {
    if (companyId) {
      saveSettings({ ...localSettings, company_id: companyId } as ProductDisplaySettings & { company_id: string });
    }
  };

  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/companies")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-muted-foreground">{company?.name || "Empresa"}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Settings Panel */}
          <div className="xl:col-span-2 space-y-6 order-2 xl:order-1">
            <Tabs defaultValue="presets" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="presets" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  <span className="hidden sm:inline">Presets</span>
                </TabsTrigger>
                <TabsTrigger value="fonts" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span className="hidden sm:inline">Fontes</span>
                </TabsTrigger>
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Cores</span>
                </TabsTrigger>
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">Imagem</span>
                </TabsTrigger>
              </TabsList>

              {/* Presets Tab */}
              <TabsContent value="presets" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Layouts Predefinidos</CardTitle>
                    <CardDescription>Escolha um layout base e personalize conforme necessário</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      {layoutPresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset.id)}
                          className={cn(
                            "p-4 rounded-lg border-2 text-left transition-all hover:border-primary",
                            localSettings.layout_preset === preset.id
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          )}
                        >
                          <div className="font-medium">{preset.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">{preset.description}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Position Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Posições</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Posição da Imagem</Label>
                        <Select
                          value={localSettings.image_position || "right"}
                          onValueChange={(v) => updateSetting("image_position", v as "left" | "right")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Esquerda</SelectItem>
                            <SelectItem value="right">Direita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Posição do Preço</Label>
                        <Select
                          value={localSettings.price_position || "bottom"}
                          onValueChange={(v) => updateSetting("price_position", v as "top" | "center" | "bottom")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top">Topo</SelectItem>
                            <SelectItem value="center">Centro</SelectItem>
                            <SelectItem value="bottom">Inferior</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fonts Tab */}
              <TabsContent value="fonts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tamanhos de Fonte</CardTitle>
                    <CardDescription>Ajuste os tamanhos das fontes em pixels</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Título Principal</Label>
                          <span className="text-sm text-muted-foreground">{localSettings.title_font_size || 48}px</span>
                        </div>
                        <Slider
                          value={[localSettings.title_font_size || 48]}
                          onValueChange={([v]) => updateSetting("title_font_size", v)}
                          min={24}
                          max={80}
                          step={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Subtítulo</Label>
                          <span className="text-sm text-muted-foreground">{localSettings.subtitle_font_size || 24}px</span>
                        </div>
                        <Slider
                          value={[localSettings.subtitle_font_size || 24]}
                          onValueChange={([v]) => updateSetting("subtitle_font_size", v)}
                          min={12}
                          max={48}
                          step={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Preço Principal</Label>
                          <span className="text-sm text-muted-foreground">{localSettings.price_font_size || 96}px</span>
                        </div>
                        <Slider
                          value={[localSettings.price_font_size || 96]}
                          onValueChange={([v]) => updateSetting("price_font_size", v)}
                          min={48}
                          max={160}
                          step={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label>Preço Original (De:)</Label>
                          <span className="text-sm text-muted-foreground">{localSettings.original_price_font_size || 36}px</span>
                        </div>
                        <Slider
                          value={[localSettings.original_price_font_size || 36]}
                          onValueChange={([v]) => updateSetting("original_price_font_size", v)}
                          min={18}
                          max={64}
                          step={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Colors Tab */}
              <TabsContent value="colors" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Extração de Cores</CardTitle>
                    <CardDescription>
                      Quando ativado, as cores são extraídas automaticamente da imagem do produto
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Extração Automática de Cores</Label>
                        <p className="text-sm text-muted-foreground">
                          Usa as cores dominantes da imagem do produto
                        </p>
                      </div>
                      <Switch
                        checked={localSettings.enable_color_extraction ?? true}
                        onCheckedChange={(v) => updateSetting("enable_color_extraction", v)}
                      />
                    </div>

                    {/* Manual Color Settings */}
                    {!localSettings.enable_color_extraction && (
                      <div className="space-y-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Configure as cores manualmente. A cor da fonte será automaticamente ajustada para preto ou branco
                          conforme o contraste do fundo.
                        </p>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Cor Primária do Container</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={localSettings.container_primary_color || "#1E3A5F"}
                                onChange={(e) => updateSetting("container_primary_color", e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer"
                              />
                              <Input
                                value={localSettings.container_primary_color || "#1E3A5F"}
                                onChange={(e) => updateSetting("container_primary_color", e.target.value)}
                                className="flex-1 font-mono text-sm"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Cor Secundária</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={localSettings.container_secondary_color || "#2D4A6F"}
                                onChange={(e) => updateSetting("container_secondary_color", e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer"
                              />
                              <Input
                                value={localSettings.container_secondary_color || "#2D4A6F"}
                                onChange={(e) => updateSetting("container_secondary_color", e.target.value)}
                                className="flex-1 font-mono text-sm"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Cor de Destaque</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={localSettings.accent_color || "#3B82F6"}
                                onChange={(e) => updateSetting("accent_color", e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer"
                              />
                              <Input
                                value={localSettings.accent_color || "#3B82F6"}
                                onChange={(e) => updateSetting("accent_color", e.target.value)}
                                className="flex-1 font-mono text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Image Tab */}
              <TabsContent value="image" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações da Imagem</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Remover Fundo da Imagem</Label>
                        <p className="text-sm text-muted-foreground">
                          Exibe a imagem sem o fundo original
                        </p>
                      </div>
                      <Switch
                        checked={localSettings.remove_image_background ?? false}
                        onCheckedChange={(v) => updateSetting("remove_image_background", v)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cor de Fundo da Área da Imagem</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={localSettings.image_background_color || "#FFFFFF"}
                          onChange={(e) => updateSetting("image_background_color", e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={localSettings.image_background_color || "#FFFFFF"}
                          onChange={(e) => updateSetting("image_background_color", e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel - Larger */}
          <div className="xl:col-span-3 order-1 xl:order-2">
            <Card className="sticky top-6">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>Preview em Tempo Real</span>
                  <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-muted rounded">
                    {layoutPresets.find((p) => p.id === localSettings.layout_preset)?.name || "Personalizado"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Large Preview */}
                <div
                  className="w-full rounded-lg overflow-hidden border-2 border-border flex"
                  style={{
                    aspectRatio: "16/9",
                    flexDirection: localSettings.image_position === "left" ? "row-reverse" : "row",
                  }}
                >
                  {/* Info side */}
                  <div
                    className="w-1/2 p-6 flex flex-col relative overflow-hidden"
                    style={{
                      backgroundColor: localSettings.enable_color_extraction
                        ? "#1E3A5F"
                        : localSettings.container_primary_color || "#1E3A5F",
                      justifyContent:
                        localSettings.price_position === "top"
                          ? "flex-start"
                          : localSettings.price_position === "center"
                          ? "center"
                          : "flex-end",
                    }}
                  >
                    {/* Product name banner */}
                    <div
                      className="absolute top-0 left-0 right-0 px-4 py-3"
                      style={{
                        backgroundColor: localSettings.enable_color_extraction
                          ? "rgba(59, 130, 246, 0.95)"
                          : `${localSettings.accent_color || "#3B82F6"}F2`,
                      }}
                    >
                      <div
                        className="font-black uppercase tracking-wide"
                        style={{
                          fontSize: `${Math.max(12, (localSettings.title_font_size || 48) / 4)}px`,
                          color: localSettings.enable_color_extraction
                            ? "#FFFFFF"
                            : getContrastColor(localSettings.accent_color || "#3B82F6"),
                        }}
                      >
                        NOME DO PRODUTO
                      </div>
                      <div
                        className="font-light"
                        style={{
                          fontSize: `${Math.max(8, (localSettings.subtitle_font_size || 24) / 3)}px`,
                          color: localSettings.enable_color_extraction
                            ? "rgba(255,255,255,0.8)"
                            : getContrastColor(localSettings.accent_color || "#3B82F6"),
                        }}
                      >
                        Descrição adicional do produto
                      </div>
                    </div>

                    {/* Price section */}
                    <div className="mt-auto">
                      <div
                        className="line-through opacity-60"
                        style={{
                          fontSize: `${Math.max(10, (localSettings.original_price_font_size || 36) / 3)}px`,
                          color: localSettings.enable_color_extraction
                            ? "#FFFFFF"
                            : getContrastColor(localSettings.container_primary_color || "#1E3A5F"),
                        }}
                      >
                        De: R$ 12,99
                      </div>
                      <div
                        className="font-bold leading-none"
                        style={{
                          fontSize: `${Math.max(24, (localSettings.price_font_size || 96) / 3)}px`,
                          color: localSettings.enable_color_extraction
                            ? "#FFFFFF"
                            : getContrastColor(localSettings.container_primary_color || "#1E3A5F"),
                        }}
                      >
                        R$ 9,99
                      </div>
                    </div>
                  </div>

                  {/* Image side */}
                  <div
                    className="w-1/2 flex items-center justify-center p-4"
                    style={{
                      backgroundColor: localSettings.image_background_color || "#FFFFFF",
                    }}
                  >
                    <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center shadow-lg">
                      <Image className="w-16 h-16 text-muted-foreground/40" />
                    </div>
                  </div>
                </div>

                {/* Settings summary */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="font-medium text-muted-foreground mb-1">Fontes</div>
                    <div className="space-y-0.5 text-xs">
                      <div>Título: {localSettings.title_font_size || 48}px</div>
                      <div>Subtítulo: {localSettings.subtitle_font_size || 24}px</div>
                      <div>Preço: {localSettings.price_font_size || 96}px</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="font-medium text-muted-foreground mb-1">Cores</div>
                    <div className="space-y-0.5 text-xs">
                      <div>{localSettings.enable_color_extraction ? "✓ Extração automática" : "✗ Manual"}</div>
                      <div>Imagem: {localSettings.image_position === "left" ? "Esquerda" : "Direita"}</div>
                      <div>Preço: {localSettings.price_position === "top" ? "Topo" : localSettings.price_position === "center" ? "Centro" : "Inferior"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDisplayConfig;
