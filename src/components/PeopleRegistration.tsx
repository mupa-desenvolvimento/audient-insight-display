import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Users, Trash2, Calendar, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePeopleRegistry } from '@/hooks/usePeopleRegistry';

interface PeopleRegistrationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
}

export const PeopleRegistration = ({ videoRef, isStreaming }: PeopleRegistrationProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', cpf: '' });
  const { toast } = useToast();
  
  const { 
    registeredPeople, 
    isLoading, 
    registerPerson, 
    removePerson, 
    clearRegistry,
    totalRegistered 
  } = usePeopleRegistry();

  const handleRegister = async () => {
    if (!videoRef.current || !isStreaming) {
      toast({
        title: "Erro",
        description: "Câmera deve estar ativa para cadastrar",
        variant: "destructive",
      });
      return;
    }

    const result = await registerPerson(formData.name, formData.cpf, videoRef.current);
    
    toast({
      title: result.success ? "Sucesso" : "Erro",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });

    if (result.success) {
      setFormData({ name: '', cpf: '' });
      setIsDialogOpen(false);
    }
  };

  const handleRemove = (personId: string, personName: string) => {
    removePerson(personId);
    toast({
      title: "Pessoa removida",
      description: `${personName} foi removido do cadastro`,
    });
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCPFChange = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);
    setFormData({ ...formData, cpf: limited });
  };

  return (
    <div className="space-y-6">
      {/* Header com botão de cadastro */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Cadastro de Pessoas</h3>
          <p className="text-sm text-muted-foreground">
            {totalRegistered} pessoa{totalRegistered !== 1 ? 's' : ''} cadastrada{totalRegistered !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white" disabled={!isStreaming}>
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastrar Pessoa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Pessoa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formatCPF(formData.cpf)}
                    onChange={(e) => handleCPFChange(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    📸 Posicione-se de frente para a câmera antes de confirmar o cadastro.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleRegister}
                    disabled={isLoading || !formData.name.trim() || formData.cpf.length !== 11}
                    className="flex-1"
                  >
                    {isLoading ? "Processando..." : "Confirmar Cadastro"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {totalRegistered > 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                clearRegistry();
                toast({
                  title: "Cadastros limpos",
                  description: "Todos os cadastros foram removidos",
                });
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Tudo
            </Button>
          )}
        </div>
      </div>

      {/* Lista de pessoas cadastradas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Pessoas Cadastradas</span>
            <Badge variant="outline">{totalRegistered}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalRegistered === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma pessoa cadastrada</p>
              <p className="text-sm">Use o botão "Cadastrar Pessoa" para começar</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {registeredPeople.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <div>
                        <h4 className="font-medium">{person.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          CPF: {formatCPF(person.cpf)}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Cadastrado: {person.registeredAt.toLocaleDateString()}</span>
                          </div>
                          {person.lastSeen && (
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Eye className="w-3 h-3" />
                              <span>Visto: {person.lastSeen.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(person.id, person.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};