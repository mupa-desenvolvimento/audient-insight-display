 import { useEffect, useState } from 'react';
 import { useSearchParams, useNavigate } from 'react-router-dom';
 import { supabase } from '@/integrations/supabase/client';
 import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 
 const CANVA_REDIRECT_DOMAIN = 'https://midias.mupa.app';
 
 export default function CanvaCallback() {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
   const [errorMessage, setErrorMessage] = useState<string>('');
 
   useEffect(() => {
     const processCallback = async () => {
       const code = searchParams.get('code');
       const state = searchParams.get('state');
       const error = searchParams.get('error');
 
       // Check for OAuth errors
       if (error) {
         console.error('[Canva Callback] OAuth error:', error);
         setStatus('error');
         setErrorMessage('Autorização cancelada ou negada pelo Canva');
         return;
       }
 
       if (!code || !state) {
         console.error('[Canva Callback] Missing code or state');
         setStatus('error');
         setErrorMessage('Parâmetros de callback inválidos');
         return;
       }
 
       try {
         // Get the current session
         const { data: { session } } = await supabase.auth.getSession();
         
         if (!session) {
           console.error('[Canva Callback] No session found');
           setStatus('error');
           setErrorMessage('Sessão expirada. Por favor, faça login novamente.');
           return;
         }
 
         // Exchange the code for tokens
         const redirectUri = `${CANVA_REDIRECT_DOMAIN}/admin/canva/callback`;
         
         const response = await fetch(
           `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/canva-auth?action=exchange_code`,
           {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${session.access_token}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({
               code,
               state,
               redirect_uri: redirectUri,
               user_id: session.user.id,
             }),
           }
         );
 
         const result = await response.json();
 
         if (result.success) {
           console.log('[Canva Callback] Token exchange successful');
           setStatus('success');
           // Redirect to Canva integration page after a short delay
           setTimeout(() => {
             navigate('/admin/canva', { replace: true });
           }, 1500);
         } else {
           console.error('[Canva Callback] Token exchange failed:', result.error);
           setStatus('error');
           setErrorMessage(result.error || 'Falha ao trocar código por tokens');
         }
       } catch (error) {
         console.error('[Canva Callback] Error processing callback:', error);
         setStatus('error');
         setErrorMessage('Erro ao processar callback do Canva');
       }
     };
 
     processCallback();
   }, [searchParams, navigate]);
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-background p-4">
       <Card className="w-full max-w-md">
         <CardHeader className="text-center">
           <CardTitle className="flex items-center justify-center gap-2">
             {status === 'processing' && (
               <>
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
                 Conectando ao Canva...
               </>
             )}
             {status === 'success' && (
               <>
                <CheckCircle2 className="h-6 w-6 text-primary" />
                 Conectado com sucesso!
               </>
             )}
             {status === 'error' && (
               <>
                 <XCircle className="h-6 w-6 text-destructive" />
                 Erro na conexão
               </>
             )}
           </CardTitle>
           <CardDescription>
             {status === 'processing' && 'Finalizando a autenticação com o Canva...'}
             {status === 'success' && 'Você será redirecionado em instantes...'}
             {status === 'error' && errorMessage}
           </CardDescription>
         </CardHeader>
         {status === 'error' && (
           <CardContent className="flex flex-col gap-3">
             <Button onClick={() => navigate('/admin/canva', { replace: true })}>
               Voltar para Integrações
             </Button>
             <Button variant="outline" onClick={() => navigate('/auth', { replace: true })}>
               Fazer Login Novamente
             </Button>
           </CardContent>
         )}
       </Card>
     </div>
   );
 }