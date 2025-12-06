import {
  crmDateTimeInputString,
  crmDateTimeStringToISO,
} from "../misc/timezone";

export const getCurrentDate = () => crmDateTimeInputString();

export const formatNoteDate = (dateString: string) =>
  crmDateTimeStringToISO(dateString) ?? dateString;
