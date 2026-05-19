-- Migration: add KAGGLE_PHARMACY value to CatalogSource enum
-- The Kaggle "Medicines from Egyptian Pharmacies" dataset is market-actual data
-- scraped from real pharmacy sales, so it includes imported drugs that the EDA
-- registry doesn't list — making it the primary Egyptian bootstrap source.

ALTER TYPE "CatalogSource" ADD VALUE IF NOT EXISTS 'KAGGLE_PHARMACY';
