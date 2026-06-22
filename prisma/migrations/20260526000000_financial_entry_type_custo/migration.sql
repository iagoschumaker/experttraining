-- ============================================================================
-- Migration: Add CUSTO to FinancialEntryType enum
-- ============================================================================
-- PostgreSQL permite adicionar valores a enums existentes sem recriar a tabela.

ALTER TYPE "FinancialEntryType" ADD VALUE IF NOT EXISTS 'CUSTO';
