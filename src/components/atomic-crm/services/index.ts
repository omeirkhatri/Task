import type { Service } from "../types";
import { ServiceCreate } from "./ServiceCreate";
import { ServiceEdit } from "./ServiceEdit";
import { ServiceList } from "./ServiceList";

export default {
  list: ServiceList,
  create: ServiceCreate,
  edit: ServiceEdit,
  recordRepresentation: (record: Service) => record.name,
};





