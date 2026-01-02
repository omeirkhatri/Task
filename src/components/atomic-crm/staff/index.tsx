import type { Staff } from "../types";
import { StaffCreate } from "./StaffCreate";
import { StaffEdit } from "./StaffEdit";
import { StaffList } from "./StaffList";
import { StaffShow } from "./StaffShow";

export default {
  list: StaffList,
  show: StaffShow,
  edit: StaffEdit,
  create: StaffCreate,
  recordRepresentation: (record: Staff) =>
    `${record?.first_name} ${record?.last_name}`.trim(),
};


