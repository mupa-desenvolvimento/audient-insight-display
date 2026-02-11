import { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Zap, BarChart3, Brain, Monitor, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlansCarouselProps {
  onPlanSelect: (plan: 'lite' | 'flow' | 'insight' | 'impact') => void;
  visiblePlans?: string[];
}

export function PlansCarousel({ onPlanSelect, visiblePlans }: PlansCarouselProps) {
  const plugin = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: true })
  );

  const allSlides = [
    {
      id: "intro",
      theme: "neutral",
      content: (
        <div className="flex flex-col items-center justify-center text-center h-full p-6 md:p-12 space-y-6">
          <Badge variant="outline" className="px-4 py-1 text-sm border-white/20 text-gray-300">
            Maturidade Digital
          </Badge>
          <h3 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Não é apenas TV.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              É Inteligência de Vendas.
            </span>
          </h3>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Do terminal offline mais robusto do mercado à inteligência artificial que personaliza ofertas em tempo real. Qual é o seu momento?
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mt-8">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <Monitor className="w-6 h-6 text-zinc-400" />
              <span className="text-sm font-bold text-zinc-300">Estabilidade</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <Zap className="w-6 h-6 text-green-400" />
              <span className="text-sm font-bold text-green-300">Agilidade</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              <span className="text-sm font-bold text-blue-300">Dados</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <Brain className="w-6 h-6 text-purple-400" />
              <span className="text-sm font-bold text-purple-300">IA Real</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "lite",
      theme: "zinc",
      planId: 'lite',
      title: "MUPA LITE",
      headline: "Sua tela preta está queimando dinheiro.",
      description: "Internet cai? O sistema trava? Não com o Mupa Lite. A solução blindada que garante sua oferta visível 100% do tempo.",
      painPoints: ["Chega de telas pretas", "Fim da dependência de internet", "Zero custo de servidor"],
      cta: "Quero estabilidade total",
      icon: Monitor,
      gradient: "from-zinc-500 to-zinc-700"
    },
    {
      id: "flow",
      theme: "green",
      planId: 'flow',
      title: "MUPA FLOW",
      headline: "Ainda usa Pen Drive? Sua concorrência agradece.",
      description: "Atualize 100 lojas em segundos, não semanas. Centralize sua gestão, agende campanhas e elimine o erro humano.",
      painPoints: ["Fim da logística de pen drive", "Campanhas no ar em segundos", "Controle total da rede"],
      cta: "Automatizar minha rede",
      icon: Zap,
      gradient: "from-green-500 to-emerald-700"
    },
    {
      id: "insight",
      theme: "blue",
      planId: 'insight',
      title: "MUPA INSIGHT",
      headline: "Pare de chutar. Comece a lucrar.",
      description: "Quantas pessoas olharam sua vitrine hoje? O Mupa Insight transforma 'acho que' em 'eu sei que'. Dados reais para decisões que imprimem dinheiro.",
      painPoints: ["Saiba quem olha sua vitrine", "Descubra o produto campeão", "ROI comprovado com dados"],
      cta: "Descobrir meus números",
      icon: BarChart3,
      gradient: "from-blue-500 to-cyan-700"
    },
    {
      id: "impact",
      theme: "purple",
      planId: 'impact',
      title: "MUPA IMPACT",
      headline: "Venda para quem está comprando. AGORA.",
      description: "Uma tela que sabe quem está olhando e muda a oferta na hora. Homem, 30 anos? Tênis. Mulher, 25? Bolsa. Aumente sua conversão em até 40%.",
      painPoints: ["Oferta certa na hora certa", "Personalização via IA", "O topo da tecnologia"],
      cta: "Quero vender com IA",
      icon: Brain,
      gradient: "from-purple-500 to-pink-700"
    }
  ];

  const slides = visiblePlans 
    ? allSlides.filter(slide => slide.id === 'intro' || (slide.planId && visiblePlans.includes(slide.planId)))
    : allSlides;

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <Carousel
        plugins={[plugin.current as any]}
        className="w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index}>
              <Card className={cn(
                "border-0 bg-gradient-to-br min-h-[600px] flex items-center justify-center relative overflow-hidden",
                slide.theme === 'neutral' ? "bg-zinc-950 border border-zinc-800" : "bg-zinc-950"
              )}>
                {/* Background Effects */}
                {slide.gradient && (
                  <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", slide.gradient)} />
                )}
                
                <CardContent className="p-0 w-full h-full relative z-10 flex flex-col items-center justify-center">
                  {slide.content ? (
                    slide.content
                  ) : (
                    <div className="grid md:grid-cols-2 gap-8 p-6 md:p-12 w-full h-full items-center">
                      <div className="space-y-6 text-left">
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10", `text-${slide.theme}-400`)}>
                          {slide.icon && <slide.icon className="w-4 h-4" />}
                          {slide.title}
                        </div>
                        
                        <h3 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                          {slide.headline}
                        </h3>
                        
                        <p className="text-lg text-gray-400 leading-relaxed">
                          {slide.description}
                        </p>

                        <ul className="space-y-3 pt-4">
                          {slide.painPoints?.map((point, i) => (
                            <li key={i} className="flex items-center gap-3 text-gray-300">
                              <CheckCircle2 className={cn("w-5 h-5", `text-${slide.theme}-500`)} />
                              {point}
                            </li>
                          ))}
                        </ul>

                        <div className="pt-6">
                          <Button 
                            size="lg"
                            onClick={() => slide.planId && onPlanSelect(slide.planId as any)}
                            className={cn(
                              "text-lg h-14 px-8 rounded-full font-bold shadow-lg transition-all hover:scale-105",
                              slide.theme === 'zinc' && "bg-zinc-100 text-zinc-900 hover:bg-white",
                              slide.theme === 'green' && "bg-green-600 hover:bg-green-500 text-white shadow-green-900/20",
                              slide.theme === 'blue' && "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20",
                              slide.theme === 'purple' && "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20"
                            )}
                          >
                            {slide.cta}
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </Button>
                        </div>
                      </div>

                      {/* Right Side / Visual Side */}
                      <div className="hidden md:flex flex-col items-center justify-center relative">
                        <div className={cn(
                          "w-64 h-64 rounded-full blur-3xl opacity-20 absolute",
                          `bg-${slide.theme}-500`
                        )} />
                        
                        {/* Abstract Visual Representation */}
                        <div className="relative z-10 p-8 rounded-3xl bg-zinc-900/80 border border-white/10 backdrop-blur-xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                           {slide.theme === 'zinc' && (
                              <div className="text-center space-y-4">
                                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-2" />
                                <div className="text-sm text-gray-400">Sem internet?</div>
                                <div className="text-2xl font-bold text-green-400">Funcionando.</div>
                                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full w-full bg-green-500" />
                                </div>
                              </div>
                           )}
                           {slide.theme === 'green' && (
                              <div className="space-y-3 w-48">
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                  <span>Loja 01</span> <span className="text-green-400">Ok</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                  <span>Loja 02</span> <span className="text-green-400">Ok</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                  <span>Loja 99</span> <span className="text-green-400">Ok</span>
                                </div>
                                <div className="pt-2 border-t border-white/10 text-center">
                                  <span className="text-xs font-bold text-white">Upload Concluído</span>
                                </div>
                              </div>
                           )}
                           {slide.theme === 'blue' && (
                              <div className="space-y-4 text-center">
                                <div className="flex justify-center items-end gap-2 h-24">
                                  <div className="w-4 bg-blue-900/50 h-[40%] rounded-t" />
                                  <div className="w-4 bg-blue-800/50 h-[60%] rounded-t" />
                                  <div className="w-4 bg-blue-500 h-[100%] rounded-t shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                                  <div className="w-4 bg-blue-800/50 h-[70%] rounded-t" />
                                </div>
                                <div className="text-xl font-bold text-white">+142%</div>
                                <div className="text-xs text-gray-400">Engajamento Real</div>
                              </div>
                           )}
                           {slide.theme === 'purple' && (
                              <div className="relative">
                                <div className="absolute -top-6 -right-6 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full animate-pulse">
                                  Detectado
                                </div>
                                <div className="w-20 h-20 rounded-full border-2 border-purple-500 mx-auto flex items-center justify-center mb-4">
                                  <Brain className="w-10 h-10 text-purple-400" />
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-400">Perfil: Jovem/Masc</div>
                                  <div className="text-sm font-bold text-white mt-1">Oferta: Sneakers</div>
                                </div>
                              </div>
                           )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-12 border-zinc-800 bg-black hover:bg-zinc-900 text-white" />
        <CarouselNext className="hidden md:flex -right-12 border-zinc-800 bg-black hover:bg-zinc-900 text-white" />
      </Carousel>
    </div>
  );
}
