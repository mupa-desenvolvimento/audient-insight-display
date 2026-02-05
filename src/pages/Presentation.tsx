 import { useState, useEffect } from "react";
 import { motion } from "framer-motion";
 import { 
   Monitor, 
   Wifi, 
   WifiOff, 
   Users, 
   BarChart3, 
   Layers, 
   Palette, 
   Store, 
   Smartphone,
   Eye,
   Brain,
   Clock,
   Shield,
   Zap,
   ChevronRight,
   Play,
   CheckCircle2,
   ArrowRight
 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import logoHorizontal from "@/assets/logo_horizontal.svg";
 
 const features = [
   {
     icon: Monitor,
     title: "Player de Mídia Inteligente",
     description: "Reprodução de conteúdo em alta definição com suporte a vídeos, imagens e HTML5. Agendamento automático por horários e dias da semana.",
     gradient: "from-blue-500 to-cyan-500"
   },
   {
     icon: WifiOff,
     title: "Funcionamento Offline",
     description: "Continue exibindo conteúdo mesmo sem internet. Sincronização automática quando a conexão é restabelecida.",
     gradient: "from-green-500 to-emerald-500"
   },
   {
     icon: Eye,
     title: "Reconhecimento Facial",
     description: "Análise em tempo real de audiência: idade, gênero, emoções e tempo de atenção. Dados valiosos para decisões estratégicas.",
     gradient: "from-purple-500 to-pink-500"
   },
   {
     icon: BarChart3,
     title: "Analytics Avançado",
     description: "Dashboards completos com métricas de visualização, engajamento e performance de conteúdo por loja e região.",
     gradient: "from-orange-500 to-red-500"
   },
   {
     icon: Layers,
     title: "Gestão de Playlists",
     description: "Editor visual intuitivo com canais múltiplos, agendamento granular e priorização de conteúdo por contexto.",
     gradient: "from-indigo-500 to-violet-500"
   },
   {
     icon: Palette,
     title: "Integração Canva",
     description: "Crie designs profissionais diretamente na plataforma. Importação automática de artes para sua biblioteca.",
     gradient: "from-teal-500 to-cyan-500"
   },
   {
     icon: Store,
     title: "Multi-Tenant",
     description: "Gestão hierárquica de múltiplas empresas, regiões e lojas. Controle granular de permissões e acesso.",
     gradient: "from-amber-500 to-yellow-500"
   },
   {
     icon: Smartphone,
     title: "Consulta de Preços",
     description: "Terminais interativos para consulta de produtos via código de barras. Integração com sistemas de precificação.",
     gradient: "from-rose-500 to-pink-500"
   }
 ];
 
 const benefits = [
   {
     icon: Zap,
     title: "Aumento de Vendas",
     value: "+32%",
     description: "em conversão com mídia direcionada"
   },
   {
     icon: Clock,
     title: "Economia de Tempo",
     value: "80%",
     description: "menos tempo em gestão de conteúdo"
   },
   {
     icon: Brain,
     title: "Insights Valiosos",
     value: "100%",
     description: "de visibilidade sobre sua audiência"
   },
   {
     icon: Shield,
     title: "Alta Disponibilidade",
     value: "99.9%",
     description: "uptime com modo offline"
   }
 ];
 
 const useCases = [
   "Supermercados e Hipermercados",
   "Redes de Farmácias",
   "Lojas de Departamento",
   "Shopping Centers",
   "Postos de Combustível",
   "Redes de Fast Food",
   "Bancos e Instituições Financeiras",
   "Hospitais e Clínicas"
 ];
 
 export default function Presentation() {
   const [currentSlide, setCurrentSlide] = useState(0);
 
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === "ArrowRight" || e.key === " ") {
         setCurrentSlide(prev => Math.min(prev + 1, 4));
       } else if (e.key === "ArrowLeft") {
         setCurrentSlide(prev => Math.max(prev - 1, 0));
       } else if (e.key === "Home") {
         setCurrentSlide(0);
       } else if (e.key === "End") {
         setCurrentSlide(4);
       }
     };
     window.addEventListener("keydown", handleKeyDown);
     return () => window.removeEventListener("keydown", handleKeyDown);
   }, []);
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-x-hidden">
       {/* Navigation dots */}
       <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
         {[0, 1, 2, 3, 4].map((i) => (
           <button
             key={i}
             onClick={() => setCurrentSlide(i)}
             className={`w-3 h-3 rounded-full transition-all duration-300 ${
               currentSlide === i 
                 ? "bg-primary scale-125" 
                 : "bg-white/30 hover:bg-white/50"
             }`}
           />
         ))}
       </div>
 
       {/* Slide 1: Hero */}
       <section 
         className={`min-h-screen flex flex-col items-center justify-center px-8 transition-opacity duration-500 ${
           currentSlide === 0 ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
         }`}
       >
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8 }}
           className="text-center max-w-5xl"
         >
           <img 
             src={logoHorizontal} 
             alt="MUPA" 
             className="h-20 mx-auto mb-8 invert"
           />
           
           <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 text-sm px-4 py-1">
             Plataforma de Sinalização Digital
           </Badge>
           
           <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent leading-tight">
             Transforme suas telas em
             <br />
             <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
               máquinas de vendas
             </span>
           </h1>
           
           <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
             A plataforma completa para gestão de mídia digital em varejo. 
             Inteligência artificial, analytics em tempo real e operação offline-first.
           </p>
           
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Button 
               size="lg" 
               className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
               onClick={() => setCurrentSlide(1)}
             >
               <Play className="w-5 h-5 mr-2" />
               Ver Recursos
             </Button>
             <Button 
               size="lg" 
               variant="outline" 
               className="text-lg px-8 py-6 border-white/20 hover:bg-white/10"
             >
               Agendar Demo
               <ArrowRight className="w-5 h-5 ml-2" />
             </Button>
           </div>
         </motion.div>
         
         <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 text-sm flex items-center gap-2">
           <span>Pressione</span>
           <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">→</kbd>
           <span>para avançar</span>
         </div>
       </section>
 
       {/* Slide 2: Features Grid */}
       <section 
         className={`min-h-screen flex flex-col items-center justify-center px-8 py-16 transition-opacity duration-500 ${
           currentSlide === 1 ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
         }`}
       >
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={currentSlide === 1 ? { opacity: 1, y: 0 } : {}}
           transition={{ duration: 0.6 }}
           className="text-center mb-12"
         >
           <h2 className="text-4xl md:text-5xl font-bold mb-4">
             Recursos <span className="text-primary">Poderosos</span>
           </h2>
           <p className="text-xl text-slate-400 max-w-2xl mx-auto">
             Tudo que você precisa para uma operação de mídia digital de classe mundial
           </p>
         </motion.div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full">
           {features.map((feature, index) => (
             <motion.div
               key={feature.title}
               initial={{ opacity: 0, y: 30 }}
               animate={currentSlide === 1 ? { opacity: 1, y: 0 } : {}}
               transition={{ duration: 0.5, delay: index * 0.1 }}
             >
               <Card className="bg-slate-800/50 border-slate-700/50 hover:border-primary/50 transition-all duration-300 h-full group hover:scale-105">
                 <CardContent className="p-6">
                   <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                     <feature.icon className="w-6 h-6 text-white" />
                   </div>
                   <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                   <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                 </CardContent>
               </Card>
             </motion.div>
           ))}
         </div>
       </section>
 
       {/* Slide 3: Benefits */}
       <section 
         className={`min-h-screen flex flex-col items-center justify-center px-8 py-16 transition-opacity duration-500 ${
           currentSlide === 2 ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
         }`}
       >
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={currentSlide === 2 ? { opacity: 1, y: 0 } : {}}
           transition={{ duration: 0.6 }}
           className="text-center mb-16"
         >
           <h2 className="text-4xl md:text-5xl font-bold mb-4">
             Resultados <span className="text-primary">Comprovados</span>
           </h2>
           <p className="text-xl text-slate-400 max-w-2xl mx-auto">
             Números que transformam o seu negócio
           </p>
         </motion.div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl w-full">
           {benefits.map((benefit, index) => (
             <motion.div
               key={benefit.title}
               initial={{ opacity: 0, scale: 0.8 }}
               animate={currentSlide === 2 ? { opacity: 1, scale: 1 } : {}}
               transition={{ duration: 0.5, delay: index * 0.15 }}
               className="text-center"
             >
               <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-primary/30">
                 <benefit.icon className="w-10 h-10 text-primary" />
               </div>
               <div className="text-5xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
                 {benefit.value}
               </div>
               <h3 className="text-xl font-semibold text-white mb-1">{benefit.title}</h3>
               <p className="text-slate-400">{benefit.description}</p>
             </motion.div>
           ))}
         </div>
       </section>
 
       {/* Slide 4: Use Cases */}
       <section 
         className={`min-h-screen flex flex-col items-center justify-center px-8 py-16 transition-opacity duration-500 ${
           currentSlide === 3 ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
         }`}
       >
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={currentSlide === 3 ? { opacity: 1, y: 0 } : {}}
           transition={{ duration: 0.6 }}
           className="text-center mb-12"
         >
           <h2 className="text-4xl md:text-5xl font-bold mb-4">
             Feito para o <span className="text-primary">Varejo</span>
           </h2>
           <p className="text-xl text-slate-400 max-w-2xl mx-auto">
             Soluções especializadas para diversos segmentos
           </p>
         </motion.div>
         
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-16">
           {useCases.map((useCase, index) => (
             <motion.div
               key={useCase}
               initial={{ opacity: 0, x: -20 }}
               animate={currentSlide === 3 ? { opacity: 1, x: 0 } : {}}
               transition={{ duration: 0.4, delay: index * 0.1 }}
               className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/50"
             >
               <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
               <span className="text-slate-200 text-sm">{useCase}</span>
             </motion.div>
           ))}
         </div>
         
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={currentSlide === 3 ? { opacity: 1, y: 0 } : {}}
           transition={{ duration: 0.6, delay: 0.8 }}
           className="bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-2xl p-8 border border-slate-700/50 max-w-3xl w-full"
         >
           <div className="flex items-start gap-6">
             <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
               <Users className="w-8 h-8 text-primary" />
             </div>
             <div>
               <p className="text-lg text-slate-300 italic mb-4">
                 "Com o MUPA, conseguimos reduzir em 70% o tempo de atualização de conteúdo nas nossas 200 lojas. 
                 A análise de audiência nos permitiu criar campanhas muito mais assertivas."
               </p>
               <p className="text-white font-semibold">Diretor de Marketing</p>
               <p className="text-slate-400 text-sm">Rede de Varejo Nacional</p>
             </div>
           </div>
         </motion.div>
       </section>
 
       {/* Slide 5: CTA */}
       <section 
         className={`min-h-screen flex flex-col items-center justify-center px-8 py-16 transition-opacity duration-500 ${
           currentSlide === 4 ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
         }`}
       >
         <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={currentSlide === 4 ? { opacity: 1, scale: 1 } : {}}
           transition={{ duration: 0.6 }}
           className="text-center max-w-4xl"
         >
           <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-8">
             <Monitor className="w-12 h-12 text-white" />
           </div>
           
           <h2 className="text-4xl md:text-6xl font-bold mb-6">
             Pronto para <span className="text-primary">transformar</span>
             <br />sua comunicação visual?
           </h2>
           
           <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
             Agende uma demonstração gratuita e descubra como o MUPA pode 
             revolucionar a experiência nas suas lojas.
           </p>
           
           <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
             <Button 
               size="lg" 
               className="text-xl px-10 py-7 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
             >
               Agendar Demonstração
               <ChevronRight className="w-6 h-6 ml-2" />
             </Button>
             <Button 
               size="lg" 
               variant="outline" 
               className="text-xl px-10 py-7 border-white/20 hover:bg-white/10"
             >
               Falar com Consultor
             </Button>
           </div>
           
           <div className="flex items-center justify-center gap-8 text-slate-400">
             <div className="flex items-center gap-2">
               <CheckCircle2 className="w-5 h-5 text-primary" />
               <span>Setup em 24h</span>
             </div>
             <div className="flex items-center gap-2">
               <CheckCircle2 className="w-5 h-5 text-primary" />
               <span>Suporte dedicado</span>
             </div>
             <div className="flex items-center gap-2">
               <CheckCircle2 className="w-5 h-5 text-primary" />
               <span>Sem fidelidade</span>
             </div>
           </div>
         </motion.div>
         
         <motion.div
           initial={{ opacity: 0 }}
           animate={currentSlide === 4 ? { opacity: 1 } : {}}
           transition={{ duration: 0.6, delay: 0.5 }}
           className="absolute bottom-8"
         >
           <img 
             src={logoHorizontal} 
             alt="MUPA" 
             className="h-8 invert opacity-50"
           />
         </motion.div>
       </section>
     </div>
   );
 }