-- Create weight_params table for production database
CREATE TABLE weight_params (
    id SERIAL PRIMARY KEY,
    date VARCHAR(255) NOT NULL UNIQUE,
    boeuf_kg_per_unit FLOAT NOT NULL DEFAULT 150,
    veau_kg_per_unit FLOAT NOT NULL DEFAULT 110,
    agneau_kg_per_unit FLOAT NOT NULL DEFAULT 10,
    poulet_kg_per_unit FLOAT NOT NULL DEFAULT 1.5,
    default_kg_per_unit FLOAT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on date for better performance
CREATE INDEX idx_weight_params_date ON weight_params(date);

-- Insert default weight parameters for today's date
INSERT INTO weight_params (date, boeuf_kg_per_unit, veau_kg_per_unit, agneau_kg_per_unit, poulet_kg_per_unit, default_kg_per_unit)
VALUES ('05-09-2025', 150.0, 110.0, 10.0, 1.5, 1.0)
ON CONFLICT (date) DO NOTHING;
