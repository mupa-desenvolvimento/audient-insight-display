import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useStores } from '@/hooks/useStores';

interface StoreImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  codigo: string;
  nome: string;
  regiao: string;
  estado: string;
  cidade: string;
  endereco?: string;
  valid: boolean;
  error?: string;
}

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'completed' | 'error';

export function StoreImportDialog({ open, onOpenChange }: StoreImportDialogProps) {
  const { regions, states, cities, createState, createCity, refetch } = useStores();
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ success: 0, error: 0, errors: [] as string[] });

  const resetState = () => {
    setStatus('idle');
    setParsedData([]);
    setProgress(0);
    setResults({ success: 0, error: 0, errors: [] });
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Apenas arquivos CSV são permitidos');
      return;
    }

    setStatus('parsing');
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('Arquivo vazio ou sem dados');
          setStatus('idle');
          return;
        }

        const header = lines[0].toLowerCase().split(',').map(h => h.trim());
        const requiredColumns = ['codigo', 'nome', 'regiao', 'estado', 'cidade'];
        const missingColumns = requiredColumns.filter(col => !header.includes(col));

        if (missingColumns.length > 0) {
          toast.error(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`);
          setStatus('idle');
          return;
        }

        const columnIndexes = {
          codigo: header.indexOf('codigo'),
          nome: header.indexOf('nome'),
          regiao: header.indexOf('regiao'),
          estado: header.indexOf('estado'),
          cidade: header.indexOf('cidade'),
          endereco: header.indexOf('endereco'),
        };

        const parsed: ParsedRow[] = [];
        const seenCodes = new Set<string>();

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          
          const row: ParsedRow = {
            codigo: values[columnIndexes.codigo] || '',
            nome: values[columnIndexes.nome] || '',
            regiao: values[columnIndexes.regiao] || '',
            estado: values[columnIndexes.estado] || '',
            cidade: values[columnIndexes.cidade] || '',
            endereco: columnIndexes.endereco >= 0 ? values[columnIndexes.endereco] : undefined,
            valid: true,
          };

          // Validations
          if (!row.codigo) {
            row.valid = false;
            row.error = 'Código obrigatório';
          } else if (!row.nome) {
            row.valid = false;
            row.error = 'Nome obrigatório';
          } else if (!row.regiao) {
            row.valid = false;
            row.error = 'Região obrigatória';
          } else if (!row.estado) {
            row.valid = false;
            row.error = 'Estado obrigatório';
          } else if (!row.cidade) {
            row.valid = false;
            row.error = 'Cidade obrigatória';
          } else if (seenCodes.has(row.codigo)) {
            row.valid = false;
            row.error = 'Código duplicado no arquivo';
          } else {
            seenCodes.add(row.codigo);
          }

          parsed.push(row);
        }

        setParsedData(parsed);
        setStatus('preview');
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Erro ao processar arquivo');
        setStatus('idle');
      }
    };

    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    setStatus('importing');
    setProgress(0);

    const validRows = parsedData.filter(r => r.valid);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setProgress(Math.round(((i + 1) / validRows.length) * 100));

      try {
        // Find or create region
        let region = regions.find(r => 
          r.name.toLowerCase() === row.regiao.toLowerCase()
        );

        if (!region) {
          errors.push(`Linha ${i + 2}: Região "${row.regiao}" não encontrada`);
          errorCount++;
          continue;
        }

        // Find or create state
        let state = states.find(s => 
          s.code.toLowerCase() === row.estado.toLowerCase() ||
          s.name.toLowerCase() === row.estado.toLowerCase()
        );

        if (!state) {
          try {
            state = await createState({
              region_id: region.id,
              name: row.estado,
              code: row.estado.toUpperCase().substring(0, 2),
            });
          } catch {
            errors.push(`Linha ${i + 2}: Erro ao criar estado "${row.estado}"`);
            errorCount++;
            continue;
          }
        }

        // Find or create city
        let city = cities.find(c => 
          c.name.toLowerCase() === row.cidade.toLowerCase() &&
          c.state_id === state?.id
        );

        if (!city && state) {
          try {
            city = await createCity({
              state_id: state.id,
              name: row.cidade,
            });
          } catch {
            errors.push(`Linha ${i + 2}: Erro ao criar cidade "${row.cidade}"`);
            errorCount++;
            continue;
          }
        }

        if (!city) {
          errors.push(`Linha ${i + 2}: Cidade não encontrada`);
          errorCount++;
          continue;
        }

        // Create store
        const { error } = await supabase
          .from('stores')
          .insert({
            code: row.codigo,
            name: row.nome,
            city_id: city.id,
            address: row.endereco || null,
            is_active: true,
            metadata: {},
          });

        if (error) {
          if (error.code === '23505') {
            errors.push(`Linha ${i + 2}: Código "${row.codigo}" já existe`);
          } else {
            errors.push(`Linha ${i + 2}: ${error.message}`);
          }
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error('Import error:', error);
        errors.push(`Linha ${i + 2}: Erro inesperado`);
        errorCount++;
      }
    }

    setResults({ success: successCount, error: errorCount, errors });
    setStatus('completed');
    await refetch();
  };

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Lojas</DialogTitle>
          <DialogDescription>
            Importe lojas em massa usando um arquivo CSV
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Colunas obrigatórias: codigo, nome, regiao, estado, cidade
            </p>
            <label className="cursor-pointer">
              <Button asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Arquivo CSV
                </span>
              </Button>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}

        {status === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Processando arquivo...</p>
          </div>
        )}

        {status === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-4 mb-4">
              <Badge variant="default" className="text-sm">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {validCount} válidos
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  <XCircle className="h-3 w-3 mr-1" />
                  {invalidCount} inválidos
                </Badge>
              )}
            </div>
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Cidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 100).map((row, i) => (
                    <TableRow key={i} className={row.valid ? '' : 'bg-destructive/10'}>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <div className="flex items-center gap-1" title={row.error}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{row.codigo}</TableCell>
                      <TableCell>{row.nome}</TableCell>
                      <TableCell>{row.regiao}</TableCell>
                      <TableCell>{row.estado}</TableCell>
                      <TableCell>{row.cidade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedData.length > 100 && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando 100 de {parsedData.length} linhas
              </p>
            )}
          </div>
        )}

        {status === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground mb-4">Importando lojas...</p>
            <div className="w-full max-w-md">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground mt-2">{progress}%</p>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Importação Concluída</h3>
            <div className="flex gap-4 mb-4">
              <Badge variant="default">
                {results.success} importados
              </Badge>
              {results.error > 0 && (
                <Badge variant="destructive">
                  {results.error} erros
                </Badge>
              )}
            </div>
            {results.errors.length > 0 && (
              <div className="w-full max-h-48 overflow-auto border rounded-lg p-4 bg-destructive/5">
                {results.errors.slice(0, 20).map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-destructive mb-1">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {err}
                  </div>
                ))}
                {results.errors.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ...e mais {results.errors.length - 20} erros
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {status === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { resetState(); }}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Importar {validCount} lojas
              </Button>
            </>
          )}
          {status === 'completed' && (
            <Button onClick={() => { resetState(); onOpenChange(false); }}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
