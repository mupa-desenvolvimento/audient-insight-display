import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  Users,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Sparkles,
  Send,
  RefreshCw,
  Heart,
  ShoppingBag,
  Monitor,
  Tv,
  Loader2,
  Bot,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

type InsightSection =
  | "full-analysis"
  | "audience"
  | "recommendations"
  | "segmentation"
  | "trade-marketing"
  | "monetization";

const SECTIONS: {
  id: InsightSection;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}[] = [
  {
    id: "full-analysis",
    label: "Vis├úo Geral",
    icon: Brain,
    description: "An├ílise completa do sistema com insights de IA",
    color: "text-purple-500",
  },
  {
    id: "audience",
    label: "Audi├¬ncia",
    icon: Users,
    description: "Perfil demogr├ífico e comportamental",
    color: "text-blue-500",
  },
  {
    id: "recommendations",
    label: "Recomenda├º├Áes",
    icon: ShoppingBag,
    description: "Cross-sell e personaliza├º├úo inteligente",
    color: "text-green-500",
  },
  {
    id: "segmentation",
    label: "Segmenta├º├úo",
    icon: Target,
    description: "Conte├║do din├ómico por perfil e hor├írio",
    color: "text-orange-500",
  },
  {
    id: "trade-marketing",
    label: "Trade Marketing",
    icon: BarChart3,
    description: "Audi├¬ncia por campanha e regi├úo",
    color: "text-cyan-500",
  },
  {
    id: "monetization",
    label: "Monetiza├º├úo",
    icon: DollarSign,
    description: "Valora├º├úo e relat├│rios de tela",
    color: "text-yellow-500",
  },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inky-insights`;

const InkyIntelligence = () => {
  const [activeTab, setActiveTab] = useState<InsightSection>("full-analysis");
  const [insights, setInsights] = useState<Record<string, string>>({});
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const { toast } = useToast();

  const streamInsight = useCallback(
    async (section: InsightSection, customQuestion?: string) => {
      setLoadingSection(section);
      setInsights((prev) => ({ ...prev, [section]: "" }));

      try {
        const resp = await fetch(`${CHAT_URL}?action=${section}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ question: customQuestion || "" }),
        });

        if (!resp.ok) {
          if (resp.status === 429) {
            toast({ title: "Limite excedido", description: "Tente novamente em alguns instantes.", variant: "destructive" });
            return;
          }
          if (resp.status === 402) {
            toast({ title: "Cr├®ditos insuficientes", description: "Adicione cr├®ditos ao workspace.", variant: "destructive" });
            return;
          }
          throw new Error("Erro ao gerar insights");
        }

        if (!resp.body) throw new Error("No stream");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulated += content;
                setInsights((prev) => ({ ...prev, [section]: accumulated }));
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // Flush remaining
        if (buffer.trim()) {
          for (let raw of buffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulated += content;
                setInsights((prev) => ({ ...prev, [section]: accumulated }));
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error("Stream error:", err);
        toast({ title: "Erro", description: "Falha ao gerar an├ílise.", variant: "destructive" });
      } finally {
        setLoadingSection(null);
      }
    },
    [toast]
  );

  const handleAskQuestion = () => {
    if (!question.trim()) return;
    streamInsight(activeTab, question);
    setQuestion("");
  };

  const currentSection = SECTIONS.find((s) => s.id === activeTab)!;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-500/50 shadow-lg shadow-purple-500/20 flex items-center justify-center bg-purple-100 dark:bg-purple-900/50">
            <Bot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Inky Intelligence
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                AI Powered
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm">
              An├ílises avan├ºadas, recomenda├º├Áes e monetiza├º├úo de audi├¬ncia
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const hasContent = !!insights[section.id];
          return (
            <Card
              key={section.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeTab === section.id ? "ring-2 ring-purple-500/50 shadow-lg" : ""
              }`}
              onClick={() => setActiveTab(section.id)}
            >
              <CardContent className="p-3 text-center">
                <Icon className={`h-6 w-6 mx-auto mb-1 ${section.color}`} />
                <p className="text-xs font-medium truncate">{section.label}</p>
                {hasContent && (
                  <div className="w-2 h-2 rounded-full bg-green-500 mx-auto mt-1" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-purple-500/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <currentSection.icon className={`h-5 w-5 ${currentSection.color}`} />
                <div>
                  <CardTitle className="text-lg">{currentSection.label}</CardTitle>
                  <CardDescription>{currentSection.description}</CardDescription>
                </div>
              </div>
              <Button
                onClick={() => streamInsight(activeTab)}
                disabled={loadingSection === activeTab}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {loadingSection === activeTab ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {insights[activeTab] ? "Reanalisar" : "Gerar An├ílise"}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Question input */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Fa├ºa uma pergunta espec├¡fica ao Inky sobre esta se├º├úo..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAskQuestion();
                }}
                disabled={loadingSection !== null}
                className="border-muted-foreground/20 focus-visible:ring-purple-500"
              />
              <Button
                onClick={handleAskQuestion}
                disabled={!question.trim() || loadingSection !== null}
                size="icon"
                variant="outline"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Insight content */}
            <ScrollArea className="h-[500px]">
              {loadingSection === activeTab && !insights[activeTab] ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500/50 animate-pulse flex items-center justify-center bg-purple-100 dark:bg-purple-900/50">
                    <Bot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Inky est├í analisando os dados...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Processando detec├º├Áes, demografias e padr├Áes
                    </p>
                  </div>
                </div>
              ) : insights[activeTab] ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>h2]:text-lg [&>h2]:mt-6 [&>h2]:mb-3 [&>h3]:text-base [&>h3]:mt-4 [&>table]:w-full [&>table]:text-sm [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_th]:bg-muted/50 [&_tr]:border-b [&_tr]:border-border">
                  <ReactMarkdown>{insights[activeTab]}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-muted opacity-50 flex items-center justify-center bg-purple-100 dark:bg-purple-900/50">
                    <Bot className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Clique em "Gerar An├ílise" para o Inky analisar seus dados
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ou fa├ºa uma pergunta espec├¡fica no campo acima
                    </p>
                  </div>

                  {/* Feature highlights for this section */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {activeTab === "full-analysis" && (
                      <>
                        <FeatureChip icon={Brain} label="Insights autom├íticos por IA" />
                        <FeatureChip icon={Users} label="An├ílise comportamental" />
                        <FeatureChip icon={TrendingUp} label="Padr├Áes de consumo" />
                        <FeatureChip icon={Target} label="Sugest├Áes de campanha" />
                      </>
                    )}
                    {activeTab === "audience" && (
                      <>
                        <FeatureChip icon={Users} label="Perfil demogr├ífico" />
                        <FeatureChip icon={Heart} label="Emo├º├Áes detectadas" />
                        <FeatureChip icon={Monitor} label="Tempo de exposi├º├úo" />
                        <FeatureChip icon={BarChart3} label="Hor├írios de pico" />
                      </>
                    )}
                    {activeTab === "recommendations" && (
                      <>
                        <FeatureChip icon={ShoppingBag} label="Cross-sell autom├ítico" />
                        <FeatureChip icon={Target} label="Produtos complementares" />
                        <FeatureChip icon={TrendingUp} label="Prioriza├º├úo por margem" />
                        <FeatureChip icon={Users} label="Personaliza├º├úo por perfil" />
                      </>
                    )}
                    {activeTab === "segmentation" && (
                      <>
                        <FeatureChip icon={Tv} label="M├¡dia por perfil" />
                        <FeatureChip icon={Users} label="Faixa et├íria predominante" />
                        <FeatureChip icon={Heart} label="Emo├º├úo predominante" />
                        <FeatureChip icon={Target} label="Prioriza├º├úo de campanhas" />
                      </>
                    )}
                    {activeTab === "trade-marketing" && (
                      <>
                        <FeatureChip icon={BarChart3} label="Audi├¬ncia por campanha" />
                        <FeatureChip icon={Users} label="Perfil por m├¡dia" />
                        <FeatureChip icon={Monitor} label="Tempo de exposi├º├úo" />
                        <FeatureChip icon={Target} label="Compara├º├úo entre lojas" />
                      </>
                    )}
                    {activeTab === "monetization" && (
                      <>
                        <FeatureChip icon={DollarSign} label="Valora├º├úo por audi├¬ncia" />
                        <FeatureChip icon={TrendingUp} label="CPM estimado" />
                        <FeatureChip icon={Monitor} label="Valor por loja" />
                        <FeatureChip icon={BarChart3} label="Relat├│rios para fornecedores" />
                      </>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function FeatureChip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

export default InkyIntelligence;
