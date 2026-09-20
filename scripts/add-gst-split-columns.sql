-- Add CGST, SGST, and additionalCharges columns to purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS cgst REAL DEFAULT 0 NOT NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sgst REAL DEFAULT 0 NOT NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS additional_charges REAL DEFAULT 0 NOT NULL;

-- Backfill existing purchases: split gst evenly into cgst/sgst
UPDATE purchases SET cgst = CAST(ROUND(gst / 2) AS REAL), sgst = CAST(ROUND(gst / 2) AS REAL) WHERE cgst = 0 AND gst > 0;
