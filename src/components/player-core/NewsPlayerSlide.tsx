import { useParams, useSearchParams } from "react-router-dom";
import { useDeviceNews } from "@/hooks/useDeviceNews";
import { NewsContainer } from "@/components/news/NewsContainer";
import { NewsLayoutRenderer, type NewsLayoutId } from "@/components/news/NewsLayoutPreview";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

interface NewsPlayerSlideProps {
  onEnded?: () => void;
  media?: { metadata?: any } | null;
}

export const NewsPlayerSlide = ({ media }: NewsPlayerSlideProps) => {
  const { deviceCode, deviceId } = useParams();
  const [searchParams] = useSearchParams();
  const queryDeviceId = searchParams.get("device_id");
  
  const code = deviceCode || deviceId || queryDeviceId;
  
  const { data, isLoading } = useDeviceNews(code);

  const meta = (media?.metadata || {}) as any;
  const rawCategory = (meta.news_category as string | null | undefined) ?? null;
  const category = rawCategory && rawCategory !== "all" ? rawCategory : null;
  const layoutId = (meta.layout as NewsLayoutId | undefined) ?? null;

  const filteredArticles = useMemo(() => {
    const articles = data?.articles || [];
    const perCategory = 5;

    if (category) {
      return articles.filter((a) => a.category === category).slice(0, perCategory);
    }

    const countsByCategory = new Map<string, number>();
    const picked: typeof articles = [];

    for (const article of articles) {
      const cat = article.category || "geral";
      const count = countsByCategory.get(cat) ?? 0;
      if (count >= perCategory) continue;
      picked.push(article);
      countsByCategory.set(cat, count + 1);
    }

    return picked;
  }, [data?.articles, category]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!data || !data.articles || data.articles.length === 0) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center text-white/50">
        <p>Sem notícias disponíveis</p>
      </div>
    );
  }

  if (layoutId) {
    return (
      <div className="w-full h-full bg-black overflow-hidden">
        <NewsLayoutRenderer layoutId={layoutId} articles={filteredArticles} category={category || "all"} />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background overflow-hidden">
      <NewsContainer 
        articles={filteredArticles}
        settings={data.settings || undefined}
        viewMode={data.settings?.type_view || "list"}
        orientation="horizontal"
        className="w-full h-full"
      />
    </div>
  );
};
