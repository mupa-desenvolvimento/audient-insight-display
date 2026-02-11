import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type LeadFormType = "general" | "flow" | "insight" | "impact" | "demo";

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LeadFormType;
}

// Schema definitions based on type
const baseSchema = {
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  company: z.string().min(2, "Empresa é obrigatória"),
};

const formConfigs = {
  general: {
    title: "Solicitar Diagnóstico",
    subtitle: "Analise a maturidade da sua operação de Digital Signage.",
    fields: ["jobTitle", "stores", "hasTerminals", "hasCameras", "phone"],
    schema: z.object({
      ...baseSchema,
      jobTitle: z.string().min(2, "Cargo é obrigatório"),
      stores: z.string().min(1, "Número de lojas é obrigatório"),
      hasTerminals: z.enum(["yes", "no"], { required_error: "Selecione uma opção" }),
      hasCameras: z.enum(["yes", "no"], { required_error: "Selecione uma opção" }),
      phone: z.string().min(10, "Telefone inválido"),
    })
  },
  demo: {
    title: "Agendar Demonstração",
    subtitle: "Veja como a Mupa pode transformar sua operação.",
    fields: ["jobTitle", "stores", "hasTerminals", "hasCameras", "phone"],
    schema: z.object({
      ...baseSchema,
      jobTitle: z.string().min(2, "Cargo é obrigatório"),
      stores: z.string().min(1, "Número de lojas é obrigatório"),
      hasTerminals: z.enum(["yes", "no"], { required_error: "Selecione uma opção" }),
      hasCameras: z.enum(["yes", "no"], { required_error: "Selecione uma opção" }),
      phone: z.string().min(10, "Telefone inválido"),
    })
  },
  flow: {
    title: "Mupa Flow - Organização e Controle",
    subtitle: "Ideal para redes que querem controle e performance com simplicidade.",
    fields: ["screens", "city"],
    schema: z.object({
      ...baseSchema,
      screens: z.string().min(1, "Número de telas é obrigatório"),
      city: z.string().min(2, "Cidade é obrigatória"),
    })
  },
  insight: {
    title: "Mupa Insight - Inteligência de Dados",
    subtitle: "Descubra quem olha para suas telas e quais produtos realmente despertam interesse.",
    fields: ["stores", "hasTerminals", "wantAudienceAnalysis", "phone"],
    schema: z.object({
      ...baseSchema,
      stores: z.string().min(1, "Número de lojas é obrigatório"),
      hasTerminals: z.enum(["yes", "no"], { required_error: "Selecione uma opção" }),
      wantAudienceAnalysis: z.enum(["yes", "no"], { required_error: "Selecione uma opção" }),
      phone: z.string().min(10, "Telefone inválido"),
    })
  },
  impact: {
    title: "Mupa Impact - Estratégia e Monetização",
    subtitle: "Indicado para redes que querem personalização, IA e monetização de audiência.",
    fields: ["stores", "hasLoyalty", "hasTradeMarketing", "wantMonetize", "phone"],
    schema: z.object({
      ...baseSchema,
      stores: z.string().min(1, "Número de lojas é obrigatório"),
      hasLoyalty: z.enum(["yes", "no"], { required_error: "Selecione uma opção" }),
      hasTradeMarketing: z.enum(["yes", "no"], { required_error: "Selecione uma opção" }),
      wantMonetize: z.enum(["yes", "no"], { required_error: "Selecione uma opção" }),
      phone: z.string().min(10, "Telefone inválido"),
    })
  }
};

