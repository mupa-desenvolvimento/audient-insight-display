import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  BarChart3, 
  Brain, 
  ArrowRight,
  LucideIcon,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeadFormModal, LeadFormType } from "./LeadFormModal";
import { PlansComparisonModal } from "./PlansComparisonModal";

// Types for Plan Data
interface PlanFeature {
  title: string;
  items: string[];
}

interface Plan {
  id: string;
  name: string;
  theme: "green" | "blue" | "purple";
  tagline: string;
  description: string;
  buttonText: string;
  details: PlanFeature[];
}

const plans: Plan[] = [
  {
    id: "flow",
    name: "MUPA FLOW",
    theme: "green",
    tagline: "Controle total. Simples. Escalável.",
    description: "Gerencie todas as telas da sua rede com máxima performance, organização hierárquica e estabilidade offline.",
    buttonText: "Quero organizar minhas telas",
    details: [
      {
        title: "Distribuição e Gestão",
        items: [
          "Motor hierárquico (Canal → Região → Loja → Grupo → Dispositivo)",
          "Playlists por canal",
          "Múltiplos canais por dispositivo",
          "Agendamento de campanhas",
          "Upload de imagens e vídeos otimizados",
          "Links únicos por dispositivo",
          "Ativação por código",
          "Revogação remota"
        ]
      },
      {
        title: "Performance",
        items: [
          "Player offline-first com cache inteligente",
          "Atualização por versionamento",
          "Lazy loading",
          "Loop contínuo sem travamentos",
          "Otimização automática de mídia"
        ]
      },
      {
        title: "Monitoramento",
        items: [
          "Status online/offline",
          "Visualização da mídia atual",
          "Histórico de atualizações"
        ]
      }
    ]
  },
  {
    id: "insight",
    name: "MUPA INSIGHT",
    theme: "blue",
    tagline: "Dados reais. Decisões inteligentes.",
    description: "Descubra quem olha para suas telas, quais produtos despertam interesse e quais campanhas realmente performam.",
    buttonText: "Quero entender meu público",
    details: [
      {
        title: "Inclui tudo do Flow +",
        items: []
      },
      {
        title: "Analytics de Consulta de Produtos",
        items: [
          "Registro de cada leitura de produto",
          "Quantidade de consultas por item",
          "Ranking de produtos mais consultados",
          "Relatórios por loja, setor, dia e horário"
        ]
      },
      {
        title: "Audience Analytics",
        items: [
          "Contagem de pessoas por tela",
          "Tempo médio de atenção",
          "Idade aproximada",
          "Gênero",
          "Emoção predominante"
        ]
      },
      {
        title: "Correlação Mídia x Público",
        items: [
          "Registro da mídia exibida no momento da visualização",
          "Ranking de mídias mais vistas",
          "Heatmap de atenção por horário"
        ]
      },
      {
        title: "Performance de Campanha",
        items: [
          "Score automático de performance",
          "Comparativo entre lojas",
          "Exportação de relatórios"
        ]
      }
    ]
  },
  {
    id: "impact",
    name: "MUPA IMPACT",
    theme: "purple",
    tagline: "Personalização em tempo real. Monetização de audiência.",
    description: "Transforme cada tela em um ativo estratégico de vendas com personalização dinâmica e inteligência artificial.",
    buttonText: "Quero transformar minhas telas em ativo estratégico",
    details: [
      {
        title: "Inclui tudo do Insight +",
        items: []
      },
      {
        title: "Fidelidade Inteligente",
        items: [
          "Cadastro de clientes",
          "Histórico de compras",
          "Perfil comportamental",
          "Sugestão personalizada de produtos"
        ]
      },
      {
        title: "Recomendação Automática",
        items: [
          "Cross-sell após consulta",
          "Sugestão por margem ou campanha ativa",
          "Produtos complementares"
        ]
      },
      {
        title: "Segmentação Dinâmica",
        items: [
          "Alteração automática de mídia conforme perfil detectado",
          "Priorização por idade, gênero, emoção e horário"
        ]
      },
      {
        title: "Trade Marketing",
        items: [
          "Dashboard exclusivo para fornecedores",
          "Audiência por campanha",
          "Perfil demográfico por mídia",
          "Comparação entre lojas e regiões"
        ]
      },
      {
        title: "Monetização de Tela",
        items: [
          "Valoração por audiência real",
          "Estimativa de valor por horário",
          "Relatórios para negociação comercial"
        ]
      },
      {
        title: "Insights com IA",
        items: [
          "Análises automáticas de comportamento",
          "Sugestões de melhoria de campanhas",
          "Identificação de padrões de consumo"
        ]
      }
    ]
  }
];

