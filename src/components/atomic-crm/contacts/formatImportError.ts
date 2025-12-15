import type { ImportError } from "../misc/usePapaParse";

export interface FormattedImportError {
  row: number;
  title: string;
  message: string;
  steps: string[];
  data?: unknown;
}

/**
 * Formats import errors into plain English with actionable steps to fix them
 */
export function formatImportError(error: ImportError): FormattedImportError {
  const { row, message, data } = error;
  
  // CSV parsing errors
  if (message.includes("CSV parsing error") || message.includes("Quoted field not terminated")) {
    return {
      row,
      title: "CSV Format Error",
      message: "The CSV file has formatting issues that prevent it from being read correctly.",
      steps: [
        "Open your CSV file in a text editor or spreadsheet application",
        "Check for unclosed quotes or special characters in your data",
        "Ensure all text fields with commas are properly quoted",
        "Save the file and try importing again",
      ],
      data,
    };
  }

  // Missing required fields
  if (message.includes("first_name") || message.includes("last_name") || message.includes("required")) {
    return {
      row,
      title: "Missing Required Information",
      message: "This row is missing required contact information.",
      steps: [
        "Open your CSV file",
        `Go to row ${row}`,
        "Make sure at least one of these columns has a value: 'first_name' or 'last_name'",
        "Add the missing information and save the file",
        "Try importing again",
      ],
      data,
    };
  }

  // Invalid date format
  if (message.includes("date") || message.includes("Invalid Date") || message.includes("toISOString")) {
    return {
      row,
      title: "Invalid Date Format",
      message: "The date format in this row is not recognized.",
      steps: [
        "Open your CSV file",
        `Go to row ${row}`,
        "Check the date columns (first_seen, last_seen)",
        "Make sure dates are in a standard format like: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss",
        "Example: 2024-01-15 or 2024-01-15T10:30:00",
        "Update the date and save the file",
        "Try importing again",
      ],
      data,
    };
  }

  // Invalid JSON format
  if (message.includes("JSON") || message.includes("parse") || message.includes("Unexpected token")) {
    return {
      row,
      title: "Invalid Data Format",
      message: "Some data in this row is not in the correct format.",
      steps: [
        "Open your CSV file",
        `Go to row ${row}`,
        "Check columns that contain JSON data (like email_jsonb or phone_jsonb)",
        "If using JSON format, ensure it's valid JSON syntax",
        "Alternatively, use the simple column format (email_work, phone_work, etc.)",
        "Save the file and try importing again",
      ],
      data,
    };
  }

  // Email validation errors
  if (message.includes("email") || message.includes("Email")) {
    return {
      row,
      title: "Invalid Email Address",
      message: "One or more email addresses in this row are not valid.",
      steps: [
        "Open your CSV file",
        `Go to row ${row}`,
        "Check all email columns (email_work, email_home, email_other, or email_jsonb)",
        "Make sure email addresses follow the format: name@domain.com",
        "Remove any spaces or invalid characters",
        "Save the file and try importing again",
      ],
      data,
    };
  }

  // Phone validation errors
  if (message.includes("phone") || message.includes("Phone")) {
    return {
      row,
      title: "Invalid Phone Number",
      message: "One or more phone numbers in this row are not valid.",
      steps: [
        "Open your CSV file",
        `Go to row ${row}`,
        "Check all phone columns (phone_work, phone_home, phone_other, or phone_jsonb)",
        "Ensure phone numbers contain only digits, spaces, dashes, or plus signs",
        "Save the file and try importing again",
      ],
      data,
    };
  }

  // Database/constraint errors
  if (message.includes("duplicate") || message.includes("unique") || message.includes("constraint")) {
    return {
      row,
      title: "Duplicate Entry",
      message: "This contact already exists in the system.",
      steps: [
        "This contact may already be imported",
        "Check if the contact exists in your contact list",
        "If you want to update an existing contact, edit it directly instead of importing",
        "Or remove this row from your CSV file and try importing again",
      ],
      data,
    };
  }

  // Foreign key errors (company, tag, etc.)
  if (message.includes("foreign key") || message.includes("company") || message.includes("tag")) {
    return {
      row,
      title: "Invalid Reference",
      message: "This row references a company, tag, or other item that doesn't exist.",
      steps: [
        "Open your CSV file",
        `Go to row ${row}`,
        "Check the company name or tag names",
        "Make sure the company exists in your system (create it first if needed)",
        "Make sure tag names match exactly with existing tags (case-sensitive)",
        "Or remove the company/tag reference and add it later",
        "Save the file and try importing again",
      ],
      data,
    };
  }

  // Generic database errors
  if (message.includes("database") || message.includes("Database") || message.includes("SQL")) {
    return {
      row,
      title: "Database Error",
      message: "There was a problem saving this contact to the database.",
      steps: [
        "This might be a temporary issue",
        "Check your internet connection",
        "Try importing again",
        "If the problem persists, contact support",
      ],
      data,
    };
  }

  // Unknown error - provide generic help
  return {
    row,
    title: "Import Error",
    message: message || "An unexpected error occurred while importing this row.",
    steps: [
      "Open your CSV file",
      `Go to row ${row}`,
      "Review the data in this row for any obvious issues",
      "Compare it with the sample CSV template",
      "Make sure all required fields are filled",
      "Check for special characters or formatting issues",
      "Save the file and try importing again",
      "If the problem persists, try importing fewer rows at a time",
    ],
    data,
  };
}
