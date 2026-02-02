-- Add global_position column for cross-channel ordering
ALTER TABLE public.playlist_channel_items
ADD COLUMN global_position integer DEFAULT 0;

-- Update existing items with sequential global positions based on channel order
WITH ordered_items AS (
  SELECT 
    pci.id,
    ROW_NUMBER() OVER (
      PARTITION BY pc.playlist_id 
      ORDER BY pc.position, pci.position
    ) - 1 as new_global_position
  FROM playlist_channel_items pci
  JOIN playlist_channels pc ON pci.channel_id = pc.id
)
UPDATE playlist_channel_items
SET global_position = ordered_items.new_global_position
FROM ordered_items
WHERE playlist_channel_items.id = ordered_items.id;