const PlanCard = ({ plan, onAction }: { plan: Plan; onAction: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const themeColors = {
    green: "from-green-500 to-emerald-700 border-green-500/30 hover:border-green-500/60 text-green-400 bg-green-500/10",
    blue: "from-blue-500 to-cyan-700 border-blue-500/30 hover:border-blue-500/60 text-blue-400 bg-blue-500/10",
    purple: "from-purple-500 to-pink-700 border-purple-500/30 hover:border-purple-500/60 text-purple-400 bg-purple-500/10"
  };

  const buttonStyles: Record<string, string> = {
    flow: "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 shadow-sm",
    insight: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20 border-0",
    impact: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl shadow-purple-500/30 border-0 font-bold tracking-wide"
  };

  const iconMap: Record<string, LucideIcon> = {
    green: Zap,
    blue: BarChart3,
    purple: Brain
  };

  const Icon = iconMap[plan.theme];

  return (
    <motion.div 
      layout
      className={cn(
        "relative rounded-2xl border bg-black/40 backdrop-blur-sm overflow-hidden transition-all duration-300",
        `border-${plan.theme}-500/20`,
        isExpanded ? "ring-2 ring-offset-0 ring-offset-transparent ring-opacity-50 z-20" : "hover:border-opacity-50 z-10",
        plan.theme === "green" && isExpanded && "ring-green-500",
        plan.theme === "blue" && isExpanded && "ring-blue-500",
        plan.theme === "purple" && isExpanded && "ring-purple-500",
        plan.id === "impact" && !isExpanded && "border-purple-500/40 shadow-purple-900/10 shadow-2xl"
      )}
    >
      {/* Top Gradient Line */}
      <div className={cn("h-1 w-full bg-gradient-to-r", themeColors[plan.theme].split(" ")[0] + " " + themeColors[plan.theme].split(" ")[1])} />

      <div className="p-6 md:p-8 flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <div className={cn("inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4", themeColors[plan.theme].split(" ").slice(3).join(" "))}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{plan.name}</h3>
          <p className={cn("text-sm font-medium uppercase tracking-wider mb-4", themeColors[plan.theme].split(" ")[2])}>
            {plan.tagline}
          </p>
          <p className="text-gray-400 leading-relaxed min-h-[60px]">
            {plan.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto space-y-4">
          <Button 
            variant="outline" 
            className="w-full border-white/10 hover:bg-white/5 text-white group"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 ml-2 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2 text-gray-400 group-hover:translate-y-0.5 transition-transform" />
            )}
          </Button>

          {!isExpanded && (
            <Button 
              className={cn("w-full text-white font-medium", buttonStyles[plan.id])}
              onClick={onAction}
            >
              {plan.buttonText}
            </Button>
          )}
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-8 border-t border-white/10 mt-6 space-y-8">
                {plan.details.map((section, idx) => (
                  <div key={idx}>
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      {section.title.includes("Inclui tudo") ? (
                        <span className="text-gray-400 italic">{section.title}</span>
                      ) : (
                        section.title
                      )}
                    </h4>
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <CheckCircle2 className={cn("w-4 h-4 mt-0.5 shrink-0", themeColors[plan.theme].split(" ")[2])} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <Button 
                  className={cn("w-full h-12 text-lg font-medium text-white mt-4", buttonStyles[plan.id])}
                  onClick={onAction}
                >
                  {plan.buttonText}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const PlansSection = () => {
  const [leadFormType, setLeadFormType] = useState<LeadFormType | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const handlePlanAction = (planId: string) => {
    // Map plan IDs to form types
    if (planId === "flow") setLeadFormType("flow");
    if (planId === "insight") setLeadFormType("insight");
    if (planId === "impact") setLeadFormType("impact");
  };

  return (
    <section className="py-24 bg-black relative overflow-hidden" id="plans">
      <LeadFormModal 
        isOpen={!!leadFormType} 
        onClose={() => setLeadFormType(null)} 
        type={leadFormType || "general"} 
      />
      
      <PlansComparisonModal 
        isOpen={isComparisonOpen} 
        onClose={() => setIsComparisonOpen(false)}
        onSelectPlan={(plan) => {
          setIsComparisonOpen(false);
          setLeadFormType(plan);
        }}
      />

      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,0,255,0.05),transparent_70%)]" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Transforme suas telas em <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                inteligência de vendas
              </span>
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              Escolha o nível de tecnologia ideal para sua operação e evolua do controle total à personalização inteligente com dados reais de audiência.
            </p>
          </motion.div>
        </div>

        {/* Plans Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-start mb-32">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PlanCard plan={plan} onAction={() => handlePlanAction(plan.id)} />
            </motion.div>
          ))}
        </div>

        {/* Intermediate CTA - Comparison */}
        <div className="text-center mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex flex-col items-center gap-4"
          >
            <h3 className="text-2xl text-gray-300 font-medium">Ainda não sabe qual plano escolher?</h3>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setIsComparisonOpen(true)}
              className="h-14 px-8 text-lg rounded-full border-white/20 hover:bg-white/10 text-white gap-2"
            >
              <Scale className="w-5 h-5" />
              Comparar planos
            </Button>
          </motion.div>
        </div>

        {/* Bottom CTA Block */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-gray-900 to-black text-center p-12 md:p-20"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,0,255,0.15),transparent_70%)]" />
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Pronto para transformar suas telas em inteligência de mercado?
            </h2>
            <p className="text-xl text-gray-400 mb-10 leading-relaxed">
              A Mupa vai além do digital signage tradicional. Entregamos dados reais de comportamento, análise de audiência e personalização estratégica para o varejo moderno.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button 
                        size="lg" 
                        onClick={() => setLeadFormType("general")}
                        className="h-14 px-8 text-lg rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
                      >
                        Falar com especialista Mupa
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={() => setLeadFormType("demo")}
                        className="h-14 px-8 text-lg rounded-full border-white/20 hover:bg-white/10 text-white"
                      >
                        Agendar reunião executiva
                      </Button>
                    </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
