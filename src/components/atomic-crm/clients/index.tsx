import type { Contact } from "../types";
import { ClientCreate } from "./ClientCreate";
import { ClientEdit } from "./ClientEdit";
import { ClientList } from "./ClientList";
import { ClientShow } from "./ClientShow";

export default {
  list: ClientList,
  show: ClientShow,
  edit: ClientEdit,
  create: ClientCreate,
  recordRepresentation: (record: Contact) =>
    record?.first_name + " " + record?.last_name,
};




