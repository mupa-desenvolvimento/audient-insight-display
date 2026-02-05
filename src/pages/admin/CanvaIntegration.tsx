 import { useEffect, useState } from 'react';
 import { useSearchParams, useNavigate } from 'react-router-dom';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Skeleton } from '@/components/ui/skeleton';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { 
  Link2, Link2Off, Loader2, Download, FolderOpen, 
  Image, RefreshCw, CheckCircle2, ExternalLink, CheckSquare, Square
} from 'lucide-react';
import { useCanvaIntegration } from '@/hooks/useCanvaIntegration';
import { Checkbox } from '@/components/ui/checkbox';
 
 export default function CanvaIntegration() {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const [isProcessingCallback, setIsProcessingCallback] = useState(false);
   
   const {
     isConnected,
     isLoading,
     designs,
     folders,
     selectedFolder,
    setSelectedFolder,
    continuation,
    isLoadingDesigns,
    isExporting,
    connect,
    disconnect,
    handleCallback,
    loadFolders,
    loadDesigns,
    selectedDesigns,
    toggleSelection,
    selectAll,
    clearSelection,
    exportSelectedDesigns,
  } = useCanvaIntegration();
 
   // Handle OAuth callback
   useEffect(() => {
     const code = searchParams.get('code');
     const state = searchParams.get('state');
     
     if (code && state && !isProcessingCallback) {
       setIsProcessingCallback(true);
       handleCallback(code, state).then((success) => {
         // Clean URL
         navigate('/admin/canva', { replace: true });
         if (success) {
           loadDesigns();
           loadFolders();
         }
       });
     }
   }, [searchParams, handleCallback, navigate, isProcessingCallback, loadDesigns, loadFolders]);
 
   // Load designs when connected
   useEffect(() => {
     if (isConnected && !isProcessingCallback) {
       loadDesigns();
       loadFolders();
     }
   }, [isConnected, loadDesigns, loadFolders, isProcessingCallback]);
 
   // Handle folder change
   const handleFolderChange = (value: string) => {
     const folderId = value === 'all' ? null : value;
     setSelectedFolder(folderId);
     loadDesigns(folderId);
   };
 
   if (isLoading || isProcessingCallback) {
     return (
       <div className="p-6 space-y-6">
         <div className="flex items-center justify-center min-h-[400px]">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       </div>
     );
   }
 
   return (
     <div className="p-6 space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold">Integração Canva</h1>
           <p className="text-muted-foreground">
             Conecte sua conta do Canva para importar designs para suas playlists
           </p>
         </div>
         
         {isConnected ? (
           <div className="flex items-center gap-3">
             <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
               <CheckCircle2 className="h-4 w-4 text-green-500" />
               Conectado
             </Badge>
             <Button variant="outline" onClick={disconnect}>
               <Link2Off className="h-4 w-4 mr-2" />
               Desconectar
             </Button>
           </div>
         ) : (
           <Button onClick={connect}>
             <Link2 className="h-4 w-4 mr-2" />
             Conectar ao Canva
           </Button>
         )}
       </div>
 
       {!isConnected ? (
         <Card className="max-w-2xl">
           <CardHeader>
             <CardTitle>Conecte sua conta do Canva</CardTitle>
             <CardDescription>
               Ao conectar sua conta, você poderá visualizar e importar seus designs diretamente para a biblioteca de mídia.
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
               <Image className="h-5 w-5 mt-0.5 text-primary" />
               <div>
                 <p className="font-medium">Importar designs como imagens</p>
                 <p className="text-sm text-muted-foreground">
                   Seus designs serão exportados como imagens PNG de alta qualidade e salvos na biblioteca de mídia.
                 </p>
               </div>
             </div>
             
             <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
               <FolderOpen className="h-5 w-5 mt-0.5 text-primary" />
               <div>
                 <p className="font-medium">Acesso a pastas e equipe</p>
                 <p className="text-sm text-muted-foreground">
                   Navegue por suas pastas pessoais e designs compartilhados da equipe.
                 </p>
               </div>
             </div>
             
             <Button onClick={connect} className="w-full" size="lg">
               <Link2 className="h-4 w-4 mr-2" />
               Conectar ao Canva
             </Button>
             
             <p className="text-xs text-center text-muted-foreground">
               Você será redirecionado para o Canva para autorizar o acesso.
             </p>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-4">
           {/* Filters */}
           <div className="flex items-center gap-4">
             <Select value={selectedFolder || 'all'} onValueChange={handleFolderChange}>
               <SelectTrigger className="w-[250px]">
                 <SelectValue placeholder="Selecione uma pasta" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos os designs</SelectItem>
                 {folders.map(folder => (
                   <SelectItem key={folder.id} value={folder.id}>
                     <span className="flex items-center gap-2">
                       <FolderOpen className="h-4 w-4" />
                       {folder.name}
                     </span>
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
             
             {selectedDesigns.size > 0 && (
              <Button onClick={() => exportSelectedDesigns()}>
                <Download className="h-4 w-4 mr-2" />
                Importar ({selectedDesigns.size})
              </Button>
            )}

            <Button 
              variant="outline" 
              onClick={() => loadDesigns(selectedFolder)} 
              disabled={isLoadingDesigns}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingDesigns ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Designs Grid */}
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="mb-4 flex items-center gap-2">
               <Button variant="ghost" size="sm" onClick={selectAll} disabled={designs.length === 0}>
                 Selecionar tudo
               </Button>
               {selectedDesigns.size > 0 && (
                 <Button variant="ghost" size="sm" onClick={clearSelection}>
                   Limpar seleção
                 </Button>
               )}
            </div>

            {isLoadingDesigns && designs.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-video rounded-lg" />
                ))}
              </div>
            ) : designs.length === 0 ? (
              <Card className="p-8 text-center">
                <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum design encontrado</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {designs.map(design => (
                  <DesignCard
                    key={design.id}
                    design={design}
                    isExporting={isExporting.includes(design.id)}
                    isSelected={selectedDesigns.has(design.id)}
                    onToggle={() => toggleSelection(design.id)}
                  />
                ))}
              </div>
            )}
            
            {continuation && (
               <div className="flex justify-center py-4">
                 <Button 
                   variant="outline" 
                   onClick={() => loadDesigns(selectedFolder, true)}
                   disabled={isLoadingDesigns}
                 >
                   {isLoadingDesigns ? (
                     <Loader2 className="h-4 w-4 animate-spin mr-2" />
                   ) : null}
                   Carregar mais
                 </Button>
               </div>
             )}
           </ScrollArea>
         </div>
       )}
     </div>
   );
 }
 
 interface DesignCardProps {
  design: {
    id: string;
    title: string;
    thumbnail?: { url: string };
    updated_at: string;
    type?: string;
  };
  isExporting: boolean;
  isSelected: boolean;
  onToggle: () => void;
}

