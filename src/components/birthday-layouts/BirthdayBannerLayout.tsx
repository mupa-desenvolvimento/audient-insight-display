import { BirthdayLayoutProps } from "./types";
import { User, Cake } from "lucide-react";

const periodLabel = { day: "do Dia", week: "da Semana", month: "do Mês" };

export function BirthdayBannerLayout({ people, period, className }: BirthdayLayoutProps) {
  if (people.length === 0) {
    return (
      <div className={`flex items-center justify-center py-16 text-muted-foreground ${className}`}>
        Nenhum aniversariante {periodLabel[period].toLowerCase().replace("do ", "").replace("da ", "")}.
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* TV Banner Header */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 rounded-2xl p-6 text-primary-foreground">
        <div className="flex items-center gap-3 mb-2">
          <Cake className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Aniversariantes {periodLabel[period]}</h2>
            <p className="text-sm opacity-80">
              {people.length} {people.length === 1 ? "colaborador" : "colaboradores"} comemorando
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable banner strip */}
      <div className="flex gap-6 overflow-x-auto pb-2 snap-x snap-mandatory">
        {people.map((person) => {
          const birthDate = new Date(person.birth_date + "T00:00:00");
          return (
            <div
              key={person.id}
              className="flex-shrink-0 snap-center w-48 bg-card rounded-xl border shadow-sm overflow-hidden"
            >
              <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                {person.photo_url ? (
                  <img
                    src={person.photo_url}
                    alt={person.name}
                    className="w-16 h-16 rounded-full object-cover border-3 border-background shadow"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-background shadow flex items-center justify-center">
                    <User className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-3 text-center space-y-0.5">
                <p className="font-semibold text-sm truncate">{person.name}</p>
                <p className="text-xs text-primary font-medium">
                  {birthDate.getDate()}/{String(birthDate.getMonth() + 1).padStart(2, "0")}
                </p>
                {person.department && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {person.department}
                  </p>
                )}
                {person.role && (
                  <p className="text-[10px] text-muted-foreground/70 truncate">
                    {person.role}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
