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

  const getStatesForRegion = (regionId: string) => 
    states.filter(s => s.region_id === regionId);

  const getCitiesForState = (stateId: string) => 
    cities.filter(c => c.state_id === stateId);

  const getStoresForCity = (cityId: string) => 
    stores.filter(s => s.city_id === cityId);

  const getStoreCountForRegion = (regionId: string) => {
    const regionStates = getStatesForRegion(regionId);
    let count = 0;
    regionStates.forEach(state => {
      getCitiesForState(state.id).forEach(city => {
        count += getStoresForCity(city.id).length;
      });
    });
    return count;
  };

  const getStoreCountForState = (stateId: string) => {
    let count = 0;
    getCitiesForState(stateId).forEach(city => {
      count += getStoresForCity(city.id).length;
    });
    return count;
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-2xl font-bold">{states.length}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Estados
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">{cities.length}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              Cidades
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
              {filteredRegions.map((region) => (
                <AccordionItem key={region.id} value={region.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{region.name}</span>
                      <Badge variant="secondary">
                        {getStoreCountForRegion(region.id)} lojas
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="pl-8 space-y-2">
                      {getStatesForRegion(region.id).map((state) => (
                        <Accordion key={state.id} type="multiple">
                          <AccordionItem value={state.id} className="border-l-2 pl-4">
                            <AccordionTrigger className="hover:no-underline py-2">
                              <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{state.name} ({state.code})</span>
                                <Badge variant="outline" className="text-xs">
                                  {getStoreCountForState(state.id)} lojas
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-1">
                              <div className="pl-7 space-y-1">
                                {getCitiesForState(state.id).map((city) => {
                                  const cityStores = getStoresForCity(city.id);
                                  return (
                                    <div key={city.id} className="flex items-center gap-2 py-1">
                                      <Building2 className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm">{city.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({cityStores.length} lojas)
                                      </span>
                                    </div>
                                  );
                                })}
                                {getCitiesForState(state.id).length === 0 && (
                                  <span className="text-sm text-muted-foreground">
                                    Nenhuma cidade cadastrada
                                  </span>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}
                      {getStatesForRegion(region.id).length === 0 && (
                        <span className="text-sm text-muted-foreground">
                          Nenhum estado cadastrado
                        </span>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
