import { CRM } from "@/components/atomic-crm/root/CRM";

/**
 * Application entry point
 *
 * Customize Atomic CRM by passing props to the CRM component:
 *  - contactGender
 *  - companySectors
 *  - darkTheme
 *  - dealCategories
 *  - dealPipelineStatuses
 *  - dealStages
 *  - lightTheme
 *  - logo
 *  - noteStatuses
 *  - taskTypes
 *  - title
 * ... as well as all the props accepted by shadcn-admin-kit's <Admin> component.
 *
 * @example
 * const App = () => (
 *    <CRM
 *       logo="./img/logo.png"
 *       title="Acme CRM"
 *    />
 * );
 */
const App = () => (
  <CRM
    taskTypes={[
      "None",
      "Call",
      "WhatsApp",
      "Email",
      "Follow-up",
      "Appointment Scheduled",
      "Service Consultation",
      "Quote Sent",
      "Payment Reminder",
      "Service Delivery",
      "Follow-up Call",
      "Thank you",
    ]}
  />
);

export default App;
