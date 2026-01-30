import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Video
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Monitor,
    title: "Gestão de Dispositivos",
    description: "Monitore e controle todos os displays em tempo real com status de conexão e diagnósticos."
  },
  {
    icon: Image,
    title: "Biblioteca de Mídia",
    description: "Upload e organização de imagens, vídeos e conteúdos dinâmicos em um só lugar."
  },
  {
    icon: Play,
    title: "Playlists Inteligentes",
    description: "Crie sequências de conteúdo com duração, transições e programação personalizada."
  },
  {
    icon: Calendar,
    title: "Agendamento Avançado",
    description: "Programe conteúdos por horário, dia da semana e período com total flexibilidade."
  },
  {
    icon: Layers,
    title: "Canais de Distribuição",
    description: "Organize conteúdos em canais temáticos: ofertas, institucional, notícias e mais."
  },
  {
    icon: Store,
    title: "Multi-Lojas",
    description: "Gerencie milhares de lojas organizadas por região, estado e cidade."
  },
  {
    icon: Users,
    title: "Detecção de Audiência",
    description: "IA que detecta gênero, idade e tempo de atenção do público em tempo real."
  },
  {
    icon: BarChart3,
    title: "Analytics Completo",
    description: "Dashboards com métricas de engajamento, alcance e performance de conteúdo."
  },
  {
    icon: Wifi,
    title: "Offline-First",
    description: "Players funcionam mesmo sem internet, sincronizando quando a conexão retorna."
  },
  {
    icon: Shield,
    title: "Controle de Acesso",
    description: "Múltiplos níveis de permissão: global, regional, loja e operador."
  },
  {
    icon: Video,
    title: "Player Profissional",
    description: "Reprodução suave de vídeos e imagens com transições e layouts customizados."
  },
  {
    icon: Settings,
    title: "Perfis de Display",
    description: "Configure orientação, resolução e comportamentos por tipo de tela."
  }
];

const stats = [
  { label: "Dispositivos", value: "1,600+", icon: Monitor },
  { label: "Lojas Ativas", value: "500+", icon: Store },
  { label: "Conteúdos", value: "10K+", icon: Image },
  { label: "Uptime", value: "99.9%", icon: Zap }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logoHorizontal} alt="MupaMídias" className="h-10" />
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link to="/auth">
              <Button>Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-foreground">Digital Signage com </span>
              <span className="text-gradient">Inteligência Artificial</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Plataforma completa para gestão de mídias digitais em escala nacional. 
              Reconhecimento de público, analytics avançados e distribuição inteligente de conteúdo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gradient-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all">
                  <Eye className="mr-2 h-5 w-5" />
                  Acessar Sistema
                </Button>
              </Link>
              <Link to="/player">
                <Button size="lg" variant="outline">
                  <Play className="mr-2 h-5 w-5" />
                  Ver Player Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div 
                key={stat.label} 
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Recursos Completos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tudo o que você precisa para gerenciar sua rede de digital signage em um único lugar.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="animate-fade-in hover:shadow-lg transition-all duration-300 border-border bg-card"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardHeader>
                  <feature.icon className="w-10 h-10 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 gradient-primary">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Pronto para começar?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Entre no sistema e comece a gerenciar sua rede de digital signage com inteligência artificial.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="shadow-lg">
              Entrar no Sistema
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border bg-card">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center">
            <img src={logoHorizontal} alt="MupaMídias" className="h-8" />
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MupaMídias. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
