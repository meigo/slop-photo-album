-- Allow selection algorithms to annotate why a photo was placed in a
-- particular bucket. Used by the calendar fallback path to say
-- 'Fallback from December 2024' on a photo placed in January 2025.
ALTER TABLE selected_photo ADD COLUMN notes TEXT;
