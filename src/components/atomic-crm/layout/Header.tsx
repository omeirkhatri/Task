import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Settings, User, Moon, Sun, RotateCw, LoaderCircle } from "lucide-react";
import { CanAccess } from "ra-core";
import { Link, matchPath, useLocation } from "react-router";
import { UserMenu } from "@/components/admin/user-menu";
import { useUserMenu } from "@/hooks/user-menu-context";
import { useTheme } from "@/components/admin/theme-provider";
import { useRefresh, useLoading } from "ra-core";
import React, { useState, useEffect } from "react";
import { getCrmTimeZone } from "../misc/timezone";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { NotificationsMenu } from "./NotificationsMenu";

// Navigation groups configuration - easy to extend
const navigationGroups = [
  {
    label: "Contacts",
    items: [
      { label: "Leads", path: "/contacts", matchPattern: "/contacts/*" },
      { label: "Clients", path: "/clients", matchPattern: "/clients/*" },
      { label: "Staff", path: "/staff", matchPattern: "/staff/*" },
      { label: "Lead Journey", path: "/lead-journey", matchPattern: "/lead-journey/*" },
    ],
  },
  {
    label: "Tasks & Notes",
    items: [
      { label: "Tasks", path: "/tasks", matchPattern: "/tasks" },
      { label: "Notes", path: "/notes", matchPattern: "/notes" },
    ],
  },
  {
    label: "Appointments",
    items: [
      { label: "Appointments", path: "/appointments", matchPattern: "/appointments" },
    ],
  },
];

const Header = () => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  const location = useLocation();

  // Check if any path in a group is active
  const isGroupActive = (group: typeof navigationGroups[0]) => {
    return group.items.some((item) => matchPath(item.matchPattern, location.pathname));
  };

  // Check if a specific item is active
  const isItemActive = (matchPattern: string) => {
    return matchPath(matchPattern, location.pathname);
  };

  return (
    <nav className="flex-grow">
      <header className="bg-secondary">
        <div className="px-4">
          <div className="flex justify-between items-center flex-1">
            <Link
              to="/"
              className="flex items-center gap-2 text-secondary-foreground no-underline"
            >
              <img
                className="[.light_&]:hidden h-6"
                src={darkModeLogo}
                alt={title}
              />
              <img
                className="[.dark_&]:hidden h-6"
                src={lightModeLogo}
                alt={title}
              />
              <h1 className="text-xl font-semibold">{title}</h1>
            </Link>
            <div className="flex items-center gap-6">
              <NavigationMenu viewport={false}>
                <NavigationMenuList className="gap-0">
                  {navigationGroups.map((group) => {
                    // If only one item, render as direct link
                    if (group.items.length === 1) {
                      const item = group.items[0];
                      const isActive = isItemActive(item.matchPattern);
                      return (
                        <NavigationMenuItem key={group.label}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={item.path}
                              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 rounded-none h-auto ${
                                isActive
                                  ? "text-secondary-foreground border-secondary-foreground"
                                  : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
                              }`}
                            >
                              {group.label}
                            </Link>
                          </NavigationMenuLink>
                        </NavigationMenuItem>
                      );
                    }
                    // Multiple items, render as dropdown
                    return (
                      <NavigationMenuItem key={group.label}>
                        <NavigationMenuTrigger
                          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 rounded-none h-auto bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent ${
                            isGroupActive(group)
                              ? "text-secondary-foreground border-secondary-foreground"
                              : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
                          }`}
                        >
                          {group.label}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="left-0 top-full mt-0 z-50">
                          <div className="w-[200px] p-2">
                            {group.items.map((item) => (
                              <NavigationMenuLink
                                key={item.path}
                                asChild
                                data-active={isItemActive(item.matchPattern)}
                              >
                                <Link
                                  to={item.path}
                                  className={`block rounded-sm px-3 py-2 text-sm transition-colors ${
                                    isItemActive(item.matchPattern)
                                      ? "bg-accent text-accent-foreground font-medium"
                                      : "hover:bg-accent hover:text-accent-foreground"
                                  }`}
                                >
                                  {item.label}
                                </Link>
                              </NavigationMenuLink>
                            ))}
                          </div>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
            <div className="flex items-center">
              <NotificationsMenu />
              <CrmDateTime />
              <UserMenu>
                <ConfigurationMenu />
                <CanAccess resource="sales" action="list">
                  <UsersMenu />
                </CanAccess>
                <ThemeModeMenu />
                <RefreshMenu />
              </UserMenu>
            </div>
          </div>
        </div>
      </header>
    </nav>
  );
};

const UsersMenu = () => {
  const { onClose } = useUserMenu() ?? {};
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/settings" className="flex items-center gap-2">
        <User /> Users and Settings
      </Link>
    </DropdownMenuItem>
  );
};

const ThemeModeMenu = () => {
  const { theme, setTheme } = useTheme();
  const { onClose } = useUserMenu() ?? {};

  // Get current effective theme (handle system theme)
  const getEffectiveTheme = (): "light" | "dark" => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };

  const currentTheme = getEffectiveTheme();

  const handleToggle = () => {
    // Toggle between light and dark
    const newTheme = currentTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
    onClose?.();
  };

  // Show the opposite theme name (what it will switch to)
  const targetTheme = currentTheme === "light" ? "dark" : "light";
  const targetIcon = targetTheme === "dark" ? Moon : Sun;
  const targetLabel = targetTheme === "dark" ? "Dark" : "Light";

  return (
    <DropdownMenuItem onClick={handleToggle} className="flex items-center gap-2">
      {targetIcon === Moon ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      {targetLabel} Mode
    </DropdownMenuItem>
  );
};

const RefreshMenu = () => {
  const refresh = useRefresh();
  const loading = useLoading();
  const { onClose } = useUserMenu() ?? {};

  const handleRefresh = () => {
    refresh();
    onClose?.();
  };

  return (
    <DropdownMenuItem onClick={handleRefresh} className="flex items-center gap-2">
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <RotateCw className="h-4 w-4" />
      )}
      Refresh
    </DropdownMenuItem>
  );
};

const ConfigurationMenu = () => {
  const { onClose } = useUserMenu() ?? {};
  return (
    <DropdownMenuItem asChild onClick={onClose}>
      <Link to="/settings" className="flex items-center gap-2">
        <Settings />
        My info
      </Link>
    </DropdownMenuItem>
  );
};

const CrmDateTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format date as "Mon 29 Dec" in CRM timezone
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: getCrmTimeZone(),
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const dateStr = dateFormatter.format(currentTime);
  
  // Format time as "9:23 PM" (12-hour format, no seconds) in CRM timezone
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: getCrmTimeZone(),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const timeStr = timeFormatter.format(currentTime);

  return (
    <div className="flex items-center gap-2 text-sm text-secondary-foreground/90">
      <span className="font-semibold">{dateStr} {timeStr}</span>
    </div>
  );
};

export default Header;
