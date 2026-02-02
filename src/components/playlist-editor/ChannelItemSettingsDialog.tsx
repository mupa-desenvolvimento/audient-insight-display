import { useState, useEffect } from "react";
import { PlaylistChannelItem } from "@/hooks/usePlaylistChannels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, CalendarRange, Save } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ChannelItemSettingsDialogProps {
  item: PlaylistChannelItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: {
    duration_override: number;
    is_schedule_override: boolean;
    start_date: string | null;
    end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    days_of_week: number[] | null;
  }) => void;
}

const DAYS = [
  { value: "0", label: "Dom" },
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];

export const ChannelItemSettingsDialog = ({
  item,
  open,
  onOpenChange,
  onSave,
}: ChannelItemSettingsDialogProps) => {
  const [duration, setDuration] = useState(8);
  const [isScheduleOverride, setIsScheduleOverride] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(["0", "1", "2", "3", "4", "5", "6"]);

  useEffect(() => {
    if (item) {
      setDuration(item.duration_override || item.media?.duration || 8);
      setIsScheduleOverride(item.is_schedule_override || false);
      setStartDate(item.start_date || "");
      setEndDate(item.end_date || "");
      setStartTime(item.start_time?.slice(0, 5) || "00:00");
      setEndTime(item.end_time?.slice(0, 5) || "23:59");
      setDaysOfWeek(
        item.days_of_week?.map(String) || ["0", "1", "2", "3", "4", "5", "6"]
      );
    }
  }, [item]);

  const handleSave = () => {
    if (!item) return;

    onSave(item.id, {
      duration_override: duration,
      is_schedule_override: isScheduleOverride,
      start_date: isScheduleOverride && startDate ? startDate : null,
      end_date: isScheduleOverride && endDate ? endDate : null,
      start_time: isScheduleOverride ? startTime : null,
      end_time: isScheduleOverride ? endTime : null,
      days_of_week: isScheduleOverride ? daysOfWeek.map(Number) : null,
    });

    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configurações do Item
            {item.is_schedule_override && (
              <Badge variant="secondary" className="text-xs">
                Agendamento próprio
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Media Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="w-16 h-12 rounded bg-background overflow-hidden">
              {item.media?.file_url && (
                item.media.type === "video" ? (
                  <video
                    src={item.media.file_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={item.media.thumbnail_url || item.media.file_url}
                    alt={item.media.name}
                    className="w-full h-full object-cover"
                  />
                )
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.media?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {item.media?.type}
                {item.media?.duration && ` • ${item.media.duration}s original`}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Duração na tela (segundos)
            </Label>
            <Input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 8)}
            />
            <p className="text-xs text-muted-foreground">
              Tempo que este conteúdo ficará visível
            </p>
          </div>

          <Separator />

          {/* Schedule Override Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Agendamento individual
              </Label>
              <p className="text-xs text-muted-foreground">
                Sobrescrever agendamento da playlist
              </p>
            </div>
            <Switch
              checked={isScheduleOverride}
              onCheckedChange={setIsScheduleOverride}
            />
          </div>

          {/* Schedule Settings */}
          {isScheduleOverride && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Data início</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Data fim</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Hora início</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Hora fim</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-2">
                  <CalendarRange className="w-3 h-3" />
                  Dias da semana
                </Label>
                <ToggleGroup
                  type="multiple"
                  value={daysOfWeek}
                  onValueChange={(value) => {
                    if (value.length > 0) setDaysOfWeek(value);
                  }}
                  className="flex flex-wrap gap-1"
                >
                  {DAYS.map((day) => (
                    <ToggleGroupItem
                      key={day.value}
                      value={day.value}
                      size="sm"
                      className="px-3"
                    >
                      {day.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
