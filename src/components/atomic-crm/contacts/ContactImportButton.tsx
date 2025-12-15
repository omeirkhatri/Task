import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { Form, useRefresh } from "ra-core";
import { Link } from "react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FormToolbar } from "@/components/admin/simple-form";
import { FileInput } from "@/components/admin/file-input";
import { FileField } from "@/components/admin/file-field";

import { usePapaParse } from "../misc/usePapaParse";
import type { ContactImportSchema } from "./useContactImport";
import { useContactImport } from "./useContactImport";
import * as sampleCsv from "./contacts_export.csv?raw";

export const ContactImportButton = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpenModal}
        className="flex items-center gap-2 cursor-pointer"
      >
        <Upload /> Import
      </Button>
      <ContactImportDialog open={modalOpen} onClose={handleCloseModal} />
    </>
  );
};

const SAMPLE_URL = `data:text/csv;name=crm_contacts_sample.csv;charset=utf-8,${encodeURIComponent(
  sampleCsv.default,
)}`;

type ContactImportModalProps = {
  open: boolean;
  onClose(): void;
};

export function ContactImportDialog({
  open,
  onClose,
}: ContactImportModalProps) {
  const refresh = useRefresh();
  const processBatch = useContactImport();
  const { importer, parseCsv, reset } = usePapaParse<ContactImportSchema>({
    batchSize: 10,
    processBatch,
  });

  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (importer.state === "complete") {
      // Refresh to show imported contacts in lead journey
      refresh();
      // Additional refresh after a short delay to ensure backend has processed all lead-journey entries
      setTimeout(() => {
        refresh();
      }, 500);
    }
  }, [importer.state, refresh]);

  const handleFileChange = (file: File | null) => {
    setFile(file);
  };

  const startImport = () => {
    if (!file) return;
    parseCsv(file);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleReset = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <Form className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Import</DialogTitle>
            <DialogDescription className="sr-only">
              Import contacts from a CSV file. Upload a file to begin the import process.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-2">
            {importer.state === "running" && (
              <div className="flex flex-col gap-2">
                <Alert>
                  <AlertDescription className="flex flex-row gap-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    The import is running, please do not close this tab.
                  </AlertDescription>
                </Alert>

                <div className="text-sm">
                  Imported{" "}
                  <strong>
                    {importer.importCount} / {importer.rowCount}
                  </strong>{" "}
                  contacts, with <strong>{importer.errorCount}</strong> errors.
                  {importer.remainingTime !== null && (
                    <>
                      {" "}
                      Estimated remaining time:{" "}
                      <strong>
                        {millisecondsToTime(importer.remainingTime)}
                      </strong>
                      .{" "}
                      <button
                        onClick={handleReset}
                        className="text-red-600 underline hover:text-red-800"
                      >
                        Stop import
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {importer.state === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription>
                  Failed to import this file: {importer.error.message || "Please make sure you provided a valid CSV file."}
                </AlertDescription>
              </Alert>
            )}

            {(importer.state === "complete" || importer.state === "running") && importer.errorCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="flex flex-col gap-2">
                  <div>
                    {importer.state === "complete" ? (
                      <>Contacts import complete. Imported {importer.importCount} contacts, with <strong>{importer.errorCount} errors</strong>.</>
                    ) : (
                      <>Importing... {importer.errorCount} errors so far.</>
                    )}
                  </div>
                  {importer.errors && importer.errors.length > 0 && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="errors" className="border-none">
                        <AccordionTrigger className="py-2 text-sm hover:no-underline">
                          View error details ({importer.errors.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="max-h-60 overflow-y-auto space-y-2 text-sm">
                            {importer.errors.map((error, index) => (
                              <div
                                key={index}
                                className="rounded-md border border-destructive/20 bg-destructive/5 p-2"
                              >
                                <div className="font-medium">
                                  Row {error.row}: {error.message}
                                </div>
                                {error.data && typeof error.data === "object" && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Data: {JSON.stringify(error.data, null, 2)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {importer.state === "complete" && importer.errorCount === 0 && (
              <Alert>
                <AlertDescription>
                  Contacts import complete. Successfully imported {importer.importCount} contacts.
                </AlertDescription>
              </Alert>
            )}

            {importer.state === "idle" && (
              <>
                <Alert>
                  <AlertDescription className="flex flex-col gap-4">
                    Here is a sample CSV file you can use as a template
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={SAMPLE_URL}
                        download={"crm_contacts_sample.csv"}
                      >
                        Download CSV sample
                      </Link>
                    </Button>{" "}
                  </AlertDescription>
                </Alert>

                <FileInput
                  source="csv"
                  label="CSV File"
                  accept={{ "text/csv": [".csv"] }}
                  onChange={handleFileChange}
                >
                  <FileField source="src" title="title" target="_blank" />
                </FileInput>
              </>
            )}
          </div>
        </Form>

        <div className="flex justify-start pt-6">
          <FormToolbar>
            {importer.state === "idle" ? (
              <Button onClick={startImport} disabled={!file}>
                Import
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={importer.state === "running"}
              >
                Close
              </Button>
            )}
          </FormToolbar>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function millisecondsToTime(ms: number) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (60 * 1000)) % 60);

  return `${minutes}m ${seconds}s`;
}
