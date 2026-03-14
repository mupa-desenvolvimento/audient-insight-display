import { BirthdayLayoutProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { Cake, User, Mail, Building2 } from "lucide-react";

const periodLabel = { day: "Hoje", week: "Esta semana", month: "Este mês" };

export function BirthdayListLayout({ people, period, className }: BirthdayLayoutProps) {
  if (people.length === 0) {
    return (
      <div className={`flex items-center justify-center py-16 text-muted-foreground ${className}`}>
        Nenhum aniversariante {periodLabel[period].toLowerCase()}.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {people.map((person) => {
        const birthDate = new Date(person.birth_date + "T00:00:00");
        const today = new Date();
        const isToday =
          birthDate.getDate() === today.getDate() &&
          birthDate.getMonth() === today.getMonth();
        const formattedDate = birthDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
        });

        return (
          <div
            key={person.id}
            className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
              isToday
                ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                : "bg-card border-border hover:bg-muted/50"
            }`}
          >
            {person.photo_url ? (
              <img
                src={person.photo_url}
                alt={person.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{person.name}</p>
                {isToday && (
                  <Badge className="text-[10px] px-1.5 py-0 gap-0.5 bg-primary/90">
                    <Cake className="w-2.5 h-2.5" />
                    Hoje!
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {person.department && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {person.department}
                  </span>
                )}
                {person.role && <span>{person.role}</span>}
                {person.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {person.email}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-medium text-primary">
                {birthDate.getDate()}/{String(birthDate.getMonth() + 1).padStart(2, "0")}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">{formattedDate}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
