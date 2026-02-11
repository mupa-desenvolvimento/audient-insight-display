import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlansComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: 'lite' | 'flow' | 'insight' | 'impact') => void;
}

export function PlansComparisonModal({ isOpen, onClose, onSelectPlan }: PlansComparisonModalProps) {
  const features = [
    { name: "Suporte Técnico Remoto Imediato", lite: true, flow: true, insight: true, impact: true },
    { name: "Operação 100% Offline", lite: true, flow: true, insight: true, impact: true },
    { name: "Consulta de Preço/Produto", lite: true, flow: false, insight: true, impact: true },
    { name: "Gestão Centralizada (Cloud)", lite: false, flow: true, insight: true, impact: true },
    { name: "Playlists e Agendamentos", lite: false, flow: true, insight: true, impact: true },
    { name: "Monitoramento Online/Offline", lite: false, flow: true, insight: true, impact: true },
    { name: "Analytics de Consulta", lite: false, flow: false, insight: true, impact: true },
    { name: "Audience Analytics (Câmera)", lite: false, flow: false, insight: true, impact: true },
    { name: "Mapa de Calor de Atenção", lite: false, flow: false, insight: true, impact: true },
    { name: "Segmentação Dinâmica (IA)", lite: false, flow: false, insight: false, impact: true },
    { name: "Recomendação Automática", lite: false, flow: false, insight: false, impact: true },
    { name: "Monetização de Telas", lite: false, flow: false, insight: false, impact: true },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold text-center">Comparativo de Planos</DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            Compare os recursos e escolha a solução ideal para sua operação.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="w-[200px] text-gray-300">Recurso</TableHead>
                  <TableHead className="text-center text-zinc-400 font-bold text-sm sm:text-lg">MUPA LITE</TableHead>
                  <TableHead className="text-center text-green-400 font-bold text-sm sm:text-lg">MUPA FLOW</TableHead>
                  <TableHead className="text-center text-blue-400 font-bold text-sm sm:text-lg">MUPA INSIGHT</TableHead>
                  <TableHead className="text-center text-purple-400 font-bold text-sm sm:text-lg">MUPA IMPACT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((feature, idx) => (
                  <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableCell className="font-medium text-gray-300 text-sm sm:text-base">{feature.name}</TableCell>
                    <TableCell className="text-center">
                      {feature.lite ? <Check className="mx-auto w-5 h-5 text-zinc-400" /> : <Minus className="mx-auto w-5 h-5 text-zinc-700" />}
                    </TableCell>
                  <TableCell className="text-center">
                    {feature.flow ? <Check className="mx-auto w-5 h-5 text-green-500" /> : <Minus className="mx-auto w-5 h-5 text-zinc-700" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {feature.insight ? <Check className="mx-auto w-5 h-5 text-blue-500" /> : <Minus className="mx-auto w-5 h-5 text-zinc-700" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {feature.impact ? <Check className="mx-auto w-5 h-5 text-purple-500" /> : <Minus className="mx-auto w-5 h-5 text-zinc-700" />}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableCell></TableCell>
                <TableCell className="p-4">
                  <Button onClick={() => onSelectPlan('lite')} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">Selecionar</Button>
                </TableCell>
                <TableCell className="p-4">
                  <Button onClick={() => onSelectPlan('flow')} className="w-full bg-green-600 hover:bg-green-700 text-white">Selecionar</Button>
                </TableCell>
                <TableCell className="p-4">
                  <Button onClick={() => onSelectPlan('insight')} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Selecionar</Button>
                </TableCell>
                <TableCell className="p-4">
                  <Button onClick={() => onSelectPlan('impact')} className="w-full bg-purple-600 hover:bg-purple-700 text-white">Selecionar</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}