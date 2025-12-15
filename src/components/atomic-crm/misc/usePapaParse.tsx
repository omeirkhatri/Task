import * as Papa from "papaparse";
import { useCallback, useMemo, useRef, useState } from "react";

export type ImportError = {
  row: number;
  message: string;
  data?: unknown;
};

type Import =
  | {
      state: "idle";
    }
  | {
      state: "parsing";
    }
  | {
      state: "running" | "complete";

      rowCount: number;
      importCount: number;
      errorCount: number;
      errors: ImportError[];

      // The remaining time in milliseconds
      remainingTime: number | null;
    }
  | {
      state: "error";

      error: Error;
    };

type usePapaParseProps<T> = {
  // The import batch size
  batchSize?: number;

  // processBatch returns the number of imported items
  // It can throw errors or return an array of errors for individual rows
  processBatch(batch: T[], startRowIndex: number): Promise<ImportError[]>;
};

export function usePapaParse<T>({
  batchSize = 10,
  processBatch,
}: usePapaParseProps<T>) {
  const importIdRef = useRef<number>(0);

  const [importer, setImporter] = useState<Import>({
    state: "idle",
  });

  const reset = useCallback(() => {
    setImporter({
      state: "idle",
    });
    importIdRef.current += 1;
  }, []);

  const parseCsv = useCallback(
    (file: File) => {
      setImporter({
        state: "parsing",
      });

      const importId = importIdRef.current;
      Papa.parse<T>(file, {
        header: true,
        skipEmptyLines: true,
        async complete(results) {
          if (importIdRef.current !== importId) {
            return;
          }

          const csvErrors: ImportError[] = results.errors.map((err) => ({
            row: (err.row ?? 0) + 1, // Convert to 1-based row number
            message: err.message || "CSV parsing error",
            data: err,
          }));

          setImporter({
            state: "running",
            rowCount: results.data.length,
            errorCount: csvErrors.length,
            importCount: 0,
            remainingTime: null,
            errors: csvErrors,
          });

          let totalTime = 0;
          const importErrors: ImportError[] = [...csvErrors];
          
          for (let i = 0; i < results.data.length; i += batchSize) {
            if (importIdRef.current !== importId) {
              return;
            }

            const batch = results.data.slice(i, i + batchSize);
            const startRowIndex = i + 1; // 1-based row number
            try {
              const start = Date.now();
              const batchErrors = await processBatch(batch, startRowIndex);
              totalTime += Date.now() - start;

              // Add batch errors to the list
              if (batchErrors && batchErrors.length > 0) {
                importErrors.push(...batchErrors);
              }

              const meanTime = totalTime / (i + batch.length);
              const successfulCount = batch.length - (batchErrors?.length || 0);
              setImporter((previous) => {
                if (previous.state === "running") {
                  const importCount = previous.importCount + successfulCount;
                  return {
                    ...previous,
                    importCount,
                    errorCount: importErrors.length,
                    errors: importErrors,
                    remainingTime:
                      meanTime * (results.data.length - importCount),
                  };
                }
                return previous;
              });
            } catch (error) {
              console.error("Failed to import batch", error);
              // If processBatch throws, mark all rows in batch as errors
              const batchErrors: ImportError[] = batch.map((_, idx) => ({
                row: startRowIndex + idx,
                message: error instanceof Error ? error.message : String(error),
                data: batch[idx],
              }));
              importErrors.push(...batchErrors);
              
              setImporter((previous) =>
                previous.state === "running"
                  ? {
                      ...previous,
                      errorCount: importErrors.length,
                      errors: importErrors,
                    }
                  : previous,
              );
            }
          }

          setImporter((previous) =>
            previous.state === "running"
              ? {
                  ...previous,
                  state: "complete",
                  remainingTime: null,
                  errors: importErrors,
                }
              : previous,
          );
        },
        error(error) {
          console.error(error);
          setImporter({
            state: "error",
            error,
          });
        },
        dynamicTyping: true,
      });
    },
    [batchSize, processBatch],
  );

  return useMemo(
    () => ({
      importer,
      parseCsv,
      reset,
    }),
    [importer, parseCsv, reset],
  );
}
