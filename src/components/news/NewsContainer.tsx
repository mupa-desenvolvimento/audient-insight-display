import { NewsArticle, NewsSettings } from "@/hooks/useNews";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function decodeHtmlEntities(input: string) {
  if (!input) return "";
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
  };

  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_m, raw) => {
    const key = String(raw);
    if (key[0] === "#") {
      const isHex = key[1]?.toLowerCase() === "x";
      const num = isHex ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      if (!Number.isFinite(num) || num <= 0) return "";
      try {
        return String.fromCodePoint(num);
      } catch {
        return "";
      }
    }
    const lower = key.toLowerCase();
    return named[lower] ?? `&${key};`;
  });
}

function maybeFixMojibake(input: string) {
  if (!input) return "";
  if (!/(Ã.|Â.)/.test(input)) return input;

  const bytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) bytes[i] = input.charCodeAt(i) & 0xff;

  let decoded = "";
  try {
    decoded = new TextDecoder("utf-8").decode(bytes);
  } catch {
    return input;
  }

  const score = (s: string) => (s.match(/[ÃÂ]/g)?.length ?? 0) + (s.match(/\uFFFD/g)?.length ?? 0);
  return score(decoded) < score(input) ? decoded : input;
}

function normalizeDisplayText(input: string | null | undefined) {
  const base = (input || "").toString();
  const decoded = decodeHtmlEntities(base);
  const fixed = maybeFixMojibake(decoded);
  return fixed.replace(/\s+/g, " ").trim();
}

interface NewsContainerProps {
  articles: NewsArticle[];
  settings?: NewsSettings;
  viewMode?: "list" | "grid" | "ticker";
  orientation?: "horizontal" | "vertical";
  className?: string;
  preview?: boolean;
}

export function NewsContainer({ 
  articles, 
  settings, 
  viewMode = "list", 
  orientation = "horizontal",
  className,
  preview = false
}: NewsContainerProps) {
  
  // Apply theme mode if provided in settings
  const isDarkMode = settings?.theme_mode === "dark";

  return (
    <div 
      className={cn(
        "bg-background transition-all duration-300 shadow-2xl overflow-hidden relative flex flex-col h-full w-full",
        isDarkMode ? "dark" : "",
        className
      )}
      style={{
        colorScheme: isDarkMode ? "dark" : "light"
      }}
    >
      {/* Header */}
      <div className="p-6 border-b flex justify-between items-center bg-card text-card-foreground shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Últimas Notícias</h1>
          <p className="text-muted-foreground text-sm">Atualizado em {format(new Date(), "HH:mm", { locale: ptBR })}</p>
        </div>
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
          Ao Vivo
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 overflow-y-auto p-6",
        viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-6"
      )}>
        {articles.map((article) => {
          const title = normalizeDisplayText(article.title);
          const description = normalizeDisplayText(article.description);
          const source = normalizeDisplayText(article.source);
          const category = normalizeDisplayText(article.category);

          return (
          <div 
            key={article.id} 
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-md",
              viewMode === "list" ? "flex flex-col sm:flex-row gap-6" : "flex flex-col"
            )}
          >
            {/* Image */}
            {article.image_url && (
              <div className={cn(
                "relative overflow-hidden shrink-0",
                viewMode === "list" 
                  ? "w-full sm:w-1/3 min-w-[200px] aspect-video sm:h-auto" 
                  : "aspect-video w-full"
              )}>
                <img 
                  src={article.image_url} 
                  alt={title}
                  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs">
                   <span className="bg-black/50 px-2 py-1 rounded">{source}</span>
                </div>
              </div>
            )}

            {/* Text Content */}
            <div className={cn(
              "flex flex-col justify-between p-4",
              viewMode === "list" ? "flex-1 py-2" : ""
            )}>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">
                    {category}
                  </span>
                  <span>•</span>
                  <span>{format(new Date(article.published_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
                </div>
                
                <h3 className={cn(
                  "font-semibold leading-tight group-hover:text-primary transition-colors",
                  viewMode === "list" ? "text-xl" : "text-lg line-clamp-2"
                )}>
                  {title}
                </h3>
                
                <p className={cn(
                  "text-muted-foreground text-sm",
                  viewMode === "list" ? "line-clamp-2" : "line-clamp-3"
                )}>
                  {description}
                </p>
              </div>

              {viewMode === "list" && (
                 <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                    <span>Fonte: {source}</span>
                 </div>
              )}
            </div>
          </div>
        )})}
      </div>
      
      {/* Footer / Ticker Placeholder */}
      {viewMode === "ticker" && (
        <div className="bg-primary text-primary-foreground p-3 text-sm font-medium whitespace-nowrap overflow-hidden shrink-0">
          <div className="animate-marquee inline-block">
             {articles.map(a => `${normalizeDisplayText(a.title)}  •  `).join("")}
          </div>
        </div>
      )}
    </div>
  );
}
