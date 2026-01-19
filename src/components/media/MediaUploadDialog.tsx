import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileImage, FileVideo, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MediaUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

type UploadStep = 'idle' | 'validating' | 'uploading' | 'generating_thumbnail' | 'saving' | 'verifying' | 'complete' | 'error';

const STEP_LABELS: Record<UploadStep, string> = {
  idle: 'Aguardando arquivo',
  validating: 'Validando arquivo...',
  uploading: 'Enviando mídia...',
  generating_thumbnail: 'Gerando thumbnail...',
  saving: 'Salvando registro...',
  verifying: 'Verificando acesso...',
  complete: 'Upload concluído!',
  error: 'Erro no upload'
};

const STEP_PROGRESS: Record<UploadStep, number> = {
  idle: 0,
  validating: 10,
  uploading: 40,
  generating_thumbnail: 60,
  saving: 80,
  verifying: 90,
  complete: 100,
  error: 0
};

export function MediaUploadDialog({ open, onOpenChange, onSuccess }: MediaUploadDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<UploadStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const fileType = file.type.toLowerCase();
    const isImage = ALLOWED_IMAGE_TYPES.includes(fileType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileType);

    if (!isImage && !isVideo) {
      const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
        .map(t => t.split('/')[1].toUpperCase())
        .join(', ');
      return { 
        valid: false, 
        error: `Tipo não permitido. Use: ${allowedTypes}` 
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      };
    }

    return { valid: true };
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setCurrentStep('validating');

    const validation = validateFile(file);
    
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Arquivo inválido');
      setCurrentStep('error');
      toast({
        title: "Arquivo inválido",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    setCurrentStep('idle');
  }, [validateFile, toast]);

  const generateVideoThumbnail = useCallback(async (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadeddata = () => {
        // Seek to 1 second for thumbnail
        video.currentTime = 1;
      };

      video.onseeked = () => {
        canvas.width = 1280;
        canvas.height = 720;
        
        // Calculate aspect ratio crop
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = 1280 / 720;
        
        let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
        
        if (videoAspect > canvasAspect) {
          sw = video.videoHeight * canvasAspect;
          sx = (video.videoWidth - sw) / 2;
        } else {
          sh = video.videoWidth / canvasAspect;
          sy = (video.videoHeight - sh) / 2;
        }

        ctx?.drawImage(video, sx, sy, sw, sh, 0, 0, 1280, 720);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        }, 'image/jpeg', 0.85);
      };

      video.onerror = () => {
        console.error('Error loading video for thumbnail');
        URL.revokeObjectURL(video.src);
        resolve(null);
      };

      video.src = URL.createObjectURL(file);
      video.load();
    });
  }, []);

  const generateImageThumbnail = useCallback(async (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = 1280;
        canvas.height = 720;
        
        // Calculate aspect ratio crop
        const imgAspect = img.width / img.height;
        const canvasAspect = 1280 / 720;
        
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        
        if (imgAspect > canvasAspect) {
          sw = img.height * canvasAspect;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / canvasAspect;
          sy = (img.height - sh) / 2;
        }

        ctx?.drawImage(img, sx, sy, sw, sh, 0, 0, 1280, 720);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(img.src);
          resolve(blob);
        }, 'image/jpeg', 0.85);
      };

      img.onerror = () => {
        console.error('Error loading image for thumbnail');
        URL.revokeObjectURL(img.src);
        resolve(null);
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setErrorMessage(null);

    try {
      // Step 1: Validate
      setCurrentStep('validating');
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Step 2: Generate thumbnail locally
      setCurrentStep('generating_thumbnail');
      let thumbnailBlob: Blob | null = null;
      const isVideo = ALLOWED_VIDEO_TYPES.includes(selectedFile.type.toLowerCase());
      
      if (isVideo) {
        thumbnailBlob = await generateVideoThumbnail(selectedFile);
      } else {
        thumbnailBlob = await generateImageThumbnail(selectedFile);
      }

      if (!thumbnailBlob) {
        console.warn('Thumbnail generation failed, continuing without thumbnail');
      }

      // Step 3: Upload to server
      setCurrentStep('uploading');
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileName', selectedFile.name);
      formData.append('fileType', selectedFile.type);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      setCurrentStep('saving');

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Erro ao fazer upload');
      }

      // Step 4: Verify access
      setCurrentStep('verifying');
      
      if (result.fileUrl) {
        try {
          const accessCheck = await fetch(result.fileUrl, { method: 'HEAD' });
          if (!accessCheck.ok) {
            console.warn('File access check returned:', accessCheck.status);
          }
        } catch (e) {
          console.warn('File access check failed:', e);
        }
      }

      // Step 5: Complete
      setCurrentStep('complete');

      toast({
        title: "Upload concluído",
        description: `${selectedFile.name} foi enviado com sucesso.`,
      });

      // Cleanup and close
      setTimeout(() => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setCurrentStep('idle');
        onOpenChange(false);
        onSuccess();
      }, 1000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setCurrentStep('error');
      setErrorMessage(error.message || 'Ocorreu um erro ao enviar o arquivo.');
      toast({
        title: "Erro no upload",
        description: error.message || "Ocorreu um erro ao enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClose = () => {
    if (!uploading) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setCurrentStep('idle');
      setErrorMessage(null);
      onOpenChange(false);
    }
  };

  const isVideo = selectedFile?.type.startsWith('video/');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload de Mídia</DialogTitle>
          <DialogDescription>
            Envie imagens (JPG, PNG, WEBP, GIF) ou vídeos (MP4, WEBM, MOV)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedFile ? (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Clique para selecionar ou arraste um arquivo
              </p>
              <p className="text-xs text-muted-foreground">
                Imagens e vídeos até 100MB
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Preview */}
              {previewUrl && (
                <div className="aspect-video bg-black relative">
                  {isVideo ? (
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      className="w-full h-full object-contain"
                      controls={false}
                      muted
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}
              
              {/* File info */}
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                    {isVideo ? (
                      <FileVideo className="w-5 h-5 text-primary" />
                    ) : (
                      <FileImage className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setErrorMessage(null);
                        setCurrentStep('idle');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Progress section */}
                {(uploading || currentStep === 'complete' || currentStep === 'error') && (
                  <div className="mt-4 space-y-2">
                    <Progress value={STEP_PROGRESS[currentStep]} className="h-2" />
                    <div className="flex items-center gap-2">
                      {currentStep === 'complete' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : currentStep === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      )}
                      <p className={`text-xs ${currentStep === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {currentStep === 'error' && errorMessage ? errorMessage : STEP_LABELS[currentStep]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Input
            ref={fileInputRef}
            type="file"
            accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].map(t => `.${t.split('/')[1]}`).join(',')}
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading || currentStep === 'complete'}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : currentStep === 'complete' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluído
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hidden elements for thumbnail generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}