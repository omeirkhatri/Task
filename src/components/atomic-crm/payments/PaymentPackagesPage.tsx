import { List } from "@/components/admin/list";
import { PaymentPackageList, PaymentPackageListActions, filters } from "./PaymentPackageList";

export const PaymentPackagesPage = () => {
  return (
    <List filters={filters} actions={<PaymentPackageListActions />}>
      <PaymentPackageList />
    </List>
  );
};

PaymentPackagesPage.path = "/payment-packages";

