import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Package, Users, TrendingUp, Calendar } from "lucide-react";

interface ProductAnalytics {
  id: string;
  ean: string;
  product_name: string | null;
  store_code: string | null;
  gender: string | null;
  age_group: string | null;
  emotion: string | null;
  lookup_count: number;
  lookup_date: string;
  ai_category: string | null;
  ai_enriched: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const genderLabels: Record<string, string> = {
  male: 'Masculino',
  female: 'Feminino',
  unknown: 'Não identificado',
};

const ageGroupLabels: Record<string, string> = {
  child: 'Criança',
  teen: 'Adolescente',
  adult: 'Adulto',
  senior: 'Idoso',
};

const emotionLabels: Record<string, string> = {
  happy: 'Feliz',
  neutral: 'Neutro',
  sad: 'Triste',
  angry: 'Irritado',
  surprised: 'Surpreso',
  fearful: 'Temeroso',
  disgusted: 'Enojado',
};

export default function ProductAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['product-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_lookup_analytics')
        .select('*')
        .order('last_lookup_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ProductAnalytics[];
    },
  });

  // Estatísticas agregadas
  const stats = {
    totalLookups: analytics?.reduce((sum, a) => sum + (a.lookup_count || 1), 0) || 0,
    uniqueProducts: new Set(analytics?.map(a => a.ean)).size,
    uniqueDays: new Set(analytics?.map(a => a.lookup_date)).size,
  };

  // Dados para gráfico de gênero
  const genderData = analytics?.reduce((acc, a) => {
    const gender = a.gender || 'unknown';
    const existing = acc.find(item => item.name === gender);
    if (existing) {
      existing.value += a.lookup_count || 1;
    } else {
      acc.push({ name: gender, label: genderLabels[gender] || gender, value: a.lookup_count || 1 });
    }
    return acc;
  }, [] as { name: string; label: string; value: number }[]) || [];

  // Dados para gráfico de faixa etária
  const ageData = analytics?.reduce((acc, a) => {
    const age = a.age_group || 'unknown';
    const existing = acc.find(item => item.name === age);
    if (existing) {
      existing.value += a.lookup_count || 1;
    } else {
      acc.push({ name: age, label: ageGroupLabels[age] || age, value: a.lookup_count || 1 });
    }
    return acc;
  }, [] as { name: string; label: string; value: number }[]) || [];

  // Top produtos
  const topProducts = analytics?.reduce((acc, a) => {
    const existing = acc.find(item => item.ean === a.ean);
    if (existing) {
      existing.count += a.lookup_count || 1;
    } else {
      acc.push({ 
        ean: a.ean, 
        name: a.product_name || a.ean, 
        count: a.lookup_count || 1,
        category: a.ai_category
      });
    }
    return acc;
  }, [] as { ean: string; name: string; count: number; category: string | null }[])
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Análise demográfica e produtos mais consultados
          </p>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Consultas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats.totalLookups}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos Únicos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats.uniqueProducts}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dias Ativos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats.uniqueDays}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Por Gênero</CardTitle>
              <CardDescription>Distribuição de consultas por gênero</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : genderData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {genderData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">Sem dados</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Por Faixa Etária</CardTitle>
              <CardDescription>Distribuição de consultas por idade</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : ageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Produtos Mais Consultados</CardTitle>
            <CardDescription>Ranking dos produtos com mais consultas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>EAN</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Consultas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={product.ean}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{product.name}</TableCell>
                      <TableCell className="font-mono text-sm">{product.ean}</TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="outline">{product.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{product.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhuma consulta registrada</p>
            )}
          </CardContent>
        </Card>

        {/* Histórico recente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Consultas Recentes</CardTitle>
            <CardDescription>Últimas consultas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : analytics && analytics.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Emoção</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.slice(0, 20).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {format(new Date(item.lookup_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {item.product_name || item.ean}
                      </TableCell>
                      <TableCell>{item.store_code || '-'}</TableCell>
                      <TableCell>
                        {item.gender ? (
                          <Badge variant="secondary">
                            {genderLabels[item.gender] || item.gender}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.age_group ? (
                          <Badge variant="outline">
                            {ageGroupLabels[item.age_group] || item.age_group}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.emotion ? (
                          <Badge variant="outline">
                            {emotionLabels[item.emotion] || item.emotion}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhuma consulta registrada</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
