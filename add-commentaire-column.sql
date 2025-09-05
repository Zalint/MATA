-- Migration pour ajouter la colonne commentaire à la table estimations
-- À exécuter manuellement sur la base de données

ALTER TABLE estimations 
ADD COLUMN commentaire TEXT DEFAULT NULL;

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'estimations' 
AND column_name = 'commentaire';
