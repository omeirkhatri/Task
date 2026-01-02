import { List } from "@/components/admin/list";
import { DataTable } from "@/components/admin/data-table";
import { DateField } from "@/components/admin/date-field";
import { ReferenceField } from "@/components/admin/reference-field";
import { Badge } from "@/components/ui/badge";
import type { PaymentTransaction } from "./types";

const PaymentTransactionListContent = () => {
  return (
    <DataTable rowClick="show">
      <DataTable.Col
        source="id"
        label="ID"
        headerClassName="text-left"
        cellClassName="text-left"
        render={(record: PaymentTransaction) => `#${record.id}`}
      />
      <DataTable.Col
        source="payment_package_id"
        label="Package"
        headerClassName="text-left"
        cellClassName="text-left"
      >
        <ReferenceField source="payment_package_id" reference="payment_packages" link="show" />
      </DataTable.Col>
      <DataTable.Col
        source="amount_received"
        label="Amount Received"
        headerClassName="text-right"
        cellClassName="text-right"
        render={(record: PaymentTransaction) => (
          <span className="font-semibold">
            AED {record.amount_received.toLocaleString()}
          </span>
        )}
      />
      <DataTable.Col
        source="payment_method"
        label="Method"
        headerClassName="text-center"
        cellClassName="text-center"
        render={(record: PaymentTransaction) => (
          <Badge variant="outline">{record.payment_method}</Badge>
        )}
      />
      <DataTable.Col
        source="bank_charge"
        label="Bank Charge"
        headerClassName="text-right"
        cellClassName="text-right"
        render={(record: PaymentTransaction) => (
          <span className="text-muted-foreground">
            AED {record.bank_charge.toLocaleString()}
          </span>
        )}
      />
      <DataTable.Col
        source="net_amount"
        label="Net Amount"
        headerClassName="text-right"
        cellClassName="text-right"
        render={(record: PaymentTransaction) => (
          <span className="font-medium text-green-600 dark:text-green-400">
            AED {record.net_amount.toLocaleString()}
          </span>
        )}
      />
      <DataTable.Col
        source="date_paid"
        label="Date Paid"
        field={DateField}
        headerClassName="text-right"
        cellClassName="text-right"
      />
      <DataTable.Col
        source="invoice_number"
        label="Invoice"
        headerClassName="text-right"
        cellClassName="text-right"
        render={(record: PaymentTransaction) => (
          record.invoice_number ? (
            <span className="text-sm">{record.invoice_number}</span>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )
        )}
      />
    </DataTable>
  );
};

export const PaymentTransactionList = () => {
  return (
    <List title="Payment Transactions">
      <PaymentTransactionListContent />
    </List>
  );
};

