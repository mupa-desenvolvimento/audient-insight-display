import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoHorizontal from "@/assets/logo_horizontal.svg";
import { 
  Monitor, 
  BarChart3, 
  Image, 
  Users, 
  Play, 
  Calendar, 
  Wifi, 
  Shield, 
  Zap, 
  Eye, 
  Settings,
  Store,
  Layers,
  Video,
  CheckCircle2,
  ArrowRight,
  Brain,
  Smartphone
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
} as const;

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100
    }
  }
};

const Navbar = () => {
  const { scrollY } = useScroll();
  const backgroundOpacity = useTransform(scrollY, [0, 100], [0, 0.9]);
  const backdropBlur = useTransform(scrollY, [0, 100], ["0px", "10px"]);
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 0.1]);

  return (
    <motion.header 
      style={{ 
        backgroundColor: useTransform(backgroundOpacity, o => `rgba(0, 0, 0, ${o})`),
        backdropFilter: useTransform(backdropBlur, b => `blur(${b})`),
        borderBottom: useTransform(borderOpacity, o => `1px solid rgba(255, 255, 255, ${o})`)
      }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.img 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            src={logoHorizontal} 
            alt="MupaMídias" 
            className="h-10 transition-transform group-hover:scale-105" 
          />
        </Link>
        <div className="flex items-center space-x-6">
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Recursos</a>
            <a href="#ai" className="hover:text-white transition-colors">Inteligência Artificial</a>
            <a href="#analytics" className="hover:text-white transition-colors">Analytics</a>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/auth">
              <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-6">
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(120,0,255,0.2),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(0,100,255,0.1),transparent_50%)]" />
      </div>

      <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-left"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-gray-300">Nova Versão 2.0 Disponível</span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight text-white">
            O Futuro do <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Digital Signage
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-xl text-gray-400 mb-8 max-w-xl leading-relaxed">
            Telas e terminais de consulta de preços que viram experiências inteligentes. Conteúdo dinâmico, audiência monitorada e gestão centralizada com a MUPA.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <Link to="/auth">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 shadow-lg shadow-purple-500/20">
                <Zap className="mr-2 h-5 w-5 fill-current" />
                Começar Agora
              </Button>
            </Link>
            <Link to="/player">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm">
                <Play className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </Link>
          </motion.div>

