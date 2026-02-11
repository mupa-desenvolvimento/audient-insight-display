import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronRight, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TutorialStep {
  targetId: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right" | "center";
}

const STEPS: TutorialStep[] = [
  {
    targetId: "demo-header",
    title: "Bem-vindo à Demo",
    content: "Esta é a demonstração do sistema de análise de audiência. Aqui você pode ver em tempo real como o sistema detecta e analisa faces.",
    position: "bottom",
  },
  {
    targetId: "camera-select",
    title: "Seleção de Câmera",
    content: "Escolha qual câmera deseja utilizar para a detecção. O sistema suporta múltiplas câmeras conectadas.",
    position: "bottom",
  },
  {
    targetId: "btn-register",
    title: "Cadastro de Pessoas",
    content: "Utilize este botão para cadastrar novas pessoas. O sistema irá reconhecê-las automaticamente quando aparecerem na câmera.",
    position: "bottom",
  },
  {
    targetId: "btn-start",
    title: "Controle da Demonstração",
    content: "Inicie ou pause a detecção facial a qualquer momento. Lembre-se que para cadastrar, a câmera principal será pausada momentaneamente.",
    position: "bottom",
  },
  {
    targetId: "camera-feed",
    title: "Feed da Câmera",
    content: "Aqui você vê o vídeo em tempo real com as marcações de detecção facial e análise de emoções.",
    position: "right",
  },
  {
    targetId: "active-faces",
    title: "Pessoas Detectadas",
    content: "Lista em tempo real das pessoas que estão olhando para a tela, com detalhes como emoção, idade e tempo de atenção.",
    position: "right",
  },
  {
    targetId: "media-player",
    title: "Conteúdo em Exibição",
    content: "Simula uma tela de publicidade ou conteúdo. O sistema rastreia se as pessoas estão olhando para este conteúdo.",
    position: "left",
  },
  {
    targetId: "analytics-panel",
    title: "Estatísticas",
    content: "Gráficos e métricas atualizados em tempo real sobre a audiência, incluindo distribuição de gênero, idade e emoções.",
    position: "left",
  },
];

export function TutorialGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    // Check if user has seen tutorial
    const hasSeen = localStorage.getItem("hasSeenTutorial");
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const step = STEPS[currentStepIndex];
      const element = document.getElementById(step.targetId);

      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Calculate popover position
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const popoverWidth = 320; // Estimated width (w-80 = 20rem = 320px)
        const popoverHeight = 200; // Estimated height
        const margin = 16;

        let top = 0;
        let left = 0;

        switch (step.position) {
          case "top":
            top = rect.top - popoverHeight - margin;
            left = rect.left + (rect.width / 2) - (popoverWidth / 2);
            break;
          case "bottom":
            top = rect.bottom + margin;
            left = rect.left + (rect.width / 2) - (popoverWidth / 2);
            break;
          case "left":
            top = rect.top + (rect.height / 2) - (popoverHeight / 2);
            left = rect.left - popoverWidth - margin;
            break;
          case "right":
            top = rect.top + (rect.height / 2) - (popoverHeight / 2);
            left = rect.right + margin;
            break;
          case "center":
          default:
            top = (viewportHeight / 2) - (popoverHeight / 2);
            left = (viewportWidth / 2) - (popoverWidth / 2);
            break;
        }

        // Clamp to viewport
        if (left < margin) left = margin;
        if (left + popoverWidth > viewportWidth - margin) left = viewportWidth - popoverWidth - margin;
        if (top < margin) top = margin;
        if (top + popoverHeight > viewportHeight - margin) top = viewportHeight - popoverHeight - margin;

        setPopoverStyle({
          top: `${top}px`,
          left: `${left}px`,
          position: 'fixed',
          width: `${popoverWidth}px`
        });

      } else {
        // Fallback if element not found (e.g. hidden on mobile)
        setPosition(null);
        setPopoverStyle({
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          position: 'fixed',
          width: '320px'
        });
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updatePosition, 100);
    window.addEventListener("resize", updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenTutorial", "true");
    setTimeout(() => setCurrentStepIndex(0), 300);
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
        onClick={handleRestart}
        title="Ajuda / Tutorial"
      >
        <HelpCircle className="h-6 w-6" />
      </Button>
    );
  }

  const currentStep = STEPS[currentStepIndex];

  return (
    <>
      {/* Backdrop with hole */}
      <div className="fixed inset-0 z-[100] bg-black/60 transition-all duration-300">
        {position && (
          <div
            className="absolute bg-transparent border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-lg transition-all duration-300 ease-in-out"
            style={{
              top: position.top - 4,
              left: position.left - 4,
              width: position.width + 8,
              height: position.height + 8,
            }}
          />
        )}
      </div>

      {/* Dialog Card */}
      <div className="fixed inset-0 z-[101] pointer-events-none">
        <div 
          key={currentStepIndex}
          className="bg-card text-card-foreground p-6 rounded-lg shadow-xl border pointer-events-auto transition-all duration-500 ease-in-out animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
          style={popoverStyle}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs animate-bounce">
                {currentStepIndex + 1}
              </span>
              {currentStep.title}
            </h3>
            <span className="text-xs text-muted-foreground">
              {currentStepIndex + 1} de {STEPS.length}
            </span>
          </div>
          
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            {currentStep.content}
          </p>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground hover:text-destructive">
              Encerrar
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
                {currentStepIndex === STEPS.length - 1 ? (
                  <>
                    Concluir <CheckCircle2 className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Próximo <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
