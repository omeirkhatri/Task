import {
  useGetList,
  useRecordContext,
  useUpdate,
  useGetOne,
} from "ra-core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Contact, Sale } from "../types";
import { SaleName } from "../sales/SaleName";

export const AccountManagerEdit = () => {
  const record = useRecordContext<Contact>();
  const [update] = useUpdate<Contact>();

  const { data: allSales, isPending: isPendingSales } = useGetList<Sale>(
    "sales",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "last_name", order: "ASC" },
      filter: { "disabled@neq": true },
    },
  );

  const { data: currentSale } = useGetOne<Sale>(
    "sales",
    { id: record?.sales_id },
    { enabled: !!record?.sales_id },
  );

  const handleChange = (newSalesId: string) => {
    if (!record) {
      throw new Error("No contact record found");
    }
    const salesId = newSalesId === "none" ? null : Number(newSalesId);
    update("contacts", {
      id: record.id,
      data: { sales_id: salesId },
      previousData: record,
    });
  };

  if (isPendingSales) return null;

  return (
    <Select
      value={record?.sales_id?.toString() || "none"}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-full h-8 text-sm">
        <SelectValue>
          {currentSale ? (
            <SaleName sale={currentSale} />
          ) : (
            <span className="text-muted-foreground">No account manager</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">No account manager</span>
        </SelectItem>
        {allSales?.map((sale) => (
          <SelectItem key={sale.id} value={sale.id.toString()}>
            {`${sale.first_name} ${sale.last_name}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

