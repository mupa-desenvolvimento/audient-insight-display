 import { useEffect, useState } from "react";
 import { useNavigate, useSearchParams } from "react-router-dom";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { ArrowLeft, Image, Video, Loader2, ExternalLink, FolderOpen } from "lucide-react";
 import { canvaEditorService } from "@/services/canvaEditorService";
 import { EditorSession } from "@/services/externalEditorService";
 import { toast } from "sonner";
 
 type EditorMode = 'select' | 'create' | 'edit' | 'processing';
 
 export default function CanvaEditor() {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const [mode, setMode] = useState<EditorMode>('select');
   const [isConnected, setIsConnected] = useState<boolean | null>(null);
   const [currentSession, setCurrentSession] = useState<EditorSession | null>(null);
   const [isLoading, setIsLoading] = useState(false);
 
   // Check for session ID or design ID in URL params
   const sessionId = searchParams.get('session');
   const designId = searchParams.get('design');
   const assetType = searchParams.get('type') as 'image' | 'video' | null;
 
   useEffect(() => {
     checkConnection();
   }, []);
 
   useEffect(() => {
     if (sessionId) {
       loadSession(sessionId);
     } else if (designId) {
       // Edit existing design
       setMode('edit');
     }
   }, [sessionId, designId]);
 
   const checkConnection = async () => {
     const connected = await canvaEditorService.isConnected();
     setIsConnected(connected);
     if (!connected) {
       toast.error("Você precisa conectar sua conta Canva primeiro");
     }
   };
 
   const loadSession = async (id: string) => {
     const session = await canvaEditorService.getSession(id);
     if (session) {
       setCurrentSession(session);
       setMode(session.status === 'active' ? 'processing' : 'select');
     }
   };
 
   const handleCreateDesign = async (type: 'image' | 'video') => {
     setIsLoading(true);
     try {
       const session = await canvaEditorService.startNewDesign(type);
       if (session) {
         setCurrentSession(session);
         setMode('create');
         
         // Get editor URL
         const editorUrl = await canvaEditorService.getEditorUrl(session);
         if (editorUrl) {
           // Open Canva in new tab (iframe not supported by Canva)
           window.open(editorUrl, '_blank');
           setMode('processing');
         } else {
           toast.info("Funcionalidade de criação será implementada em breve");
           setMode('select');
         }
       }
     } catch (error) {
       console.error('Failed to create design:', error);
       toast.error("Erro ao iniciar criação de design");
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleEditDesign = async () => {
     if (!designId || !assetType) return;
     
     setIsLoading(true);
     try {
       const session = await canvaEditorService.startEditDesign(designId, assetType);
       if (session) {
         setCurrentSession(session);
         const editorUrl = await canvaEditorService.getEditorUrl(session);
         if (editorUrl) {
           window.open(editorUrl, '_blank');
           setMode('processing');
         }
       }
     } catch (error) {
       console.error('Failed to edit design:', error);
       toast.error("Erro ao abrir design para edição");
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleImportToGallery = async () => {
     if (!currentSession) return;
     
     setIsLoading(true);
     try {
       const mediaId = await canvaEditorService.importToGallery(currentSession);
       if (mediaId) {
         toast.success("Design importado para a galeria com sucesso!");
         navigate('/admin/media');
       } else {
         toast.error("Erro ao importar design para a galeria");
       }
     } catch (error) {
       console.error('Failed to import to gallery:', error);
       toast.error("Erro ao importar design");
     } finally {
       setIsLoading(false);
     }
   };
 
   if (isConnected === null) {
     return (
       <div className="flex items-center justify-center min-h-[400px]">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   if (!isConnected) {
     return (
       <div className="space-y-6">
         <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => navigate('/admin/canva')}>
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <div>
             <h1 className="text-2xl font-bold">Editor Canva</h1>
             <p className="text-muted-foreground">Crie e edite designs no Canva</p>
           </div>
         </div>
 
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12">
             <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
             <h3 className="text-lg font-semibold mb-2">Conta Canva não conectada</h3>
             <p className="text-muted-foreground text-center mb-4">
               Você precisa conectar sua conta Canva para usar o editor.
             </p>
             <Button onClick={() => navigate('/admin/canva')}>
               Conectar Canva
             </Button>
           </CardContent>
         </Card>
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       <div className="flex items-center gap-4">
         <Button variant="ghost" size="icon" onClick={() => navigate('/admin/canva')}>
           <ArrowLeft className="h-5 w-5" />
         </Button>
         <div>
           <h1 className="text-2xl font-bold">Editor Canva</h1>
           <p className="text-muted-foreground">
             {mode === 'select' && 'Escolha o tipo de mídia para criar'}
             {mode === 'processing' && 'Edição em andamento'}
           </p>
         </div>
       </div>
 
       {mode === 'select' && (
         <div className="grid gap-6 md:grid-cols-2">
           <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleCreateDesign('image')}>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Image className="h-5 w-5" />
                 Criar Imagem
               </CardTitle>
               <CardDescription>
                 Crie uma nova imagem para usar em suas playlists e telas
               </CardDescription>
             </CardHeader>
             <CardContent>
               <p className="text-sm text-muted-foreground">
                 Formatos: PNG, JPG • Ideal para banners, promoções e anúncios
               </p>
             </CardContent>
           </Card>
 
           <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleCreateDesign('video')}>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Video className="h-5 w-5" />
                 Criar Vídeo
               </CardTitle>
               <CardDescription>
                 Crie um novo vídeo para usar em suas playlists e telas
               </CardDescription>
             </CardHeader>
             <CardContent>
               <p className="text-sm text-muted-foreground">
                 Formato: MP4 • Ideal para apresentações dinâmicas
               </p>
             </CardContent>
           </Card>
         </div>
       )}
 
       {mode === 'edit' && designId && (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12">
             <h3 className="text-lg font-semibold mb-4">Editar Design</h3>
             <Button onClick={handleEditDesign} disabled={isLoading}>
               {isLoading ? (
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
               ) : (
                 <ExternalLink className="h-4 w-4 mr-2" />
               )}
               Abrir no Canva
             </Button>
           </CardContent>
         </Card>
       )}
 
       {mode === 'processing' && currentSession && (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12">
             <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
             <h3 className="text-lg font-semibold mb-2">Edição em andamento</h3>
             <p className="text-muted-foreground text-center mb-6">
               Quando terminar de editar no Canva, clique no botão abaixo para importar o design para a galeria.
             </p>
             <div className="flex gap-4">
               <Button variant="outline" onClick={() => setMode('select')}>
                 Cancelar
               </Button>
               <Button onClick={handleImportToGallery} disabled={isLoading}>
                 {isLoading ? (
                   <Loader2 className="h-4 w-4 animate-spin mr-2" />
                 ) : (
                   <FolderOpen className="h-4 w-4 mr-2" />
                 )}
                 Importar para Galeria
               </Button>
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* Future: Session History */}
       {/* <Card>
         <CardHeader>
           <CardTitle>Sessões Recentes</CardTitle>
         </CardHeader>
         <CardContent>
           List of recent editor sessions
         </CardContent>
       </Card> */}
     </div>
   );
 }