import { BirthdayLayoutProps } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, User } from "lucide-react";

const periodLabel = { day: "Hoje", week: "Esta semana", month: "Este mês" };

export function BirthdayCardsLayout({ people, period, className }: BirthdayLayoutProps) {
  if (people.length === 0) {
    return (
      <div className={`flex items-center justify-center py-16 text-muted-foreground ${className}`}>
        Nenhum aniversariante {periodLabel[period].toLowerCase()}.
      </div>
    );
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}>
      {people.map((person) => {
        const birthDate = new Date(person.birth_date + "T00:00:00");
        const day = birthDate.getDate();
        const month = birthDate.toLocaleDateString("pt-BR", { month: "short" });

        return (
          <Card key={person.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              {person.photo_url ? (
                <img
                  src={person.photo_url}
                  alt={person.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-background shadow-md flex items-center justify-center">
                  <User className="w-8 h-8 text-primary/60" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Cake className="w-3 h-3" />
                  {day} {month}
                </Badge>
              </div>
            </div>
            <CardContent className="pt-3 pb-4 text-center space-y-1">
              <p className="font-semibold text-sm truncate">{person.name}</p>
              {person.department && (
                <p className="text-xs text-muted-foreground truncate">{person.department}</p>
              )}
              {person.role && (
                <p className="text-xs text-muted-foreground/70 truncate">{person.role}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
