import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useStores } from '@/hooks/useStores';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loader2, ArrowLeft, Map as MapIcon, ChevronRight, Store as StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map animations
function MapController({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [bounds, map]);

  return null;
}

export default function StoresMap() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const companyId = searchParams.get('companyId');
  const { stores, isLoading } = useStores();
  const [validStores, setValidStores] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasInitialZoom, setHasInitialZoom] = useState(false);

  // Filter valid stores
  useEffect(() => {
    if (stores.length > 0) {
      const filtered = stores.filter(store => {
        const meta = store.metadata as any;
        const hasCoords = meta?.lat && meta?.lng;
        
        if (!hasCoords) return false;

        if (companyId) {
            const storeCompanyId = (store as any).company_id || meta?.company_id;
            if (storeCompanyId && String(storeCompanyId) !== String(companyId)) {
                return false;
            }
        }
        
        return true;
      });
      setValidStores(filtered);
    }
  }, [stores, companyId]);

  // Group stores by Region -> State
  const regions = useMemo(() => {
    const grouped: Record<string, { count: number, states: Set<string>, bounds: L.LatLngBounds }> = {};
    
    validStores.forEach(store => {
      const regionName = store.city?.state?.region?.name || 'Outros';
      const stateName = store.city?.state?.name || 'Desconhecido';
      
      if (!grouped[regionName]) {
        grouped[regionName] = {
          count: 0,
          states: new Set(),
          bounds: L.latLngBounds([])
        };
      }
      
      grouped[regionName].count++;
      grouped[regionName].states.add(stateName);
      grouped[regionName].bounds.extend([store.metadata.lat, store.metadata.lng]);
    });

    return Object.entries(grouped).map(([name, data]) => ({
      name,
      count: data.count,
      states: Array.from(data.states).sort(),
      bounds: data.bounds
    })).sort((a, b) => b.count - a.count);
  }, [validStores]);

  // Initial Zoom Effect
  useEffect(() => {
    if (!hasInitialZoom && regions.length > 0) {
      // Auto-select the region with the most stores (first in sorted array)
      setSelectedRegion(regions[0].name);
      setHasInitialZoom(true);
    }
  }, [regions, hasInitialZoom]);

  // Calculate current bounds based on selection
  const currentBounds = useMemo(() => {
    if (selectedRegion) {
      const region = regions.find(r => r.name === selectedRegion);
      return region?.bounds || null;
    }
    
    if (validStores.length > 0) {
      const bounds = L.latLngBounds([]);
      validStores.forEach(store => {
        bounds.extend([store.metadata.lat, store.metadata.lng]);
      });
      return bounds;
    }
    
    return null;
  }, [selectedRegion, validStores, regions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-slate-950">
      {/* Sidebar Panel */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute left-4 top-4 bottom-4 z-[1001] w-80 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col border border-white/10 overflow-hidden"
          >
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <MapIcon className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="font-bold text-xl text-slate-100">Mapa de Lojas</h1>
                </div>
              </div>
              <p className="text-sm text-slate-400">
                {validStores.length} lojas monitoradas em {regions.length} regiões
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              <button
                onClick={() => setSelectedRegion(null)}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center justify-between group",
                  selectedRegion === null 
                    ? "bg-primary text-white shadow-lg shadow-primary/25" 
                    : "bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:shadow-md border border-white/5"
                )}
              >
                <span className="font-medium">Todas as Regiões</span>
                <Badge variant="secondary" className={cn(
                  "ml-auto",
                  selectedRegion === null ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
                )}>
                  {validStores.length}
                </Badge>
              </button>

              <div className="space-y-2 mt-4">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Regiões</h2>
                {regions.map((region) => (
                  <button
                    key={region.name}
                    onClick={() => setSelectedRegion(region.name)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-all duration-200 group border relative overflow-hidden",
                      selectedRegion === region.name
                        ? "bg-slate-800 border-primary ring-1 ring-primary/50 shadow-md"
                        : "bg-slate-800/30 border-transparent hover:bg-slate-800/50 hover:border-white/10"
                    )}
                  >
                    {selectedRegion === region.name && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                      />
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "font-medium",
                        selectedRegion === region.name ? "text-primary" : "text-slate-300"
                      )}>
                        {region.name}
                      </span>
                      <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                        {region.count}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {region.states.join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900/50">
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/stores')} 
                className="w-full justify-center bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para lista
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Toggle Button (Mobile/Collapsible) */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-4 right-4 z-[1000] shadow-md bg-slate-800 text-slate-100 hover:bg-slate-700 border border-white/10"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <MapIcon className="h-4 w-4" />
      </Button>

      {/* Map */}
      <div className="h-full w-full bg-slate-950">
        <MapContainer 
          center={[-14.2350, -51.9253]} // Brazil Center
          zoom={4} 
          style={{ height: '100%', width: '100%', background: '#020617' }}
          zoomControl={false}
        >
          <MapController bounds={currentBounds} />
          
          {/* Dark Mode Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {validStores.map((store) => (
            <Marker 
              key={store.id} 
              position={[store.metadata.lat, store.metadata.lng]}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-primary/20 rounded-md">
                      <StoreIcon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 leading-tight">{store.name}</h3>
                  </div>
                  
                  <div className="space-y-1 text-xs text-slate-600">
                    <p>{store.address || 'Sem endereço'}</p>
                    <p className="font-medium text-slate-500">
                      {store.city?.name} - {store.city?.state?.code}
                    </p>
                  </div>

                  {store.code && (
                    <div className="mt-2 flex items-center justify-between border-t pt-2 border-gray-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Código</span>
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {store.code}
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}