{null}
        </motion.div>

        {/* Hero Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, delay: 0.2, type: "spring" }}
          className="relative hidden lg:block perspective-1000"
        >
          <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-white/10 bg-black/50 backdrop-blur-xl transform rotate-y-12 transition-transform duration-500 hover:rotate-y-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 pointer-events-none" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="text-xs text-gray-500 font-mono">dashboard.mupa.ai</div>
              </div>
              
              {/* Mock Dashboard UI */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-2 h-32 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/5 p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <Monitor className="w-5 h-5 text-blue-400" />
                    <span className="text-xs text-green-400">+12%</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">1,248</div>
                    <div className="text-xs text-gray-400">Displays Ativos</div>
                  </div>
                </div>
                <div className="h-32 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-900/20 border border-purple-500/30 p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
                  <Users className="w-5 h-5 text-purple-400 relative z-10" />
                  <div className="relative z-10">
                    <div className="text-2xl font-bold text-white">85k</div>
                    <div className="text-xs text-gray-400">Alcance Hoje</div>
                  </div>
                </div>
              </div>
              <div className="h-40 rounded-lg bg-white/5 border border-white/5 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-gray-300">Audiência em Tempo Real</div>
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex items-end justify-between gap-2 h-24">
                  {[40, 65, 45, 80, 55, 70, 40, 60, 75, 50, 65, 85].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.05) }}
                      className="w-full bg-blue-500/50 rounded-t-sm hover:bg-blue-400 transition-colors cursor-pointer" 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating Elements */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-xl z-20 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">IA Ativa</div>
              <div className="text-xs text-gray-400">Detectando emoções...</div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-5 -left-5 bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-xl z-20 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Sincronizado</div>
              <div className="text-xs text-gray-400">Todos os dispositivos online</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const FeatureCard = ({ feature, index }: { feature: any, index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:bg-white/10"
    >
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 text-white">
        <feature.icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
      <p className="text-gray-400 leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
};

const Features = () => {
  const features = [
    {
      icon: Monitor,
      title: "Gestão Centralizada",
      description: "Controle milhares de telas de um único dashboard. Atualizações em tempo real e monitoramento de status instantâneo."
    },
    {
      icon: Brain,
      title: "Inteligência Artificial",
      description: "Algoritmos avançados que entendem quem está olhando. Adapte o conteúdo baseado na audiência presente."
    },
    {
      icon: Layers,
      title: "Playlists Dinâmicas",
      description: "Crie regras complexas de exibição baseadas em horário, clima, ou dados externos. Flexibilidade total."
    },
    {
      icon: Store,
      title: "Multi-Tenancy",
      description: "Perfeito para redes de franquias. Hierarquia de permissões para matriz, regionais e lojas locais."
    },
    {
      icon: Smartphone,
      title: "Integração Mobile",
      description: "Gerencie sua rede pelo celular. App responsivo para controle rápido e verificação de status."
    },
    {
      icon: Shield,
      title: "Segurança Enterprise",
      description: "Criptografia de ponta a ponta, logs de auditoria detalhados e conformidade com LGPD."
    }
  ];

  return (
    <section id="features" className="py-24 bg-black relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Poderoso. Simples. <span className="text-purple-400">Inteligente.</span></h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Uma suíte completa de ferramentas projetada para escalar sua operação de digital signage sem complicar sua vida.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const AISection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section id="ai" className="py-24 bg-[#050505] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm font-medium mb-6">
              MUPA AI Vision
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Sua tela agora tem <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">olhos inteligentes</span>
            </h2>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Não apenas exiba conteúdo. Entenda como ele performa. Nossa tecnologia de visão computacional analisa anonimamente quem está olhando para sua tela em tempo real.
            </p>
            
            <div className="space-y-6">
              {[
                { title: "Detecção de Emoções", desc: "Saiba se seu público está feliz, surpreso ou neutro." },
                { title: "Demografia em Tempo Real", desc: "Identifique idade e gênero para segmentar anúncios." },
                { title: "Mapa de Calor de Atenção", desc: "Descubra quais áreas da tela chamam mais atenção." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <Eye className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">{item.title}</h4>
                    <p className="text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="relative">
            <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
               transition={{ duration: 0.8, delay: 0.2 }}
               className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            >
              {/* Simulated Camera Feed UI */}
              <div className="aspect-video bg-gray-900 relative overflow-hidden">
                <img 
                  src="/terminal-woman.jpg" 
                  alt="Crowd Analysis" 
                  className="w-full h-full object-cover opacity-60"
                />
                
                {/* AI Overlays */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 1 }}
                  className="absolute top-1/4 left-1/4 w-24 h-24 border-2 border-green-500 rounded-lg"
                >
                  <div className="absolute -top-6 left-0 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded">
                    Homem, 25-34
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 1 }}
                  className="absolute bottom-1/3 right-1/3 w-20 h-20 border-2 border-purple-500 rounded-lg"
                >
                  <div className="absolute -top-6 left-0 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">
                    Mulher, 18-24
                  </div>
                </motion.div>

                {/* Scan Line Animation */}
                <motion.div 
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 w-full h-px bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]"
                />
              </div>

              {/* Data Panel */}
              <div className="bg-black/80 backdrop-blur-md p-4 border-t border-white/10 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">42</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Pessoas</div>
                </div>
                <div className="text-center border-l border-white/10">
                  <div className="text-2xl font-bold text-green-400">8.5s</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Tempo Médio</div>
                </div>
                <div className="text-center border-l border-white/10">
                  <div className="text-2xl font-bold text-purple-400">Happy</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Emoção Dominante</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CTA = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black to-purple-950/20" />
      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
            Pronto para revolucionar <br/> suas telas?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Junte-se a mais de 500 empresas que já transformaram a experiência de seus clientes com a MUPA.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Link to="/auth">
              <Button size="lg" className="h-16 px-10 text-xl rounded-full bg-white text-black hover:bg-gray-200 transition-all transform hover:scale-105">
                Criar Conta Grátis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Teste grátis por 14 dias. Sem compromisso.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <AISection />
        <CTA />
      </main>
      
      <footer className="py-12 border-t border-white/10 bg-black">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src={logoHorizontal} alt="MupaMídias" className="h-8 opacity-70 grayscale hover:grayscale-0 transition-all" />
            <span className="text-gray-500 text-sm">© 2024 MupaMídias Inc.</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
