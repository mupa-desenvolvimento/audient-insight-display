import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Users, Trash2, Calendar, Eye, Camera, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePeopleRegistry } from '@/hooks/usePeopleRegistry';
import { FaceCapture, FaceCaptureData } from '@/components/FaceCapture';

interface PeopleRegistrationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
}

export const PeopleRegistration = ({ videoRef, isStreaming }: PeopleRegistrationProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddCapturesDialogOpen, setIsAddCapturesDialogOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', cpf: '' });
  const [capturedFaces, setCapturedFaces] = useState<FaceCaptureData[]>([]);
  const { toast } = useToast();
  
  const { 
    registeredPeople, 
    isLoading, 
    registerPersonWithCaptures, 
    addCapturesToPerson,
    removePerson, 
    clearRegistry,
    totalRegistered 
  } = usePeopleRegistry();

  const handleCapture = (captures: FaceCaptureData[]) => {
    setCapturedFaces(captures);
  };

  const handleRegister = async () => {
    if (capturedFaces.length === 0) {
      toast({
        title: "Erro",
        description: "Capture pelo menos uma foto da face",
        variant: "destructive",
      });
      return;
    }

    const result = await registerPersonWithCaptures(formData.name, formData.cpf, capturedFaces);
    
    toast({
      title: result.success ? "Sucesso" : "Erro",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });

    if (result.success) {
      setFormData({ name: '', cpf: '' });
      setCapturedFaces([]);
      setIsDialogOpen(false);
    }
  };

  const handleAddCaptures = async (captures: FaceCaptureData[]) => {
    if (!selectedPersonId) return;

    const result = await addCapturesToPerson(selectedPersonId, captures);
    
    toast({
      title: result.success ? "Sucesso" : "Erro",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });

    if (result.success) {
      setIsAddCapturesDialogOpen(false);
      setSelectedPersonId(null);
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
    if (cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCPFChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);
    setFormData({ ...formData, cpf: limited });
  };

  const openAddCapturesDialog = (personId: string) => {
    setSelectedPersonId(personId);
    setIsAddCapturesDialogOpen(true);
  };

  const resetDialog = () => {
    setFormData({ name: '', cpf: '' });
    setCapturedFaces([]);
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetDialog();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white" disabled={!isStreaming}>
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastrar Pessoa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Cadastrar Nova Pessoa
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Dados pessoais */}
                <div className="grid grid-cols-2 gap-4">
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
                      value={formData.cpf.length === 11 ? formatCPF(formData.cpf) : formData.cpf}
                      onChange={(e) => handleCPFChange(e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                </div>

                {/* Captura de face melhorada */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Captura Facial (3 fotos para maior precisão)
                  </h4>
                  <FaceCapture
                    videoRef={videoRef}
                    isStreaming={isStreaming}
                    onCapture={handleCapture}
                    requiredCaptures={3}
                  />
                </div>

                {/* Informação sobre as capturas */}
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Dica:</strong> Para melhor reconhecimento, capture fotos com diferentes ângulos sutis e expressões.
                    O sistema usará múltiplas capturas para criar um perfil mais preciso.
                  </p>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleRegister}
                    disabled={isLoading || !formData.name.trim() || formData.cpf.length !== 11 || capturedFaces.length === 0}
                    className="flex-1"
                  >
                    {isLoading ? "Processando..." : `Confirmar Cadastro (${capturedFaces.length} capturas)`}
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

      {/* Dialog para adicionar capturas */}
      <Dialog open={isAddCapturesDialogOpen} onOpenChange={setIsAddCapturesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Capturas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adicione mais fotos para melhorar a precisão do reconhecimento.
            </p>
            <FaceCapture
              videoRef={videoRef}
              isStreaming={isStreaming}
              onCapture={handleAddCaptures}
              requiredCaptures={2}
            />
          </div>
        </DialogContent>
      </Dialog>

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
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14 border-2 border-primary">
                      {person.photoUrl ? (
                        <AvatarImage src={person.photoUrl} alt={person.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{person.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {person.faceDescriptors.length} captura{person.faceDescriptors.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        CPF: {formatCPF(person.cpf)}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        {person.age && person.gender && (
                          <span className="text-xs text-muted-foreground">
                            {person.gender}, ~{person.age} anos
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{person.registeredAt.toLocaleDateString()}</span>
                        </div>
                        {person.lastSeen && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="w-3 h-3" />
                            <span>{person.lastSeen.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddCapturesDialog(person.id)}
                      disabled={!isStreaming}
                      title="Adicionar mais capturas"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(person.id, person.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};