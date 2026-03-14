import { BirthdayLayoutProps } from "./types";
import { User, PartyPopper } from "lucide-react";

const periodLabel = { day: "Hoje", week: "Esta semana", month: "Este mês" };

const confettiColors = [
  "bg-red-400", "bg-yellow-400", "bg-green-400", "bg-blue-400",
  "bg-pink-400", "bg-purple-400", "bg-orange-400", "bg-teal-400",
];

export function BirthdayGridLayout({ people, period, className }: BirthdayLayoutProps) {
  if (people.length === 0) {
    return (
      <div className={`flex items-center justify-center py-16 text-muted-foreground ${className}`}>
        Nenhum aniversariante {periodLabel[period].toLowerCase()}.
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Confetti decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${confettiColors[i % confettiColors.length]} opacity-30`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {people.map((person) => {
          const birthDate = new Date(person.birth_date + "T00:00:00");
          const today = new Date();
          const isToday =
            birthDate.getDate() === today.getDate() &&
            birthDate.getMonth() === today.getMonth();

          return (
            <div
              key={person.id}
              className={`flex flex-col items-center text-center p-4 rounded-2xl transition-all ${
                isToday
                  ? "bg-gradient-to-b from-primary/15 to-primary/5 ring-2 ring-primary/20 scale-105"
                  : "bg-card/50 hover:bg-card hover:shadow-md"
              }`}
            >
              <div className="relative mb-3">
                {person.photo_url ? (
                  <img
                    src={person.photo_url}
                    alt={person.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-primary/10">
                    <User className="w-7 h-7 text-primary/50" />
                  </div>
                )}
                {isToday && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                    <PartyPopper className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="font-semibold text-xs truncate w-full">{person.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {birthDate.getDate()}/{String(birthDate.getMonth() + 1).padStart(2, "0")}
              </p>
              {person.department && (
                <p className="text-[10px] text-muted-foreground/70 truncate w-full mt-0.5">
                  {person.department}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
