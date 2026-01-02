import type { PaymentTransaction } from "./types";
import { PaymentTransactionList } from "./PaymentTransactionList";
import { PaymentTransactionCreate } from "./PaymentTransactionCreate";
import { PaymentTransactionEdit } from "./PaymentTransactionEdit";
import { CreditCard } from "lucide-react";

export default {
  list: PaymentTransactionList,
  create: PaymentTransactionCreate,
  edit: PaymentTransactionEdit,
  icon: CreditCard,
  recordRepresentation: (record: PaymentTransaction) => {
    return `Transaction #${record.id} - AED ${record.amount_received.toLocaleString()}`;
  },
};

