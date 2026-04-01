'use client';

import { useState, useCallback } from 'react';
import { parseExcelFile, mergeAndDeduplicate } from './excel-parser';
import { ParsedExcelRow } from '@/shared/types/medical';
import { createClient } from '@/shared/lib/supabase/client';

interface ParseResult {
  unique: ParsedExcelRow[];
  totalDuplicates: number;
  totalProcessed: number;
}

export function useExcelParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);

  const processFiles = useCallback(async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Parsear todos los archivos
      const parsed = await Promise.all(
        files.map(async (file) => ({
          rows: await parseExcelFile(file),
          sourceFile: file.name,
        }))
      );

      const totalProcessed = parsed.reduce((acc, p) => acc + p.rows.length, 0);

      // 2. Combinar y deduplicar
      const { unique, totalDuplicates } = mergeAndDeduplicate(parsed);

      // 3. Guardar en Supabase
      const supabase = createClient();

      // Limpiar tabla antes de insertar (para re-procesar archivos frescos)
      await supabase.from('medical_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insertar en lotes de 500 (la deduplicación ya se hizo en JS, insert simple)
      const chunkSize = 500;
      for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from('medical_records')
          .insert(
            chunk.map((row) => ({
              patient_name: row.patient_name,
              patient_doc: row.patient_doc ?? null,
              doctor_name: row.doctor_name ?? null,
              entity_name: row.entity_name,
              treatment_name: row.treatment_name ?? null,
              invoice_number: row.invoice_number ?? null,
              treatment_date: row.treatment_date ?? null,
              source_file: (row as ParsedExcelRow & { source_file?: string }).source_file ?? null,
            }))
          );

        if (insertError) throw new Error(insertError.message);
      }

      setResult({ unique, totalDuplicates, totalProcessed });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { processFiles, isLoading, error, result };
}
