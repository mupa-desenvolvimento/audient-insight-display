interface ProgressBarProps {
  progressPercent: number;
  visible?: boolean;
}

export const PlayerProgressBar = ({ progressPercent, visible = true }: ProgressBarProps) => {
  if (!visible) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
      <div
        className="h-full bg-primary transition-all duration-100 ease-linear"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
};
