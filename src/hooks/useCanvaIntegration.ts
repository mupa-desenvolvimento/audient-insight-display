 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
 interface CanvaDesign {
   id: string;
   title: string;
   thumbnail?: {
     url: string;
   };
   created_at: string;
   updated_at: string;
   type?: string;
 }
 
 interface CanvaFolder {
   id: string;
   name: string;
 }
 
 export function useCanvaIntegration() {
   const { toast } = useToast();
   const [isConnected, setIsConnected] = useState(false);
   const [isLoading, setIsLoading] = useState(true);
   const [designs, setDesigns] = useState<CanvaDesign[]>([]);
   const [folders, setFolders] = useState<CanvaFolder[]>([]);
   const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
   const [continuation, setContinuation] = useState<string | null>(null);
   const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
   const [isExporting, setIsExporting] = useState<string | null>(null);
 
   const callCanvaApi = useCallback(async (action: string, body: Record<string, unknown>) => {
     const { data: { session } } = await supabase.auth.getSession();
     if (!session) throw new Error('Not authenticated');
 
     const response = await fetch(
       `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/canva-auth?action=${action}`,
       {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${session.access_token}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ ...body, user_id: session.user.id }),
       }
     );
 
     return response.json();
   }, []);
 
   const checkConnection = useCallback(async () => {
     try {
       setIsLoading(true);
       const result = await callCanvaApi('status', {});
       setIsConnected(result.connected);
     } catch (error) {
       console.error('Error checking Canva connection:', error);
       setIsConnected(false);
     } finally {
       setIsLoading(false);
     }
   }, [callCanvaApi]);
 
   useEffect(() => {
     checkConnection();
   }, [checkConnection]);
 
   const connect = useCallback(async () => {
     try {
       const redirectUri = `${window.location.origin}/admin/canva/callback`;
       const result = await callCanvaApi('get_auth_url', { redirect_uri: redirectUri });
       
       if (result.auth_url) {
         // Store state for verification
         sessionStorage.setItem('canva_oauth_state', result.state);
         window.location.href = result.auth_url;
       } else {
         throw new Error(result.error || 'Failed to get auth URL');
       }
     } catch (error) {
       console.error('Error connecting to Canva:', error);
       toast({
         title: 'Erro ao conectar',
         description: 'Não foi possível iniciar a conexão com o Canva',
         variant: 'destructive',
       });
     }
   }, [callCanvaApi, toast]);
 
   const handleCallback = useCallback(async (code: string, state: string) => {
     try {
       const storedState = sessionStorage.getItem('canva_oauth_state');
       if (storedState !== state) {
         throw new Error('Invalid state');
       }
       
       const redirectUri = `${window.location.origin}/admin/canva/callback`;
       const result = await callCanvaApi('exchange_code', { code, state, redirect_uri: redirectUri });
       
       if (result.success) {
         sessionStorage.removeItem('canva_oauth_state');
         setIsConnected(true);
         toast({
           title: 'Conectado!',
           description: 'Sua conta do Canva foi conectada com sucesso',
         });
         return true;
       } else {
         throw new Error(result.error || 'Failed to exchange code');
       }
     } catch (error) {
       console.error('Error handling callback:', error);
       toast({
         title: 'Erro na autenticação',
         description: 'Não foi possível completar a conexão com o Canva',
         variant: 'destructive',
       });
       return false;
     }
   }, [callCanvaApi, toast]);
 
   const disconnect = useCallback(async () => {
     try {
       await callCanvaApi('disconnect', {});
       setIsConnected(false);
       setDesigns([]);
       setFolders([]);
       toast({
         title: 'Desconectado',
         description: 'Sua conta do Canva foi desconectada',
       });
     } catch (error) {
       console.error('Error disconnecting:', error);
       toast({
         title: 'Erro',
         description: 'Não foi possível desconectar do Canva',
         variant: 'destructive',
       });
     }
   }, [callCanvaApi, toast]);
 
   const loadFolders = useCallback(async () => {
     try {
       const result = await callCanvaApi('list_folders', {});
       if (result.success) {
         setFolders(result.folders || []);
       }
     } catch (error) {
       console.error('Error loading folders:', error);
     }
   }, [callCanvaApi]);
 
   const loadDesigns = useCallback(async (folderId?: string | null, loadMore = false) => {
     try {
       setIsLoadingDesigns(true);
       
       const result = await callCanvaApi('list_designs', {
         folder_id: folderId,
         continuation: loadMore ? continuation : undefined,
       });
       
       if (result.connected === false) {
         setIsConnected(false);
         return;
       }
       
       if (result.success) {
         if (loadMore) {
           setDesigns(prev => [...prev, ...(result.designs || [])]);
         } else {
           setDesigns(result.designs || []);
         }
         setContinuation(result.continuation || null);
       }
     } catch (error) {
       console.error('Error loading designs:', error);
       toast({
         title: 'Erro',
         description: 'Não foi possível carregar os designs do Canva',
         variant: 'destructive',
       });
     } finally {
       setIsLoadingDesigns(false);
     }
   }, [callCanvaApi, continuation, toast]);
 
   const exportDesign = useCallback(async (designId: string, designTitle: string, format: 'png' | 'jpg' | 'pdf' = 'png') => {
     try {
       setIsExporting(designId);
       
       const result = await callCanvaApi('export_design', { design_id: designId, format });
       
       if (result.success && result.export_urls?.length > 0) {
         // Download and upload to our storage
         const exportUrl = result.export_urls[0];
         
         // Fetch the exported file
         const fileResponse = await fetch(exportUrl);
         const blob = await fileResponse.blob();
         
         // Create file from blob
         const fileName = `${designTitle.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
         const file = new File([blob], fileName, { type: blob.type });
         
         // Upload to our system
         const formData = new FormData();
         formData.append('file', file);
         formData.append('fileName', fileName);
         formData.append('fileType', blob.type);
         
         const { data: { session } } = await supabase.auth.getSession();
         if (!session) throw new Error('Not authenticated');
         
         const uploadResponse = await fetch(
           `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`,
           {
             method: 'POST',
             headers: { 'Authorization': `Bearer ${session.access_token}` },
             body: formData,
           }
         );
         
         const uploadResult = await uploadResponse.json();
         
         if (uploadResponse.ok) {
           toast({
             title: 'Importado!',
             description: `"${designTitle}" foi importado para sua biblioteca de mídia`,
           });
           return uploadResult.mediaItem;
         } else {
           throw new Error(uploadResult.error || 'Upload failed');
         }
       } else {
         throw new Error(result.error || 'Export failed');
       }
     } catch (error) {
       console.error('Error exporting design:', error);
       toast({
         title: 'Erro ao importar',
         description: 'Não foi possível importar o design do Canva',
         variant: 'destructive',
       });
       return null;
     } finally {
       setIsExporting(null);
     }
   }, [callCanvaApi, toast]);
 
   return {
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
     exportDesign,
     checkConnection,
   };
 }