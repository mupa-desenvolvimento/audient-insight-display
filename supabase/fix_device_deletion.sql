-- Fix for Device Deletion Error
-- The error "update or delete on table devices violates foreign key constraint" occurs because
-- related logs are not automatically deleted when a device is removed.
-- Run this script in your Supabase SQL Editor to enable cascading deletion.

-- 1. Fix product_lookup_logs
ALTER TABLE product_lookup_logs
DROP CONSTRAINT IF EXISTS product_lookup_logs_device_id_fkey;

ALTER TABLE product_lookup_logs
ADD CONSTRAINT product_lookup_logs_device_id_fkey
  FOREIGN KEY (device_id)
  REFERENCES devices(id)
  ON DELETE CASCADE;

-- 2. Fix product_lookup_analytics
ALTER TABLE product_lookup_analytics
DROP CONSTRAINT IF EXISTS product_lookup_analytics_device_id_fkey;

ALTER TABLE product_lookup_analytics
ADD CONSTRAINT product_lookup_analytics_device_id_fkey
  FOREIGN KEY (device_id)
  REFERENCES devices(id)
  ON DELETE CASCADE;

-- 3. Fix device_detection_logs
ALTER TABLE device_detection_logs
DROP CONSTRAINT IF EXISTS device_detection_logs_device_id_fkey;

ALTER TABLE device_detection_logs
ADD CONSTRAINT device_detection_logs_device_id_fkey
  FOREIGN KEY (device_id)
  REFERENCES devices(id)
  ON DELETE CASCADE;

-- 4. Fix device_group_members
ALTER TABLE device_group_members
DROP CONSTRAINT IF EXISTS device_group_members_device_id_fkey;

ALTER TABLE device_group_members
ADD CONSTRAINT device_group_members_device_id_fkey
  FOREIGN KEY (device_id)
  REFERENCES devices(id)
  ON DELETE CASCADE;