export function LeadFormModal({ isOpen, onClose, type }: LeadFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const config = formConfigs[type];
  const form = useForm({
    resolver: zodResolver(config.schema),
    defaultValues: {
      hasTerminals: undefined,
      hasCameras: undefined,
      wantAudienceAnalysis: undefined,
      hasLoyalty: undefined,
      hasTradeMarketing: undefined,
      wantMonetize: undefined
    }
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log("Form submitted:", { type, data });
    setIsSubmitting(false);
    setIsSuccess(true);
    // Reset form after 2 seconds and close
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      form.reset();
    }, 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-10 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold">Solicitação Recebida!</h3>
              <p className="text-gray-400">
                Recebemos sua solicitação. Nossa equipe estratégica entrará em contato em breve.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold">{config.title}</DialogTitle>
                <DialogDescription className="text-gray-400 text-base">
                  {config.subtitle}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" className="bg-zinc-900 border-zinc-800" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empresa</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da empresa" className="bg-zinc-900 border-zinc-800" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     {config.fields.includes("jobTitle") && (
                      <FormField
                        control={form.control}
                        name="jobTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cargo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu cargo" className="bg-zinc-900 border-zinc-800" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                     {config.fields.includes("city") && (
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Sua cidade" className="bg-zinc-900 border-zinc-800" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Corporativo</FormLabel>
                          <FormControl>
                            <Input placeholder="seu@email.com" type="email" className="bg-zinc-900 border-zinc-800" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {config.fields.includes("phone") && (
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone / WhatsApp</FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 00000-0000" className="bg-zinc-900 border-zinc-800" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {config.fields.includes("stores") && (
                    <FormField
                      control={form.control}
                      name="stores"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Lojas</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-5">1 a 5</SelectItem>
                              <SelectItem value="6-20">6 a 20</SelectItem>
                              <SelectItem value="21-50">21 a 50</SelectItem>
                              <SelectItem value="51+">Mais de 50</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {config.fields.includes("screens") && (
                    <FormField
                      control={form.control}
                      name="screens"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Telas</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-10">1 a 10</SelectItem>
                              <SelectItem value="11-50">11 a 50</SelectItem>
                              <SelectItem value="51-200">51 a 200</SelectItem>
                              <SelectItem value="200+">Mais de 200</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Yes/No Questions */}
                  {config.fields.includes("hasTerminals") && (
                    <FormField
                      control={form.control}
                      name="hasTerminals"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Possui terminais de consulta?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex space-x-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="yes" />
                                </FormControl>
                                <FormLabel className="font-normal">Sim</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="no" />
                                </FormControl>
                                <FormLabel className="font-normal">Não</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {config.fields.includes("hasCameras") && (
                    <FormField
                      control={form.control}
                      name="hasCameras"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Utiliza câmeras nas telas?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex space-x-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="yes" />
                                </FormControl>
                                <FormLabel className="font-normal">Sim</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="no" />
                                </FormControl>
                                <FormLabel className="font-normal">Não</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {config.fields.includes("wantAudienceAnalysis") && (
                    <FormField
                      control={form.control}
                      name="wantAudienceAnalysis"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Deseja análise de audiência?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex space-x-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="yes" />
                                </FormControl>
                                <FormLabel className="font-normal">Sim</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="no" />
                                </FormControl>
                                <FormLabel className="font-normal">Não</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {config.fields.includes("hasLoyalty") && (
                    <FormField
                      control={form.control}
                      name="hasLoyalty"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Possui programa de fidelidade?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex space-x-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="yes" />
                                </FormControl>
                                <FormLabel className="font-normal">Sim</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="no" />
                                </FormControl>
                                <FormLabel className="font-normal">Não</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {config.fields.includes("hasTradeMarketing") && (
                    <FormField
                      control={form.control}
                      name="hasTradeMarketing"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Trabalha com Trade Marketing estruturado?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex space-x-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="yes" />
                                </FormControl>
                                <FormLabel className="font-normal">Sim</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="no" />
                                </FormControl>
                                <FormLabel className="font-normal">Não</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {config.fields.includes("wantMonetize") && (
                    <FormField
                      control={form.control}
                      name="wantMonetize"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Deseja monetizar espaço de tela?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex space-x-4"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="yes" />
                                </FormControl>
                                <FormLabel className="font-normal">Sim</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="no" />
                                </FormControl>
                                <FormLabel className="font-normal">Não</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button type="submit" className="w-full h-12 text-lg mt-4 bg-purple-600 hover:bg-purple-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Solicitação"
                    )}
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}