export { PaymentPackagesPage } from "./PaymentPackagesPage";
export { PaymentPackageList, PaymentPackageListActions, filters } from "./PaymentPackageList";
export { PaymentPackageForm } from "./PaymentPackageForm";
export { PaymentPackageShow } from "./PaymentPackageShow";
export { PaymentPackageCreate } from "./PaymentPackageCreate";
export { PaymentPackageEdit } from "./PaymentPackageEdit";
export { PackageDetailsView } from "./PackageDetailsView";
export { UsageTracker } from "./UsageTracker";
export { UsageAdjustmentForm } from "./UsageAdjustmentForm";
export { RenewalForm } from "./RenewalForm";
export { InstallmentSchedule } from "./InstallmentSchedule";
export { PaymentTransactionForm } from "./PaymentTransactionForm";
export { PaymentTransactionCreate } from "./PaymentTransactionCreate";
export { PaymentTransactionEdit } from "./PaymentTransactionEdit";
export { PaymentTransactionList } from "./PaymentTransactionList";
export { calculateBankCharge, useBankChargeCalculation } from "./BankChargeCalculator";
export type { BankChargeCalculation } from "./BankChargeCalculator";
export type {
  PaymentPackage,
  PaymentTransaction,
  PackageUsage,
  InstallmentSchedule,
  PaymentSettings,
} from "./types";

import type { PaymentPackage } from "./types";
import { PaymentPackagesPage } from "./PaymentPackagesPage";
import { PaymentPackageCreate } from "./PaymentPackageCreate";
import { PaymentPackageEdit } from "./PaymentPackageEdit";
import { PaymentPackageShow } from "./PaymentPackageShow";
import { Package } from "lucide-react";

export default {
  list: PaymentPackagesPage,
  create: PaymentPackageCreate,
  edit: PaymentPackageEdit,
  show: PaymentPackageShow,
  icon: Package,
  recordRepresentation: (record: PaymentPackage) => {
    return `Package #${record.id}`;
  },
};

export { default as paymentTransactions } from "./paymentTransactions";

