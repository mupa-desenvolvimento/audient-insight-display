import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, MapPin, Building2, Store, Globe, Loader2 } from 'lucide-react';

export default function Regions() {
  const { stores, regions, states, cities, isLoading } = useStores();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStoresForRegion = (regionId: string) => {
    return stores.filter(store => {
      const city = cities.find(c => c.id === store.city_id);
      const state = states.find(s => s.id === city?.state_id);
      return state?.region_id === regionId;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Visualize a estrutura geográfica das lojas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">{regions.length}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Regiões
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">{stores.length}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Store className="h-4 w-4" />
              Lojas
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar região..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredRegions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma região encontrada
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredRegions.map((region) => {
                const regionStores = getStoresForRegion(region.id);
                return (
                  <AccordionItem key={region.id} value={region.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{region.name}</span>
                        <Badge variant="secondary">
                          {regionStores.length} lojas
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="pl-8 space-y-2">
                        {regionStores.map((store) => (
                          <div key={store.id} className="flex items-center gap-3 py-1">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{store.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">({store.code})</span>
                          </div>
                        ))}
                        {regionStores.length === 0 && (
                          <span className="text-sm text-muted-foreground">
                            Nenhuma loja cadastrada nesta região
                          </span>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
