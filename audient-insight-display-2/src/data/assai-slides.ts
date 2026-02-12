import { 
  Monitor, 
  Users, 
  BarChart3, 
  Store, 
  TrendingUp, 
  Target, 
  DollarSign, 
  Zap, 
  Globe, 
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  Eye,
  Calendar,
  Clock
} from "lucide-react";
import { Slide } from "@/types/presentation";

export const ASSAI_SLIDES: Slide[] = [
  // 1) Capa
  {
    id: 1,
    layout: "landing-hero",
    title: "Rede de Terminais como Canal Nacional de Mídia",
    subtitle: "MUPA + GRUPO ASSAÍ",
    description: "Transformando a infraestrutura de consulta de preço em um canal mensurável, escalável e monetizável.",
    icon: Monitor
  },
  // 2) Visão Geral
  {
    id: 2,
    layout: "quote",
    title: "Visão Geral",
    subtitle: "O Poder da Rede",
    description: "A rede de terminais de consulta de preço do Assaí representa um dos maiores pontos de contato com consumidores dentro do varejo brasileiro. A Mupa transforma essa infraestrutura em um canal de comunicação direto com o shopper.",
    icon: Globe
  },
  // 3) Escala Nacional
  {
    id: 3,
    layout: "big-numbers",
    title: "Escala Nacional da Rede Assaí",
    subtitle: "Infraestrutura massiva já instalada",
    description: "Cada terminal representa um ponto ativo de mídia no fluxo real do consumidor.",
    stats: [
      { value: "300", label: "Lojas no Brasil", icon: Store },
      { value: "40M", label: "Visitas/Mês", icon: Users },
      { value: "6.400", label: "Terminais", icon: Monitor },
      { value: "21", label: "Terminais/Loja (Média)", icon: Zap }
    ],
    icon: Globe
  },
  // 4) Fluxo de Pessoas
  {
    id: 4,
    layout: "feature-list",
    title: "Fluxo de Pessoas por Terminal",
    subtitle: "Alta frequência de contato",
    description: "Consulta de preço = momento de decisão de compra.",
    points: [
      "4.400 visitantes por loja/dia",
      "21 terminais por loja",
      "≈ 210 pessoas passam por cada terminal diariamente",
      "Ponto de contato no momento da decisão"
    ],
    icon: Users
  },
  // 5) Taxa de Atenção
  {
    id: 5,
    layout: "chart",
    title: "Taxa de Atenção no Varejo",
    subtitle: "Audiência qualificada vs Telas passivas",
    description: "Taxas médias observadas em telas funcionais no varejo.",
    chartData: [
      { name: "Conservador", value: 20 },
      { name: "Realista", value: 35 },
      { name: "Premium", value: 50 }
    ],
    chartType: "bar",
    points: [
      "Conservador: 42 pessoas/terminal/dia",
      "Realista: 74 pessoas/terminal/dia",
      "Premium: 105 pessoas/terminal/dia"
    ],
    icon: Target
  },
  // 6) Audiência Total da Rede
  {
    id: 6,
    layout: "table",
    title: "Audiência Total da Rede",
    subtitle: "Potencial para 6.400 terminais",
    description: "Impacto massivo em escala nacional.",
    tableData: {
      headers: ["Cenário", "Diário", "Mensal", "Anual"],
      rows: [
        ["Conservador", "268.800", "8 milhões", "96 milhões"],
        ["Realista", "473.600", "14,2 milhões", "170 milhões"],
        ["Premium", "672.000", "20,1 milhões", "241 milhões"]
      ]
    },
    icon: BarChart3
  },
  // 7) Implantação Inicial
  {
    id: 7,
    layout: "big-numbers",
    title: "Implantação Inicial",
    subtitle: "Projeto Piloto - 26 Lojas",
    description: "Validação do modelo em escala relevante.",
    stats: [
      { value: "26", label: "Lojas", icon: Store },
      { value: "~21", label: "Terminais/Loja", icon: Monitor },
      { value: "546", label: "Terminais Ativos", icon: Zap },
      { value: "SP/RJ", label: "Foco Regional", icon: Globe }
    ],
    icon: Store
  },
  // 8) Audiência Estimada 26 Lojas
  {
    id: 8,
    layout: "table",
    title: "Audiência Estimada (26 Lojas)",
    subtitle: "Impacto imediato do piloto",
    description: "Visualizações projetadas para o setup inicial.",
    tableData: {
      headers: ["Cenário", "Audiência Diária", "Audiência Mensal"],
      rows: [
        ["Conservador", "~22 mil views", "660 mil views"],
        ["Realista", "~40 mil views", "1,2 milhão views"],
        ["Premium", "~57 mil views", "1,7 milhão views"]
      ]
    },
    icon: Eye
  },
  // 9) Benefícios Estratégicos
  {
    id: 9,
    layout: "feature-list",
    title: "Benefícios Estratégicos",
    subtitle: "Por que investir?",
    description: "Vantagens competitivas para o Grupo Assaí.",
    points: [
      "Canal próprio de mídia dentro da loja",
      "Comunicação no momento da decisão de compra",
      "Nova receita com fornecedores (Trade Mkt)",
      "Dados reais de audiência e comportamento",
      "Ativação regional de campanhas",
      "Base para retail media nacional"
    ],
    icon: CheckCircle2
  },
  // 10) Benchmark de Monetização
  {
    id: 10,
    layout: "table",
    title: "Benchmark de Mercado",
    subtitle: "Potencial comprovado",
    description: "Dados de clientes usando solução similar por locação.",
    tableData: {
      headers: ["Segmento", "Equip.", "Campanhas", "Receita Mensal"],
      rows: [
        ["Atacadista Nacional", "200", "6", "R$ 70.000"],
        ["Regional Cash & Carry", "315", "8", "R$ 180.000"],
        ["Rede de Farmácias", "389", "7", "R$ 210.000"],
        ["Supermercado Premium", "420", "9", "R$ 260.000"],
        ["Hipermercados", "520", "10", "R$ 340.000"]
      ]
    },
    icon: DollarSign
  },
  // 11) Projeção de Monetização 26 Lojas
  {
    id: 11,
    layout: "roi-calculator",
    title: "Projeção de Monetização",
    subtitle: "26 Lojas (~546 Terminais)",
    description: "Estimativa de receita mensal baseada em benchmarks.",
    stats: [
      { value: "120-180k", label: "Conservador (Mensal)", icon: DollarSign },
      { value: "180-260k", label: "Realista (Mensal)", icon: TrendingUp },
      { value: "260-350k", label: "Estruturado (Mensal)", icon: Zap }
    ],
    points: [
      "Baseado em ocupação de slots de mídia",
      "Venda para indústria e parceiros",
      "Crescimento gradual de inventário"
    ],
    icon: TrendingUp
  },
  // 12) Investimento e ROI
  {
    id: 12,
    layout: "roi-calculator",
    title: "Investimento e ROI",
    subtitle: "Custo x Retorno",
    description: "Análise de payback projetado com base na monetização.",
    stats: [
      { value: "R$ 8.314", label: "Custo/Loja/Mês", icon: DollarSign },
      { value: "6-9", label: "Meses Payback (Estruturado)", icon: Clock },
      { value: "8-12", label: "Meses Payback (Realista)", icon: Calendar }
    ],
    points: [
      "Investimento total 26 lojas: ~R$ 216.000/mês",
      "Payback Conservador: 12 a 16 meses",
      "Modelo de locação (OpEx)"
    ],
    icon: TrendingUp
  },
  // 13) Comparativo Financeiro
  {
    id: 13,
    layout: "table",
    title: "Comparativo Financeiro",
    subtitle: "Acumulado ao longo do tempo",
    description: "Projeção de resultado acumulado (25 vs 26 lojas).",
    tableData: {
      headers: ["Período", "25 Lojas (Acumulado)", "26 Lojas (Acumulado)"],
      rows: [
        ["12 meses", "R$ 496.400", "R$ 516.256"],
        ["24 meses", "R$ 284.705", "R$ 296.093"],
        ["36 meses", "R$ 216.161", "R$ 224.808"],
        ["48 meses", "R$ 183.341", "R$ 190.674"],
        ["60 meses", "R$ 164.742", "R$ 171.331"]
      ]
    },
    icon: BarChart3
  },
  // 14) Conclusão Executiva
  {
    id: 14,
    layout: "feature-list",
    title: "Conclusão Executiva",
    subtitle: "Próximos Passos",
    description: "A implantação em 26 lojas permite validar monetização e mensurar audiência real.",
    points: [
      "O Assaí já possui uma das maiores redes de mídia in-store do Brasil",
      "Validar monetização e criar nova receita",
      "Mensurar audiência real com dados precisos",
      "Estruturar retail media nacional",
      "Transformar infraestrutura em ativo estratégico"
    ],
    icon: CheckCircle2
  },
  // 15) Agradecimento
  {
    id: 15,
    layout: "thank-you",
    title: "Obrigado",
    subtitle: "Vamos construir o futuro do Retail Media juntos?",
    description: "Espaço aberto para dúvidas e próximos passos.",
    icon: CheckCircle2
  }
];
