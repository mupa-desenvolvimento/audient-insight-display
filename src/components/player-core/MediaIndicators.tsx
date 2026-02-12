import { cn } from "@/lib/utils";

interface MediaIndicatorsProps {
  total: number;
  currentIndex: number;
  visible: boolean;
  activeColor?: string;
  inactiveColor?: string;
}

export const MediaIndicators = ({
  total,
  currentIndex,
  visible,
  activeColor = "bg-white",
  inactiveColor = "bg-white/30",
}: MediaIndicatorsProps) => {
  if (total <= 1) return null;

  return (
    <div
      className={cn(
        "absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={cn(
            "w-2 h-6 rounded-full transition-all duration-300",
            index === currentIndex ? `${activeColor} scale-110` : inactiveColor
          )}
        />
      ))}
    </div>
  );
};
