import { createContext, useContext, type ReactNode } from "react";

import type { ContactGender, DealStage, NoteStatus } from "../types";
import {
  defaultCompanySectors,
  defaultContactGender,
  defaultDarkModeLogo,
  defaultDealCategories,
  defaultDealPipelineStatuses,
  defaultDealStages,
  defaultLightModeLogo,
  defaultNoteStatuses,
  defaultTaskTypes,
  defaultTitle,
  defaultServices,
  defaultLeadStages,
  defaultClientStatuses,
} from "./defaultConfiguration";

// Define types for the context value
export interface ConfigurationContextValue {
  companySectors: string[];
  dealCategories: string[];
  dealPipelineStatuses: string[];
  dealStages: DealStage[];
  leadStages: DealStage[];
  noteStatuses: NoteStatus[];
  taskTypes: string[];
  title: string;
  darkModeLogo: string;
  lightModeLogo: string;
  contactGender: ContactGender[];
  services: string[];
  clientStatuses: string[];
}

export interface ConfigurationProviderProps extends ConfigurationContextValue {
  children: ReactNode;
}

// Create context with default value
export const ConfigurationContext = createContext<ConfigurationContextValue>({
  companySectors: defaultCompanySectors,
  dealCategories: defaultDealCategories,
  dealPipelineStatuses: defaultDealPipelineStatuses,
  dealStages: defaultDealStages,
  leadStages: defaultLeadStages,
  noteStatuses: defaultNoteStatuses,
  taskTypes: defaultTaskTypes,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
  contactGender: defaultContactGender,
  services: defaultServices,
  clientStatuses: defaultClientStatuses,
});

export const ConfigurationProvider = ({
  children,
  companySectors,
  dealCategories,
  dealPipelineStatuses,
  dealStages,
  leadStages,
  darkModeLogo,
  lightModeLogo,
  noteStatuses,
  taskTypes,
  title,
  contactGender,
  services,
  clientStatuses,
}: ConfigurationProviderProps) => (
  <ConfigurationContext.Provider
    value={{
      companySectors,
      dealCategories,
      dealPipelineStatuses,
      dealStages,
      leadStages,
      darkModeLogo,
      lightModeLogo,
      noteStatuses,
      title,
      taskTypes,
      contactGender,
      services,
      clientStatuses,
    }}
  >
    {children}
  </ConfigurationContext.Provider>
);

export const useConfigurationContext = () => useContext(ConfigurationContext);
