-- Enable realtime for import_logs to track progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_logs;