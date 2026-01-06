import { useEffect, useState, useMemo } from "react";
import type { MouseEvent } from "react";
import { Upload, Loader2, AlertCircle } from "lucide-react";
import { Form, useRefresh, useGetList } from "ra-core";
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
import { formatImportError } from "./formatImportError";
import type { Service } from "../types";

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

function generateSampleCsv(services: Service[]): string {
  // Sort services by ID
  const sortedServices = [...services].sort((a, b) => Number(a.id) - Number(b.id));
  
  // Generate service ID cheat sheet
  const serviceCheatSheet = sortedServices.length > 0
    ? sortedServices.map((service) => `# ${service.id} = ${service.name}`).join("\n")
    : `# 1 = Doctor on Call
# 2 = Teleconsultation
# 3 = Physiotherapy
# 4 = Nurse on Call
# 5 = Blood Test
# 6 = IV Therapy
# 7 = Nanny
# 8 = Elderly Care`;

  // Get example service IDs (use first 3 for John, first 2 for Jane)
  const exampleServiceIds1 = sortedServices.length >= 3
    ? `${sortedServices[0].id};${sortedServices[Math.min(2, sortedServices.length - 1)].id};${sortedServices[Math.min(5, sortedServices.length - 1)].id}`
    : sortedServices.length > 0
    ? sortedServices.map(s => s.id).join(";")
    : "1;6;8";
  
  const exampleServiceIds2 = sortedServices.length >= 2
    ? `${sortedServices[0].id};${sortedServices[Math.min(1, sortedServices.length - 1)].id}`
    : sortedServices.length > 0
    ? sortedServices[0].id.toString()
    : "2;5";

  const csvContent = `# INSTRUCTIONS: 
# - email_jsonb: Just type email address(es). For multiple emails, separate with semicolon (e.g., "john@example.com" or "john@example.com;jane@example.com")
# - phone_jsonb: Just type phone number(s) in quotes to prevent Excel from converting to scientific notation. For multiple phones, separate with semicolon (e.g., "971551010743" or "971551010743;971501234567")
#   Note: Always put phone numbers in quotes in Excel to prevent scientific notation. Excel may remove + prefix - that's OK, just type numbers (e.g., "971551010743" instead of "+971 55 101 0743")
# - coordinates: Format as "latitude, longitude" (e.g., "25.157134, 55.409436"). Google Maps link will be auto-generated.
# - google_maps_link: Optional. If coordinates are provided, this will be auto-generated. You can also provide a custom link.
# - All coordinate fields are optional. If coordinates are provided, google_maps_link will be created automatically.
#
# SERVICE ID CHEAT SHEET (use semicolon-separated IDs in services_interested column, e.g., "1;6;8"):
${serviceCheatSheet}
#
first_name,last_name,gender,email_jsonb,phone_jsonb,flat_villa_number,building_street,area,coordinates,google_maps_link,phone_has_whatsapp,services_interested,description,first_seen,last_seen,tags
John,Doe,male,john@doe.example,"971551010743","Villa Lv 115",Longview,"Damac hills 1","25.157134, 55.409436",,TRUE,"${exampleServiceIds1}","Sample lead description",2024-07-01T00:00:00+00:00,2024-07-01T11:54:49.95+00:00,Satisfied
Jane,Doe,female,jane@doe.example,"971501234567",,"Main Street","Dubai Marina",,,FALSE,"${exampleServiceIds2}","Another lead description",2024-07-01T00:00:00+00:00,2024-07-01T11:54:49.95+00:00,"VIP, Regular"
`;

  return csvContent;
}

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

  // Fetch services to generate dynamic CSV
  const { data: services } = useGetList<Service>("services", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "name", order: "ASC" },
  });

  // Generate CSV sample dynamically with current services
  const sampleCsvContent = useMemo(() => {
    return generateSampleCsv(services || []);
  }, [services]);

  const sampleUrl = useMemo(() => {
    return `data:text/csv;name=crm_contacts_sample.csv;charset=utf-8,${encodeURIComponent(sampleCsvContent)}`;
  }, [sampleCsvContent]);

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
                          <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                            {importer.errors.map((error, index) => {
                              const formatted = formatImportError(error);
                              return (
                                <div
                                  key={index}
                                  className="rounded-md border border-destructive/20 bg-destructive/5 p-4"
                                >
                                  <div className="font-semibold text-base mb-1">
                                    Row {formatted.row}: {formatted.title}
                                  </div>
                                  <div className="text-sm text-muted-foreground mb-3">
                                    {formatted.message}
                                  </div>
                                  <div className="mt-3">
                                    <div className="text-xs font-medium mb-2 text-foreground">
                                      How to fix:
                                    </div>
                                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
                                      {formatted.steps.map((step, stepIndex) => (
                                        <li key={stepIndex} className="pl-1">
                                          {step}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                </div>
                              );
                            })}
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
                    <div>
                      Here is a sample CSV file you can use as a template
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={sampleUrl}
                        download={"crm_contacts_sample.csv"}
                      >
                        Download CSV sample
                      </Link>
                    </Button>
                    <div className="text-xs text-muted-foreground space-y-1 mt-2 pt-2 border-t">
                      <div><strong>Important Notes:</strong></div>
                      <div>• <strong>email_jsonb</strong>: Just type email address(es). Multiple emails: separate with semicolon (e.g., "john@example.com;jane@example.com")</div>
                      <div>• <strong>phone_jsonb</strong>: Just type phone number(s). Multiple phones: separate with semicolon. Excel removes + prefix - that's OK, just type numbers (e.g., "971551010743")</div>
                      <div>• <strong>services_interested</strong>: Use semicolon-separated service IDs (e.g., "1;6;8"). See the CSV file for Service ID cheat sheet.</div>
                      <div>• <strong>coordinates</strong>: Format as "latitude, longitude" (e.g., "25.157134, 55.409436"). Google Maps link will be auto-generated if coordinates are provided.</div>
                      <div>• <strong>google_maps_link</strong>: Optional. Auto-generated from coordinates if provided, or you can enter a custom link.</div>
                    </div>
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
