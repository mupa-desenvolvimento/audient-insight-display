
import { useState, useEffect } from "react";
import { Slide } from "@/types/presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Wand2, 
  Image as ImageIcon, 
  Type, 
  Layout, 
  Plus, 
  Trash2, 
  Save,
  Video
} from "lucide-react";
import { aiService } from "@/services/aiService";
import { useCanvaIntegration } from "@/hooks/useCanvaIntegration";
import { canvaEditorService } from "@/services/canvaEditorService";
import { toast } from "sonner";

interface SlideEditorProps {
  slide: Slide;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedSlide: Slide) => void;
  onAdd: () => void;
  onDelete: () => void;
}

export function SlideEditor({ slide, isOpen, onClose, onUpdate, onAdd, onDelete }: SlideEditorProps) {
  const [formData, setFormData] = useState<Slide>(slide);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const { isConnected: isCanvaConnected } = useCanvaIntegration();

  // Reset form data when slide changes
  useEffect(() => {
    setFormData(slide);
  }, [slide]);

  const handleChange = (field: keyof Slide, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(formData);
    toast.success("Slide atualizado com sucesso!");
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este slide?")) {
      onDelete();
      onClose();
    }
  };

  const handleAdd = () => {
    onAdd();
    toast.success("Novo slide adicionado!");
    onClose();
  };

  const handleAiGenerate = async (field: string) => {
    setIsGenerating(field);
    try {
      const suggestion = await aiService.generateSuggestion(
        field, 
        formData.title, // use title as context
        formData[field as keyof Slide] as string
      );
      handleChange(field as keyof Slide, suggestion);
      toast.success("Sugestão gerada pela IA!");
    } catch (error) {
      toast.error("Erro ao gerar sugestão");
    } finally {
      setIsGenerating(null);
    }
  };

  const handleOpenCanva = async (type: 'image' | 'video') => {
    if (!isCanvaConnected) {
      // In a real app, this would start the auth flow
      toast.info("Conectando ao Canva...");
      // For demo purposes, we might just show a message if not connected
    }
    
    // Simulate opening editor
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 2000)),
      {
        loading: 'Abrindo editor Canva...',
        success: 'Editor aberto! (Simulação)',
        error: 'Erro ao abrir editor'
      }
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Editar Slide</SheetTitle>
          <SheetDescription>
            Faça alterações no conteúdo e design do slide.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Type className="w-4 h-4" /> Conteúdo
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Mídia
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Layout className="w-4 h-4" /> Layout
            </TabsTrigger>
          </TabsList>

          {/* CONTENT TAB */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Título</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-purple-400 hover:text-purple-300"
                  onClick={() => handleAiGenerate('title')}
                  disabled={!!isGenerating}
                >
                  <Wand2 className={`w-3 h-3 mr-1 ${isGenerating === 'title' ? 'animate-spin' : ''}`} />
                  IA
                </Button>
              </div>
              <Input 
                id="title" 
                value={formData.title} 
                onChange={(e) => handleChange('title', e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subtitle">Subtítulo</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-purple-400 hover:text-purple-300"
                  onClick={() => handleAiGenerate('subtitle')}
                  disabled={!!isGenerating}
                >
                  <Wand2 className={`w-3 h-3 mr-1 ${isGenerating === 'subtitle' ? 'animate-spin' : ''}`} />
                  IA
                </Button>
              </div>
              <Input 
                id="subtitle" 
                value={formData.subtitle} 
                onChange={(e) => handleChange('subtitle', e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Descrição</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-purple-400 hover:text-purple-300"
                  onClick={() => handleAiGenerate('description')}
                  disabled={!!isGenerating}
                >
                  <Wand2 className={`w-3 h-3 mr-1 ${isGenerating === 'description' ? 'animate-spin' : ''}`} />
                  IA
                </Button>
              </div>
              <Textarea 
                id="description" 
                value={formData.description} 
                onChange={(e) => handleChange('description', e.target.value)} 
                rows={4}
              />
            </div>


            {/* Dynamic Points Editing */}
            {(formData.points || formData.benefits) && (
              <div className="space-y-2 pt-4 border-t border-gray-700">
                <Label>{formData.benefits ? 'Benefícios' : 'Pontos / Lista'}</Label>
                {(formData.points || formData.benefits || []).map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <Input 
                      value={point} 
                      onChange={(e) => {
                        const field = formData.benefits ? 'benefits' : 'points';
                        const list = [...(formData[field] || [])];
                        list[index] = e.target.value;
                        handleChange(field, list);
                      }} 
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const field = formData.benefits ? 'benefits' : 'points';
                        const list = (formData[field] as string[])?.filter((_, i) => i !== index);
                        handleChange(field, list);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => {
                     const field = formData.benefits ? 'benefits' : 'points';
                     handleChange(field, [...(formData[field] as string[] || []), "Novo item"]);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Item
                </Button>
              </div>
            )}

            {/* Dynamic Lists Editing */}
            {/* Helper function to render list editor */}
            {['features', 'items', 'stats', 'reasons'].map((fieldName) => {
              const list = (formData[fieldName as keyof Slide] as any[]) || [];
              if (list.length === 0 && !['bento-grid', 'solution', 'grid', 'qr-demo', 'dashboard-demo', 'immersive-split', 'visual-right', 'sales'].includes(formData.layout)) return null;
              
              // Only show relevant lists for current layout to avoid clutter, or show if data exists
              const isRelevant = 
                (fieldName === 'features' && ['bento-grid', 'solution'].includes(formData.layout)) ||
                (fieldName === 'items' && ['grid', 'qr-demo', 'dashboard-demo'].includes(formData.layout)) ||
                (fieldName === 'stats' && ['immersive-split', 'visual-right', 'dashboard-demo'].includes(formData.layout)) ||
                (fieldName === 'reasons' && ['sales'].includes(formData.layout));

              if (!isRelevant && list.length === 0) return null;

              return (
                <div key={fieldName} className="space-y-2 pt-4 border-t border-gray-700">
                  <Label className="capitalize">{fieldName}</Label>
                  <div className="space-y-3">
                    {list.map((item, index) => (
                      <div key={index} className="p-3 border border-gray-700 rounded bg-gray-900/30 space-y-2 relative">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 z-10"
                          onClick={() => {
                            const newList = list.filter((_, i) => i !== index);
                            handleChange(fieldName as keyof Slide, newList);
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {/* Title/Label/Text */}
                          {(item.title !== undefined || fieldName === 'items' || fieldName === 'reasons') && (
                            <Input 
                              value={item.title || ''} 
                              onChange={(e) => {
                                const newList = [...list];
                                newList[index] = { ...item, title: e.target.value };
                                handleChange(fieldName as keyof Slide, newList);
                              }}
                              placeholder="Título"
                              className="h-8 text-sm"
                            />
                          )}
                          {(item.label !== undefined || fieldName === 'stats') && (
                            <Input 
                              value={item.label || ''} 
                              onChange={(e) => {
                                const newList = [...list];
                                newList[index] = { ...item, label: e.target.value };
                                handleChange(fieldName as keyof Slide, newList);
                              }}
                              placeholder="Label"
                              className="h-8 text-sm"
                            />
                          )}
                          {(item.text !== undefined || fieldName === 'features') && (
                            <Input 
                              value={item.text || ''} 
                              onChange={(e) => {
                                const newList = [...list];
                                newList[index] = { ...item, text: e.target.value };
                                handleChange(fieldName as keyof Slide, newList);
                              }}
                              placeholder="Texto"
                              className="h-8 text-sm"
                            />
                          )}

                          {/* Desc/Value */}
                          {(item.desc !== undefined || fieldName === 'features' || fieldName === 'items' || fieldName === 'reasons') && (
                            <Input 
                              value={item.desc || ''} 
                              onChange={(e) => {
                                const newList = [...list];
                                newList[index] = { ...item, desc: e.target.value };
                                handleChange(fieldName as keyof Slide, newList);
                              }}
                              placeholder="Descrição"
                              className="h-8 text-sm opacity-80"
                            />
                          )}
                          {(item.value !== undefined || fieldName === 'stats') && (
                            <Input 
                              value={item.value || ''} 
                              onChange={(e) => {
                                const newList = [...list];
                                newList[index] = { ...item, value: e.target.value };
                                handleChange(fieldName as keyof Slide, newList);
                              }}
                              placeholder="Valor"
                              className="h-8 text-sm opacity-80"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        const newList = [...list];
                        // Add empty object with appropriate keys based on fieldName
                        let newItem = {};
                        if (fieldName === 'features') newItem = { text: 'Novo Recurso', desc: 'Descrição' };
                        else if (fieldName === 'items') newItem = { title: 'Novo Item', desc: 'Descrição' };
                        else if (fieldName === 'stats') newItem = { label: 'Label', value: '100' };
                        else if (fieldName === 'reasons') newItem = { title: 'Motivo', desc: 'Explicação' };
                        
                        newList.push(newItem);
                        handleChange(fieldName as keyof Slide, newList);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar {fieldName}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Comparison Editing */}
            {formData.layout === 'comparison' && (
              <div className="space-y-4 pt-4 border-t border-gray-700">
                <Label>Comparação</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 border border-gray-700 rounded bg-gray-900/30">
                    <Label className="text-xs text-red-400">Esquerda (Concorrente)</Label>
                    <Input 
                      value={formData.comparison?.left?.label || ''} 
                      onChange={(e) => handleChange('comparison', { 
                        ...formData.comparison, 
                        left: { ...formData.comparison?.left, label: e.target.value } 
                      })}
                      placeholder="Label Esq."
                      className="h-8 text-sm"
                    />
                    <Input 
                      value={formData.comparison?.left?.image || ''} 
                      onChange={(e) => handleChange('comparison', { 
                        ...formData.comparison, 
                        left: { ...formData.comparison?.left, image: e.target.value } 
                      })}
                      placeholder="URL Imagem Esq."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2 p-3 border border-gray-700 rounded bg-gray-900/30">
                    <Label className="text-xs text-green-400">Direita (MUPA)</Label>
                    <Input 
                      value={formData.comparison?.right?.label || ''} 
                      onChange={(e) => handleChange('comparison', { 
                        ...formData.comparison, 
                        right: { ...formData.comparison?.right, label: e.target.value } 
                      })}
                      placeholder="Label Dir."
                      className="h-8 text-sm"
                    />
                    <Input 
                      value={formData.comparison?.right?.image || ''} 
                      onChange={(e) => handleChange('comparison', { 
                        ...formData.comparison, 
                        right: { ...formData.comparison?.right, image: e.target.value } 
                      })}
                      placeholder="URL Imagem Dir."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

          </TabsContent>

          {/* MEDIA TAB */}
          <TabsContent value="media" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-900/50">
                <Label className="mb-2 block">Imagem Principal</Label>
                {formData.image && (
                  <img 
                    src={formData.image} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded mb-2 border border-gray-700" 
                  />
                )}
                <Input 
                  value={formData.image || ''} 
                  onChange={(e) => handleChange('image', e.target.value)} 
                  placeholder="URL da imagem..."
                  className="mb-2"
                />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleOpenCanva('image')}
                >
                  <ImageIcon className="w-4 h-4 mr-2" /> 
                  Editar no Canva
                </Button>
              </div>

              {/* Images Array (for visual-right) */}
              {(formData.layout === 'visual-right' || (formData.images && formData.images.length > 0)) && (
                <div className="p-4 border rounded-lg bg-gray-900/50">
                  <Label className="mb-2 block">Galeria de Imagens</Label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {(formData.images || []).map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} className="w-full h-20 object-cover rounded border border-gray-700" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const newImages = (formData.images || []).filter((_, i) => i !== idx);
                            handleChange('images', newImages);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const url = prompt("URL da imagem:");
                      if (url) {
                        handleChange('images', [...(formData.images || []), url]);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Imagem
                  </Button>
                </div>
              )}

              <div className="p-4 border rounded-lg bg-gray-900/50">
                <Label className="mb-2 block">Vídeo</Label>
                <Input 
                  value={formData.video || ''} 
                  onChange={(e) => handleChange('video', e.target.value)} 
                  placeholder="URL do vídeo..."
                  className="mb-2"
                />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleOpenCanva('video')}
                >
                  <Video className="w-4 h-4 mr-2" /> 
                  Editar no Canva
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* LAYOUT TAB */}
          <TabsContent value="layout" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {['landing-hero', 'feature-list', 'problem', 'bento-grid', 'grid', 'immersive-split', 'case', 'visual-right', 'qr-demo', 'dashboard-demo', 'sales', 'minimal-centered', 'hero'].map(layout => (
                <div 
                  key={layout}
                  className={`p-2 border rounded cursor-pointer text-xs text-center hover:bg-white/10 ${formData.layout === layout ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700'}`}
                  onClick={() => handleChange('layout', layout)}
                >
                  {layout}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-between gap-2 border-t border-gray-800 pt-4">
          <div className="flex gap-2">
            <Button variant="destructive" size="icon" onClick={handleDelete} title="Excluir Slide">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleAdd} title="Novo Slide">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
