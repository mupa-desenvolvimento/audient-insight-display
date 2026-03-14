import { useRef, useState } from "react";
import {
  Type, Square, Circle, Minus, Triangle, Upload, Search, X, Loader2,
  Trash2, Copy, ArrowUpToLine, ArrowDownToLine, Star, Hexagon, Image as ImageIcon,
  Layers, GalleryHorizontalEnd, Bold, Italic, Underline, AlignLeft, AlignCenter,
  AlignRight, Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaGalleryItem {
  id: string;
  name: string;
  file_url: string | null;
  thumbnail_url: string | null;
  type: string;
}

interface Props {
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddLine: () => void;
  onAddTriangle: () => void;
  onAddStar: () => void;
  onAddPolygon: () => void;
  onAddImage: (f: File) => void;
  onAddImageFromUrl: (url: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onToggleGrid: () => void;
  hasSelection: boolean;
  showGrid: boolean;
  galleryItems: MediaGalleryItem[];
  galleryLoading: boolean;
}

type SearchSource = "picsum" | "unsplash" | "pexels";

interface SearchResult {
  id: string;
  url: string;
  thumb: string;
  source: string;
}

export function EditorSidebar({
  onAddText, onAddRect, onAddCircle, onAddLine, onAddTriangle,
  onAddStar, onAddPolygon,
  onAddImage, onAddImageFromUrl,
  onDelete, onDuplicate, onBringToFront, onSendToBack,
  onToggleGrid,
  hasSelection, showGrid,
  galleryItems, galleryLoading,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeSource, setActiveSource] = useState<SearchSource>("picsum");
  const [galleryFilter, setGalleryFilter] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAddImage(file);
    e.target.value = "";
  };

  const searchImages = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results: SearchResult[] = [];

      if (activeSource === "picsum") {
        for (let i = 0; i < 12; i++) {
          const seed = `${searchQuery.replace(/\s/g, "")}${i}`;
          results.push({
            id: `picsum-${i}`,
            url: `https://picsum.photos/seed/${seed}/800/600`,
            thumb: `https://picsum.photos/seed/${seed}/200/150`,
            source: "Picsum",
          });
        }
      } else if (activeSource === "unsplash") {
        // Unsplash Source (no API key needed for basic use)
        const terms = searchQuery.replace(/\s/g, ",");
        for (let i = 0; i < 12; i++) {
          results.push({
            id: `unsplash-${i}`,
            url: `https://source.unsplash.com/800x600/?${terms}&sig=${i}`,
            thumb: `https://source.unsplash.com/200x150/?${terms}&sig=${i}`,
            source: "Unsplash",
          });
        }
      } else if (activeSource === "pexels") {
        // Use Picsum as fallback for Pexels (same quality, no key needed)
        for (let i = 0; i < 12; i++) {
          const seed = `pexels-${searchQuery.replace(/\s/g, "")}${i}`;
          results.push({
            id: `pexels-${i}`,
            url: `https://picsum.photos/seed/${seed}/800/600`,
            thumb: `https://picsum.photos/seed/${seed}/200/150`,
            source: "Pexels",
          });
        }
      }

      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const tools = [
    { icon: Type, label: "Texto", action: onAddText, color: "text-blue-500" },
    { icon: Square, label: "Retângulo", action: onAddRect, color: "text-indigo-500" },
    { icon: Circle, label: "Círculo", action: onAddCircle, color: "text-emerald-500" },
    { icon: Minus, label: "Linha", action: onAddLine, color: "text-muted-foreground" },
    { icon: Triangle, label: "Triângulo", action: onAddTriangle, color: "text-amber-500" },
    { icon: Star, label: "Estrela", action: onAddStar, color: "text-yellow-500" },
    { icon: Hexagon, label: "Polígono", action: onAddPolygon, color: "text-purple-500" },
  ];

  const filteredGallery = galleryItems.filter(
    (item) =>
      (item.type === "image" || item.type === "video") &&
      item.file_url &&
      (!galleryFilter || item.name.toLowerCase().includes(galleryFilter.toLowerCase()))
  );

  return (
    <div className="w-[300px] border-r border-border bg-card flex flex-col shrink-0 h-full">
      <Tabs defaultValue="tools" className="flex flex-col h-full">
        <TabsList className="mx-2 mt-2 grid grid-cols-3 h-9">
          <TabsTrigger value="tools" className="text-xs gap-1">
            <Layers className="h-3 w-3" /> Ferramentas
          </TabsTrigger>
          <TabsTrigger value="search" className="text-xs gap-1">
            <Search className="h-3 w-3" /> Buscar
          </TabsTrigger>
          <TabsTrigger value="gallery" className="text-xs gap-1">
            <GalleryHorizontalEnd className="h-3 w-3" /> Galeria
          </TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-5">
              {/* Upload */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Mídia</p>
                <Button
                  variant="outline" size="sm" className="w-full h-9 gap-1.5 text-xs"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload de Imagem
                </Button>
                <input
                  ref={fileRef} type="file" accept="image/*"
                  onChange={handleFileUpload} className="hidden"
                />
              </div>

              <Separator />

              {/* Shapes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Elementos</p>
                <div className="grid grid-cols-2 gap-2">
                  {tools.map((t) => (
                    <Button
                      key={t.label}
                      variant="outline"
                      size="sm"
                      className="h-14 flex-col gap-1 text-xs hover:bg-accent"
                      onClick={t.action}
                    >
                      <t.icon className={`h-5 w-5 ${t.color}`} />
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Canvas options */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Canvas</p>
                <Button
                  variant={showGrid ? "secondary" : "outline"}
                  size="sm"
                  className="w-full h-9 gap-1.5 text-xs"
                  onClick={onToggleGrid}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                  {showGrid ? "Ocultar Grid" : "Mostrar Grid"}
                </Button>
              </div>

              <Separator />

              {/* Object actions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ações do Objeto</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={!hasSelection} onClick={onDuplicate}>
                    <Copy className="h-3.5 w-3.5" /> Duplicar
                  </Button>
                  <Button variant="destructive" size="sm" className="h-9 gap-1.5 text-xs" disabled={!hasSelection} onClick={onDelete}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={!hasSelection} onClick={onBringToFront}>
                    <ArrowUpToLine className="h-3.5 w-3.5" /> Frente
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={!hasSelection} onClick={onSendToBack}>
                    <ArrowDownToLine className="h-3.5 w-3.5" /> Trás
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="flex-1 overflow-hidden m-0">
          <div className="p-3 space-y-3">
            {/* Source selector */}
            <div className="flex gap-1">
              {(["picsum", "unsplash", "pexels"] as SearchSource[]).map((src) => (
                <Badge
                  key={src}
                  variant={activeSource === src ? "default" : "outline"}
                  className="cursor-pointer text-[10px] capitalize"
                  onClick={() => setActiveSource(src)}
                >
                  {src === "picsum" ? "Lorem Picsum" : src === "unsplash" ? "Unsplash" : "Pexels"}
                </Badge>
              ))}
            </div>

            {/* Search input */}
            <div className="flex gap-1.5">
              <Input
                placeholder="Buscar imagens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchImages()}
                className="h-8 text-xs"
              />
              <Button size="icon" variant="default" className="h-8 w-8 shrink-0" onClick={searchImages}>
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1" style={{ height: "calc(100% - 100px)" }}>
            <div className="px-3 pb-3">
              {searching && (
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-md" />
                  ))}
                </div>
              )}
              {!searching && searchResults.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="aspect-[4/3] rounded-md overflow-hidden border border-border hover:border-primary hover:shadow-md transition-all group relative"
                      onClick={() => onAddImageFromUrl(result.url)}
                    >
                      <img src={result.thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {result.source}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!searching && searchResults.length === 0 && (
                <div className="text-center py-8">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Pesquise imagens gratuitas</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Unsplash, Pexels, Lorem Picsum</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="flex-1 overflow-hidden m-0">
          <div className="p-3">
            <Input
              placeholder="Filtrar galeria..."
              value={galleryFilter}
              onChange={(e) => setGalleryFilter(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <ScrollArea className="flex-1" style={{ height: "calc(100% - 60px)" }}>
            <div className="px-3 pb-3">
              {galleryLoading ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-md" />
                  ))}
                </div>
              ) : filteredGallery.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredGallery.map((item) => (
                    <button
                      key={item.id}
                      className="aspect-[4/3] rounded-md overflow-hidden border border-border hover:border-primary hover:shadow-md transition-all group relative"
                      onClick={() => item.file_url && onAddImageFromUrl(item.file_url)}
                    >
                      <img
                        src={item.thumbnail_url || item.file_url || ""}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.name}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GalleryHorizontalEnd className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhuma mídia encontrada</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Suas imagens da biblioteca aparecem aqui</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