function DesignCard({ design, isExporting, isSelected, onToggle }: DesignCardProps) {
  const { exportDesign } = useCanvaIntegration();
  const [importedId, setImportedId] = useState<string | null>(null);
  
  const handleImport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await exportDesign(design.id, design.title);
    if (result?.id) {
      setImportedId(result.id);
    }
  };
  
  return (
    <Card 
      className={`group overflow-hidden transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:ring-2 hover:ring-primary/50'
      }`}
      onClick={onToggle}
    >
      <div className="aspect-video relative bg-muted">
        {design.thumbnail?.url ? (
          <img
            src={design.thumbnail.url}
            alt={design.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Image className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        {/* Selection Checkbox Overlay */}
        <div className={`absolute top-2 left-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
           <div className={`bg-background/80 backdrop-blur-sm rounded-sm p-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
             {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
           </div>
        </div>
        
        {/* Import overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {importedId ? (
            <Badge className="bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Importado
            </Badge>
          ) : (
            <>
              <Button 
                size="sm" 
                onClick={handleImport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Importar
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.canva.com/design/${design.id}`, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      <CardContent className="p-3">
        <p className="font-medium text-sm truncate" title={design.title}>
          {design.title}
        </p>
         {design.type && (
           <Badge variant="secondary" className="text-xs mt-1">
             {design.type}
           </Badge>
         )}
       </CardContent>
     </Card>
   );
 }