import { CheckSquare, CheckCircle2, Search } from "lucide-react";
import {
  ListContextProvider,
  ResourceContextProvider,
  useGetIdentity,
  useGetList,
  useList,
} from "ra-core";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { AddTask } from "./AddTask";
import { TasksIterator } from "./TasksIterator";
import {
  crmAddDays,
  crmEndOfDay,
  crmEndOfWeek,
  crmStartOfDay,
} from "../misc/timezone";
import type { Task } from "../types";

const startOfTodayDate = crmStartOfDay();
const endOfTodayDate = crmEndOfDay();
const endOfTomorrowDate = crmEndOfDay(crmAddDays(new Date(), 1));
const endOfWeekDate = crmEndOfWeek();

const startOfTodayDateISO = (startOfTodayDate ?? new Date()).toISOString();
const endOfTodayDateISO = (endOfTodayDate ?? new Date()).toISOString();
const endOfTomorrowDateISO = (endOfTomorrowDate ?? new Date()).toISOString();
const endOfWeekDateISO = (endOfWeekDate ?? new Date()).toISOString();

const taskFilters = {
  overdue: {
    "due_date@lt": startOfTodayDateISO,
    "done_date@is": null,
  },
  today: {
    "due_date@gte": startOfTodayDateISO,
    "due_date@lte": endOfTodayDateISO,
    "done_date@is": null,
  },
  tomorrow: {
    "due_date@gt": endOfTodayDateISO,
    "due_date@lte": endOfTomorrowDateISO,
    "done_date@is": null,
  },
  thisWeek: {
    "due_date@gt": endOfTomorrowDateISO,
    "due_date@lte": endOfWeekDateISO,
    "done_date@is": null,
  },
  later: {
    "due_date@gt": endOfWeekDateISO,
    "done_date@is": null,
  },
  completed: {
    "done_date@not.is": null,
  },
};

type TaskColumnProps = {
  title: string;
  filter: any;
  showMyTasksOnly: boolean;
  currentUserId?: number;
  sortBy?: "due_date" | "done_date";
  sortOrder?: "ASC" | "DESC";
  searchQuery?: string;
};

const TaskColumn = ({
  title,
  filter,
  showMyTasksOnly,
  currentUserId,
  sortBy = "due_date",
  sortOrder = "ASC",
  searchQuery,
}: TaskColumnProps) => {
  const baseFilter = useMemo(() => {
    let finalFilter = { ...filter };
    
    if (showMyTasksOnly && currentUserId) {
      // Filter by tagged_user_ids using @cs (contains) operator
      finalFilter["tagged_user_ids@cs"] = `{${currentUserId}}`;
    }
    
    // Add search filter if provided
    if (searchQuery && searchQuery.trim()) {
      finalFilter["text@ilike"] = `%${searchQuery.trim()}%`;
    }
    
    return finalFilter;
  }, [filter, showMyTasksOnly, currentUserId, searchQuery]);

  const {
    data: tasks,
    total,
    isPending,
  } = useGetList<Task>(
    "tasks",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: sortBy, order: sortOrder },
      filter: baseFilter,
    },
    { enabled: !showMyTasksOnly || !!currentUserId },
  );

  // Sort tasks based on column type
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    
    // For completed column, sort by done_date descending (most recent first)
    if (sortBy === "done_date") {
      return tasks.sort((a, b) => {
        const dateA = new Date(a.done_date || 0).getTime();
        const dateB = new Date(b.done_date || 0).getTime();
        return dateB - dateA; // Descending order
      });
    }
    
    // For other columns: only show incomplete tasks, sorted by due_date
    return tasks
      .filter(task => !task.done_date)
      .sort((a, b) => {
        const dateA = new Date(a.due_date || 0).getTime();
        const dateB = new Date(b.due_date || 0).getTime();
        return dateA - dateB;
      });
  }, [tasks, sortBy]);

  const listContext = useList({
    data: sortedTasks,
    isPending,
    resource: "tasks",
    perPage: 1000,
  });

  return (
    <div className="flex flex-col h-full">
      <Card className="flex flex-col h-full border-border/50 shadow-sm">
        <CardHeader className="pb-2.5 px-4 pt-3 border-b border-border/50">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span>{title}</span>
            {total !== undefined && total > 0 && (
              <span className="text-xs font-medium text-foreground bg-muted px-1.5 py-0.5 rounded">
                {total}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2">
          <ResourceContextProvider value="tasks">
            <ListContextProvider value={listContext}>
              {isPending ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <TasksIterator showContact showAll showTimestamp={false} />
              )}
            </ListContextProvider>
          </ResourceContextProvider>
        </CardContent>
      </Card>
    </div>
  );
};

