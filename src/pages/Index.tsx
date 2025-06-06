
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, BarChart3, Image, Database } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              SignageAI
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Sistema de Digital Signage com IA
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Plataforma completa para gestão de mídias digitais com reconhecimento inteligente de público, 
            analytics avançados e interface moderna.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="animate-fade-in hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <Monitor className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Dispositivos Conectados</CardTitle>
              <CardDescription>Monitore todos os displays em tempo real</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">12</div>
              <p className="text-sm text-muted-foreground">Online agora</p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <Image className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Mídias Ativas</CardTitle>
              <CardDescription>Conteúdos sendo exibidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">47</div>
              <p className="text-sm text-muted-foreground">Em reprodução</p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Público Detectado</CardTitle>
              <CardDescription>Hoje via IA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">1,247</div>
              <p className="text-sm text-muted-foreground">Pessoas detectadas</p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/50" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <Database className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Engajamento</CardTitle>
              <CardDescription>Taxa de atenção média</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">87%</div>
              <p className="text-sm text-muted-foreground">Tempo de visualização</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <Link to="/admin/dashboard">
            <Button size="lg" className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-300">
              Acessar Painel Administrativo
            </Button>
          </Link>
          <div>
            <Link to="/player">
              <Button variant="outline" size="lg" className="ml-4">
                Visualizar Player
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
