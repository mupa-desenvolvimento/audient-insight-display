import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Loader2, Download } from 'lucide-react';
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
  regional: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  valid: boolean;
  error?: string;
}

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'completed' | 'error';

const CSV_TEMPLATE = `codigo,nome,regional,cnpj,endereco,bairro,cep,cidade,estado
LJ001,Loja Centro,João Silva,12.345.678/0001-90,Rua Principal 100,Centro,01234-567,São Paulo,SP
LJ002,Loja Shopping,Maria Santos,98.765.432/0001-10,Av. Brasil 500,Jardins,04567-890,Rio de Janeiro,RJ`;

export function StoreImportDialog({ open, onOpenChange }: StoreImportDialogProps) {
  const { regions, states, cities, createState, createCity, createRegion, refetch } = useStores();
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

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_lojas.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Modelo CSV baixado com sucesso');
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

        const header = lines[0].toLowerCase().split(',').map(h => h.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
        const requiredColumns = ['codigo', 'nome', 'cidade', 'estado'];
        const missingColumns = requiredColumns.filter(col => !header.includes(col));

        if (missingColumns.length > 0) {
          toast.error(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`);
          setStatus('idle');
          return;
        }

        const columnIndexes = {
          codigo: header.indexOf('codigo'),
          nome: header.indexOf('nome'),
          regional: header.indexOf('regional'),
          cnpj: header.indexOf('cnpj'),
          endereco: header.indexOf('endereco'),
          bairro: header.indexOf('bairro'),
          cep: header.indexOf('cep'),
          cidade: header.indexOf('cidade'),
          estado: header.indexOf('estado'),
        };

        const parsed: ParsedRow[] = [];
        const seenCodes = new Set<string>();

        for (let i = 1; i < lines.length; i++) {
          // Parse CSV properly handling quoted values with commas and spaces
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          const line = lines[i];
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim()); // Push last value
          
          const row: ParsedRow = {
            codigo: columnIndexes.codigo >= 0 ? values[columnIndexes.codigo] || '' : '',
            nome: columnIndexes.nome >= 0 ? values[columnIndexes.nome] || '' : '',
            regional: columnIndexes.regional >= 0 ? values[columnIndexes.regional] || '' : '',
            cnpj: columnIndexes.cnpj >= 0 ? values[columnIndexes.cnpj] || '' : '',
            endereco: columnIndexes.endereco >= 0 ? values[columnIndexes.endereco] || '' : '',
            bairro: columnIndexes.bairro >= 0 ? values[columnIndexes.bairro] || '' : '',
            cep: columnIndexes.cep >= 0 ? values[columnIndexes.cep] || '' : '',
            cidade: columnIndexes.cidade >= 0 ? values[columnIndexes.cidade] || '' : '',
            estado: columnIndexes.estado >= 0 ? values[columnIndexes.estado] || '' : '',
            valid: true,
          };

          // Validations
          if (!row.codigo) {
            row.valid = false;
            row.error = 'Código obrigatório';
          } else if (!row.nome) {
            row.valid = false;
            row.error = 'Nome obrigatório';
          } else if (!row.cidade) {
            row.valid = false;
            row.error = 'Cidade obrigatória';
          } else if (!row.estado) {
            row.valid = false;
            row.error = 'Estado obrigatório';
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

    // Cache for created entities to avoid duplicates
    const createdRegions: Record<string, { id: string }> = {};
    const createdStates: Record<string, { id: string }> = {};
    const createdCities: Record<string, { id: string }> = {};

    // First, get existing country (Brazil) or create it
    let { data: country } = await supabase
      .from('countries')
      .select('id')
      .eq('code', 'BR')
      .maybeSingle();

    if (!country) {
      const { data: newCountry, error } = await supabase
        .from('countries')
        .insert({ code: 'BR', name: 'Brasil' })
        .select('id')
        .single();
      
      if (error) {
        toast.error('Erro ao criar país Brasil');
        setStatus('error');
        return;
      }
      country = newCountry;
    }

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setProgress(Math.round(((i + 1) / validRows.length) * 100));

      try {
        // Normalize state code
        const stateCode = row.estado.toUpperCase().trim().substring(0, 2);
        const stateName = row.estado.length > 2 ? row.estado : stateCode;
        
        // Create region name based on state (e.g., "Região SP" or "Sudeste")
        const regionName = `Região ${stateCode}`;
        const regionKey = regionName.toLowerCase();

        // Find or create region
        let region = regions.find(r => r.name.toLowerCase() === regionKey) || createdRegions[regionKey];
        
        if (!region) {
          try {
            const newRegion = await createRegion({
              country_id: country.id,
              name: regionName,
              code: stateCode,
            });
            region = newRegion;
            createdRegions[regionKey] = newRegion;
          } catch {
            errors.push(`Linha ${i + 2}: Erro ao criar região "${regionName}"`);
            errorCount++;
            continue;
          }
        }

        // Find or create state
        const stateKey = `${stateCode}-${region.id}`;
        let state = states.find(s => 
          (s.code.toLowerCase() === stateCode.toLowerCase() || s.name.toLowerCase() === stateName.toLowerCase()) &&
          s.region_id === region.id
        ) || createdStates[stateKey];

        if (!state) {
          try {
            const newState = await createState({
              region_id: region.id,
              name: stateName,
              code: stateCode,
            });
            state = newState;
            createdStates[stateKey] = newState;
          } catch {
            errors.push(`Linha ${i + 2}: Erro ao criar estado "${stateName}"`);
            errorCount++;
            continue;
          }
        }

        // Find or create city
        const cityKey = `${row.cidade.toLowerCase()}-${state.id}`;
        let city = cities.find(c => 
          c.name.toLowerCase() === row.cidade.toLowerCase() &&
          c.state_id === state.id
        ) || createdCities[cityKey];

        if (!city) {
          try {
            const newCity = await createCity({
              state_id: state.id,
              name: row.cidade,
            });
            city = newCity;
            createdCities[cityKey] = newCity;
          } catch {
            errors.push(`Linha ${i + 2}: Erro ao criar cidade "${row.cidade}"`);
            errorCount++;
            continue;
          }
        }

        // Create store with all fields
        const { error } = await supabase
          .from('stores')
          .insert({
            code: row.codigo,
            name: row.nome,
            city_id: city.id,
            address: row.endereco || null,
            cnpj: row.cnpj || null,
            bairro: row.bairro || null,
            cep: row.cep || null,
            regional_responsavel: row.regional || null,
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
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Lojas</DialogTitle>
          <DialogDescription>
            Importe lojas em massa usando um arquivo CSV. O sistema criará automaticamente as regiões, estados e cidades.
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            
            <div className="text-center mb-6">
              <p className="text-muted-foreground mb-2">
                Colunas obrigatórias: <strong>codigo, nome, cidade, estado</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Colunas opcionais: regional, cnpj, endereco, bairro, cep
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Modelo CSV
              </Button>
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

            <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm max-w-lg">
              <p className="font-medium mb-2">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>O sistema criará automaticamente as regiões baseado no estado</li>
                <li>Estados e cidades serão criados se não existirem</li>
                <li>O código de cada loja deve ser único</li>
                <li>Use o modelo CSV como referência para o formato correto</li>
              </ul>
            </div>
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
                    <TableHead>Regional</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>UF</TableHead>
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
                      <TableCell>{row.regional}</TableCell>
                      <TableCell className="font-mono text-xs">{row.cnpj}</TableCell>
                      <TableCell>{row.cidade}</TableCell>
                      <TableCell>{row.estado}</TableCell>
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
          {status === 'idle' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
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
