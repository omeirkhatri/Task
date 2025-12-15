import { Linkedin, Mail, Phone, MapPin, Archive, ArchiveRestore } from "lucide-react";
import { useRecordContext, WithRecord, useUpdate, useNotify, useRefresh } from "ra-core";
import type { ReactNode } from "react";
import { ArrayField } from "@/components/admin/array-field";
import { EditButton } from "@/components/admin/edit-button";
import { DeleteButton } from "@/components/admin";
import { ReferenceField } from "@/components/admin/reference-field";
import { ShowButton } from "@/components/admin/show-button";
import { SingleFieldList } from "@/components/admin/single-field-list";
import { TextField } from "@/components/admin/text-field";
import { DateField } from "@/components/admin/date-field";
import { EmailField } from "@/components/admin/email-field";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { TagsListEdit } from "./TagsListEdit";
import { ServicesListEdit } from "./ServicesListEdit";
import { AsideSection } from "../misc/AsideSection";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { SaleName } from "../sales/SaleName";
import type { Contact, Deal } from "../types";
import { ContactMergeButton } from "./ContactMergeButton";
import { ExportVCardButton } from "./ExportVCardButton";
import { findDealLabel } from "../deals/deal";

export const ContactAside = ({ link = "edit", deals = [] }: { link?: "edit" | "show"; deals?: Deal[] }) => {
  const { contactGender, leadStages } = useConfigurationContext();
  const record = useRecordContext<Contact>();

  if (!record) return null;
  
  // Separate archived and non-archived deals
  const activeDeals = deals.filter(d => !d.archived_at);
  const archivedDeals = deals.filter(d => d.archived_at);
  const sortedDeals = [...activeDeals, ...archivedDeals];

  return (
    <div className="hidden sm:block w-64 min-w-64 text-sm">
      <div className="mb-4 -ml-1 flex items-center gap-2">
        {link === "edit" ? (
          <EditButton label="Edit Contact" />
        ) : (
          <ShowButton label="Show Contact" />
        )}
        {sortedDeals.length > 0 && (
          <CondensedDealArchiveButton deal={sortedDeals[0]} />
        )}
      </div>

      {sortedDeals.length > 0 && (
        <AsideSection title="Status" noGap>
          {sortedDeals.map((deal) => (
            <CondensedDealListItem key={deal.id} deal={deal} />
          ))}
        </AsideSection>
      )}

      <AsideSection title="Personal info">
        <ArrayField source="email_jsonb">
          <SingleFieldList className="flex-col">
            <PersonalInfoRow
              icon={<Mail className="w-4 h-4 text-muted-foreground" />}
              primary={<EmailField source="email" />}
            />
          </SingleFieldList>
        </ArrayField>

        {record.has_newsletter && (
          <p className="pl-6 text-sm text-muted-foreground">
            Subscribed to newsletter
          </p>
        )}

        {record.linkedin_url && (
          <PersonalInfoRow
            icon={<Linkedin className="w-4 h-4 text-muted-foreground" />}
            primary={
              <a
                className="underline hover:no-underline text-sm text-muted-foreground"
                href={record.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                title={record.linkedin_url}
              >
                LinkedIn
              </a>
            }
          />
        )}
        <ArrayField source="phone_jsonb">
          <SingleFieldList className="flex-col">
            <PersonalInfoRow
              icon={<Phone className="w-4 h-4 text-muted-foreground" />}
              primary={<TextField source="number" />}
              showType
            />
          </SingleFieldList>
        </ArrayField>
        {contactGender
          .map((genderOption) => {
            if (record.gender === genderOption.value) {
              return (
                <PersonalInfoRow
                  key={genderOption.value}
                  primary={<span>{genderOption.label}</span>}
                />
              );
            }
            return null;
          })
          .filter(Boolean)}
        
        {/* Address as subcategory */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Address</h4>
          {record.flat_villa_number && (
            <div className="text-sm text-muted-foreground">
              <TextField source="flat_villa_number" record={record} />
            </div>
          )}
          {record.building_street && (
            <div className="text-sm text-muted-foreground">
              <TextField source="building_street" record={record} />
            </div>
          )}
          {record.area && (
            <div className="text-sm text-muted-foreground">
              <TextField source="area" record={record} />
            </div>
          )}
          {record.google_maps_link && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <a
                className="text-sm text-muted-foreground underline hover:no-underline"
                href={record.google_maps_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Maps
              </a>
            </div>
          )}
          {!record.flat_villa_number && !record.building_street && !record.area && !record.google_maps_link && (
            <div className="text-sm text-muted-foreground">No address information</div>
          )}
        </div>
      </AsideSection>

      <AsideSection title="Services interested in">
        <ServicesListEdit />
      </AsideSection>

      <AsideSection title="Tags">
        <TagsListEdit />
      </AsideSection>

      <AsideSection title="Background info">
        <WithRecord<Contact>
          render={(record) =>
            record?.background ? (
              <TextField source="background" record={record} className="pb-2" />
            ) : null
          }
        />
        <div className="text-muted-foreground">
          <span className="text-sm">Added on</span>{" "}
          <DateField
            source="first_seen"
            options={{ year: "numeric", month: "long", day: "numeric" }}
          />
        </div>

        <div className="text-muted-foreground">
          <span className="text-sm">Last activity on</span>{" "}
          <DateField
            source="last_seen"
            options={{ year: "numeric", month: "long", day: "numeric" }}
          />
        </div>

        <div className="inline-flex text-muted-foreground">
          Followed by&nbsp;
          <ReferenceField source="sales_id" reference="sales">
            <SaleName />
          </ReferenceField>
        </div>
      </AsideSection>

      {link !== "edit" && (
        <>
          <div className="mt-6 pt-6 border-t hidden sm:flex flex-col gap-2 items-start">
            <ExportVCardButton />
            <ContactMergeButton />
          </div>
          <div className="mt-6 pt-6 border-t hidden sm:flex flex-col gap-2 items-start">
            <DeleteButton
              className="h-6 cursor-pointer hover:bg-destructive/10! text-destructive! border-destructive! focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
              size="sm"
            />
          </div>
        </>
      )}
    </div>
  );
};

const PersonalInfoRow = ({
  icon,
  primary,
  showType,
}: {
  icon?: ReactNode;
  primary: ReactNode;
  showType?: boolean;
}) => (
  <div className="flex flex-row items-center gap-2 min-h-6">
    {icon && icon}
    <div className="flex flex-wrap gap-x-2 gap-y-0">
      {primary}
      {showType ? (
        <WithRecord
          render={(row) =>
            row.type !== "Other" && (
              <TextField source="type" className="text-muted-foreground" />
            )
          }
        />
      ) : null}
    </div>
  </div>
);

const CondensedDealArchiveButton = ({ deal }: { deal: Deal }) => {
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();

  const isArchived = deal.archived_at != null;

  const handleArchive = () => {
    update(
      "lead-journey",
      {
        id: deal.id,
        data: { archived_at: new Date().toISOString() },
        previousData: deal,
      },
      {
        onSuccess: () => {
          notify("Deal archived", { type: "info" });
          refresh();
        },
        onError: () => {
          notify("Error archiving deal", { type: "error" });
        },
      },
    );
  };

  const handleUnarchive = () => {
    update(
      "lead-journey",
      {
        id: deal.id,
        data: { archived_at: null },
        previousData: deal,
      },
      {
        onSuccess: () => {
          notify("Deal unarchived", { type: "info" });
          refresh();
        },
        onError: () => {
          notify("Error unarchiving deal", { type: "error" });
        },
      },
    );
  };

  return isArchived ? (
    <Button
      onClick={handleUnarchive}
      variant="outline"
      title="Unarchive"
      className="h-9 px-4 py-2"
    >
      <ArchiveRestore className="w-4 h-4" />
      <span className="ml-2">Archived</span>
    </Button>
  ) : (
    <Button
      onClick={handleArchive}
      variant="outline"
      title="Archive"
      className="h-9 px-4 py-2"
    >
      <Archive className="w-4 h-4" />
      <span className="ml-2">Archive</span>
    </Button>
  );
};

const CondensedDealListItem = ({ deal }: { deal: Deal }) => {
  const { leadStages } = useConfigurationContext();
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();

  const isArchived = deal.archived_at != null;

  const handleStageChange = (newStage: string) => {
    if (newStage === deal.stage) return;
    
    update(
      "lead-journey",
      {
        id: deal.id,
        data: { stage: newStage },
        previousData: deal,
      },
      {
        onSuccess: () => {
          notify("Deal stage updated", { type: "info" });
          refresh();
        },
        onError: () => {
          notify("Error updating deal stage", { type: "error" });
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      {isArchived && (
        <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded flex-shrink-0">
          Archived
        </span>
      )}
      <Select value={deal.stage} onValueChange={handleStageChange} className="flex-1">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {leadStages.map((stage) => (
            <SelectItem key={stage.value} value={stage.value}>
              {stage.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
