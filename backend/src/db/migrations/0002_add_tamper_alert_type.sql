-- Adds the 'tamper' alert type (tracker unplugged / external power cut). Kept as its own
-- migration file/transaction deliberately: Postgres forbids using an enum value added by
-- ALTER TYPE ... ADD VALUE within the same transaction that added it, so this must not be
-- combined with any migration that inserts/selects a 'tamper' alerts row.
ALTER TYPE "public"."alert_type" ADD VALUE 'tamper';