const CompletedTasksDialog = ({
  open,
  onClose,
  showMyTasksOnly,
  currentUserId,
  searchQuery: initialSearchQuery,
}: {
  open: boolean;
  onClose: () => void;
  showMyTasksOnly: boolean;
  currentUserId?: number;
  searchQuery?: string;
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");

  // Sync search query when dialog opens or parent search changes
  useEffect(() => {
    if (open && initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [open, initialSearchQuery]);

  const baseFilter = useMemo(() => {
    let finalFilter = { ...taskFilters.completed };
    
    if (showMyTasksOnly && currentUserId) {
      finalFilter["tagged_user_ids@cs"] = `{${currentUserId}}`;
    }
    
    if (searchQuery && searchQuery.trim()) {
      finalFilter["text@ilike"] = `%${searchQuery.trim()}%`;
    }
    
    return finalFilter;
  }, [showMyTasksOnly, currentUserId, searchQuery]);

  const {
    data: tasks,
    total,
    isPending,
  } = useGetList<Task>(
    "tasks",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "done_date", order: "DESC" },
      filter: baseFilter,
    },
    { enabled: open },
  );

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.sort((a, b) => {
      const dateA = new Date(a.done_date || 0).getTime();
      const dateB = new Date(b.done_date || 0).getTime();
      return dateB - dateA;
    });
  }, [tasks]);

  const listContext = useList({
    data: sortedTasks,
    isPending,
    resource: "tasks",
    perPage: 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Completed Tasks</DialogTitle>
          <DialogDescription className="sr-only">
            View all completed tasks
          </DialogDescription>
        </DialogHeader>
        {/* Search Bar */}
        <div className="flex-shrink-0 pb-4">
          <div className="flex flex-grow relative">
            <input
              type="text"
              placeholder="Search completed tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <ResourceContextProvider value="tasks">
            <ListContextProvider value={listContext}>
              {isPending ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : sortedTasks && sortedTasks.length > 0 ? (
                <TasksIterator showContact showAll showTimestamp={true} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">No completed tasks</p>
                </div>
              )}
            </ListContextProvider>
          </ResourceContextProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const TasksPage = () => {
  const { identity } = useGetIdentity();
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col w-full lg:h-[calc(100vh-8rem)] h-auto -mx-4 -mt-4 p-6 gap-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-2">
        {/* Search Bar (moved into header) */}
        <div className="flex-shrink-0 w-full max-w-md">
          <div className="flex flex-grow relative">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="my-tasks-only"
              checked={showMyTasksOnly}
              onCheckedChange={setShowMyTasksOnly}
            />
            <Label
              htmlFor="my-tasks-only"
              className="text-sm font-medium cursor-pointer text-muted-foreground"
            >
              My Tasks Only
            </Label>
          </div>
          <Button
            variant="outline"
            onClick={() => setCompletedDialogOpen(true)}
            className="flex items-center gap-2"
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            Completed Tasks
          </Button>
          <AddTask display="icon" selectContact />
        </div>
      </div>

      {/* Task Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-0 overflow-hidden max-md:overflow-y-auto max-md:h-auto">
        <TaskColumn
          title="Overdue"
          filter={taskFilters.overdue}
          showMyTasksOnly={showMyTasksOnly}
          currentUserId={identity?.id}
          searchQuery={searchQuery}
        />
        <TaskColumn
          title="Today"
          filter={taskFilters.today}
          showMyTasksOnly={showMyTasksOnly}
          currentUserId={identity?.id}
          searchQuery={searchQuery}
        />
        <TaskColumn
          title="Tomorrow"
          filter={taskFilters.tomorrow}
          showMyTasksOnly={showMyTasksOnly}
          currentUserId={identity?.id}
          searchQuery={searchQuery}
        />
        <TaskColumn
          title="This Week"
          filter={taskFilters.thisWeek}
          showMyTasksOnly={showMyTasksOnly}
          currentUserId={identity?.id}
          searchQuery={searchQuery}
        />
        <TaskColumn
          title="Later"
          filter={taskFilters.later}
          showMyTasksOnly={showMyTasksOnly}
          currentUserId={identity?.id}
          searchQuery={searchQuery}
        />
      </div>

      <CompletedTasksDialog
        open={completedDialogOpen}
        onClose={() => setCompletedDialogOpen(false)}
        showMyTasksOnly={showMyTasksOnly}
        currentUserId={identity?.id}
        searchQuery={searchQuery}
      />
    </div>
  );
};

TasksPage.path = "/tasks";
