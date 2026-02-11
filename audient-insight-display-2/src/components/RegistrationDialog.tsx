import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FaceCapture, type FaceCaptureData, type FaceQuality } from '@/components/FaceCapture';
import { usePeopleRegistry } from '@/hooks/usePeopleRegistry';
import { UserPlus, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RegistrationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'form' | 'capture' | 'success';

export function RegistrationDialog({ isOpen, onOpenChange }: RegistrationDialogProps) {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captures, setCaptures] = useState<FaceCaptureData[]>([]);
  const { registerPersonWithCaptures, isLoading } = usePeopleRegistry();
  
  // Local camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [faceQuality, setFaceQuality] = useState<FaceQuality | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  const startCamera = async (retryCount = 0) => {
    try {
      // Ensure any previous stream is stopped
      if (retryCount === 0) stopCamera();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setIsStreaming(true);
        };
      } else {
        // Fallback if ref is somehow not ready yet
        stream.getTracks().forEach(t => t.stop());
        console.error("Video ref not found");
      }
    } catch (error: any) {
      console.error("Error accessing camera:", error);
      
      // Retry logic
      if (retryCount < 3 && (error.name === 'NotReadableError' || error.name === 'TrackStartError')) {
         console.log(`Registration camera busy, retrying... (${retryCount + 1}/3)`);
         setTimeout(() => startCamera(retryCount + 1), 500);
         return;
      }
      
      toast.error("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  // Manage camera lifecycle based on step and dialog open state
  useEffect(() => {
    if (isOpen && step === 'capture') {
      // Increased timeout to ensure DOM is ready and previous streams are released
      const timer = setTimeout(() => {
        startCamera();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      stopCamera();
    };
  }, [isOpen, step]);

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after transition
    setTimeout(() => {
      setStep('form');
      setName('');
      setCpf('');
      setAcceptedTerms(false);
      setCaptures([]);
      setFaceQuality(null);
      setCountdown(null);
    }, 300);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && cpf.trim() && acceptedTerms) {
      setStep('capture');
    }
  };

  const handleCapturesComplete = async (newCaptures: FaceCaptureData[]) => {
    setCaptures(newCaptures);
    
    // Auto register
    const result = await registerPersonWithCaptures(name, cpf, newCaptures);
    
    if (result.success) {
      setStep('success');
      toast.success(result.message);
      setTimeout(handleClose, 2000);
    } else {
      toast.error(result.message);
      setStep('form'); // Go back to form on error (e.g. duplicate CPF)
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Cadastrar Nova Pessoa
          </DialogTitle>
          <DialogDescription>
            {step === 'form' && 'Preencha os dados e aceite os termos para continuar.'}
            {step === 'capture' && 'Posicione o rosto na câmera para o reconhecimento.'}
            {step === 'success' && 'Cadastro realizado com sucesso!'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'form' && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ex: João da Silva"
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input 
                  id="cpf" 
                  value={cpf} 
                  onChange={(e) => setCpf(e.target.value)} 
                  placeholder="000.000.000-00"
                  required 
                />
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox 
                  id="terms" 
                  checked={acceptedTerms} 
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Aceito os Termos de Uso e Privacidade
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Autorizo o uso da minha imagem para reconhecimento facial neste sistema de demonstração.
                    Os dados são armazenados localmente e não são compartilhados.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={!name.trim() || !cpf.trim() || !acceptedTerms}>
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          )}

          {step === 'capture' && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-inner group">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform scale-x-[-1]" 
                />
                
                {/* Face Guide Overlay Moderno */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
                  {/* Área Oval de Foco */}
                  <div className="relative w-[45%] h-[75%]">
                    {/* Sombra Externa (Máscara) */}
                    <div className="absolute inset-0 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]" />
                    
                    {/* Borda Oval Dinâmica */}
                    <div className={cn(
                      "absolute inset-0 rounded-[50%] border-4 transition-all duration-300",
                      !faceQuality ? "border-white/20" :
                      faceQuality.score >= 80 ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]" :
                      faceQuality.score >= 40 ? "border-yellow-500" :
                      "border-red-500"
                    )} />
                    
                    {/* Guia Interno Pulsante (apenas se não estiver ok) */}
                    {(!faceQuality || faceQuality.score < 80) && (
                        <div className="absolute inset-0 rounded-[50%] border-2 border-white/10 animate-pulse" />
                    )}
                    
                    {/* Crosshair Discreto */}
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10" />
                    <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/10" />
                  </div>

                  {/* Barra de Progresso e Feedback */}
                  <div className="absolute bottom-[8%] w-[60%] flex flex-col items-center gap-4 z-10">
                     {/* Barra */}
                     <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                        <div 
                            className={cn("h-full transition-all duration-300 ease-out",
                             !faceQuality ? "w-0" :
                             faceQuality.score >= 80 ? "bg-green-500" :
                             faceQuality.score >= 40 ? "bg-yellow-500" :
                             "bg-red-500"
                            )}
                            style={{ width: `${Math.min(100, (faceQuality?.score || 0))}%` }}
                        />
                     </div>
                     
                     {/* Mensagem de Feedback */}
                     <div className={cn(
                       "px-6 py-2 rounded-full backdrop-blur-md border font-medium shadow-lg text-center transition-all duration-300 min-w-[200px]",
                       !isModelLoaded
                         ? "bg-blue-500/20 border-blue-500/50 text-blue-100"
                         : countdown !== null 
                         ? "bg-green-500/20 border-green-500/50 text-green-100" 
                         : faceQuality && faceQuality.score >= 80
                           ? "bg-green-900/40 border-green-500/30 text-green-100"
                           : "bg-black/40 border-white/10 text-white"
                     )}>
                        {!isModelLoaded ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Carregando IA...
                            </div>
                        ) : countdown !== null ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                              </span>
                              Perfeito! Não se mova...
                            </div>
                        ) : !faceQuality ? (
                            "Posicione seu rosto no oval"
                        ) : faceQuality.score >= 80 ? (
                            "Mantenha parado para capturar"
                        ) : faceQuality.score >= 40 ? (
                            "Ajuste a posição..."
                        ) : (
                            "Enquadre seu rosto"
                        )}
                     </div>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Processando cadastro biométrico...</p>
                </div>
              ) : (
                <FaceCapture 
                  videoRef={videoRef}
                  isStreaming={isStreaming}
                  onCapture={handleCapturesComplete}
                  requiredCaptures={3}
                  onQualityChange={setFaceQuality}
                  onCountdownChange={setCountdown}
                  onModelLoad={setIsModelLoaded}
                />
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Cadastro Concluído!</h3>
                <p className="text-muted-foreground mt-1">
                  {name} foi registrado(a) com sucesso.
                </p>
                <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  Biometria facial ativa
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
