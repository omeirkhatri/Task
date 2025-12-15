import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router";
import { Bell, CheckSquare, FileText } from "lucide-react";
import { useGetIdentity, useGetList, useUpdate } from "ra-core";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { RelativeDate } from "../misc/RelativeDate";
import type { ContactNote, DealNote, Task } from "../types";

type NotificationItem =
  | {
      kind: "task";
      id: Task["id"];
      text: string;
      date: string;
      contactId: Task["contact_id"];
      done: boolean;
      task: Task;
      isNew: boolean;
    }
  | {
      kind: "contactNote";
      id: ContactNote["id"];
      text: string;
      date: string;
      contactId: ContactNote["contact_id"];
      isNew: boolean;
    }
  | {
      kind: "dealNote";
      id: DealNote["id"];
      text: string;
      date: string;
      dealId: DealNote["deal_id"];
      isNew: boolean;
    };

const storageKey = (userId: number) => `crm.notifications.lastSeen.${userId}`;

const safeIso = (v: any) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

export const NotificationsMenu = () => {
  const queryClient = useQueryClient();
  const { identity } = useGetIdentity();
  const userId = Number.isInteger(identity?.id) ? (identity!.id as number) : null;

  const [open, setOpen] = useState(false);
  const [lastSeenIso, setLastSeenIso] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const stored = globalThis.localStorage?.getItem(storageKey(userId));
    setLastSeenIso(stored || null);
  }, [userId]);

  const mentionsFilter = useMemo(() => {
    if (!userId) return { "id@in": "(-1)" };
    return { "tagged_user_ids@cs": `{${userId}}` };
  }, [userId]);

  const { data: tasks = [], isPending: isTasksPending } = useGetList<Task>(
    "tasks",
    {
      pagination: { page: 1, perPage: 25 },
      sort: { field: "created_at", order: "DESC" },
      filter: mentionsFilter,
    },
    { enabled: !!userId },
  );

  const { data: contactNotes = [], isPending: isContactNotesPending } =
    useGetList<ContactNote>(
      "contactNotes",
      {
        pagination: { page: 1, perPage: 25 },
        sort: { field: "date", order: "DESC" },
        filter: mentionsFilter,
      },
      { enabled: !!userId },
    );

  const { data: dealNotes = [], isPending: isDealNotesPending } = useGetList<DealNote>(
    "dealNotes",
    {
      pagination: { page: 1, perPage: 25 },
      sort: { field: "date", order: "DESC" },
      filter: mentionsFilter,
    },
    { enabled: !!userId },
  );

  const lastSeenDate = useMemo(() => {
    if (!lastSeenIso) return null;
    const d = new Date(lastSeenIso);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [lastSeenIso]);

  const items: NotificationItem[] = useMemo(() => {
    const since = lastSeenDate?.getTime() ?? null;

    const mappedTasks: NotificationItem[] = tasks.map((t) => {
      const date =
        safeIso(t.created_at) ||
        safeIso(t.due_date) ||
        new Date().toISOString();
      const isNew = since ? new Date(date).getTime() > since : false;
      return {
        kind: "task",
        id: t.id,
        text: t.text || "Task",
        date,
        contactId: t.contact_id,
        done: !!t.done_date,
        task: t,
        isNew,
      };
    });

    const mappedContactNotes: NotificationItem[] = contactNotes.map((n) => {
      const date = safeIso(n.date) || new Date().toISOString();
      const isNew = since ? new Date(date).getTime() > since : false;
      return {
        kind: "contactNote",
        id: n.id,
        text: n.text || "Note",
        date,
        contactId: n.contact_id,
        isNew,
      };
    });

    const mappedDealNotes: NotificationItem[] = dealNotes.map((n) => {
      const date = safeIso(n.date) || new Date().toISOString();
      const isNew = since ? new Date(date).getTime() > since : false;
      return {
        kind: "dealNote",
        id: n.id,
        text: n.text || "Note",
        date,
        dealId: n.deal_id,
        isNew,
      };
    });

    const merged = [...mappedTasks, ...mappedContactNotes, ...mappedDealNotes];
    merged.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());
    return merged.slice(0, 40);
  }, [contactNotes, dealNotes, lastSeenDate, tasks]);

  const unreadCount = useMemo(
    () => items.reduce((acc, it) => acc + (it.isNew ? 1 : 0), 0),
    [items],
  );

  const [updateTask, { isPending: isUpdatingTask }] = useUpdate();

  const markAllAsRead = () => {
    if (!userId) return;
    const now = new Date().toISOString();
    globalThis.localStorage?.setItem(storageKey(userId), now);
    setLastSeenIso(now);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    // When closing the menu, mark all currently visible notifications as “seen”.
    if (!nextOpen && userId) {
      const now = new Date().toISOString();
      globalThis.localStorage?.setItem(storageKey(userId), now);
      setLastSeenIso(now);
    }
  };

  const isPending = isTasksPending || isContactNotesPending || isDealNotesPending;

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative inline-flex"
          aria-label="Notifications"
        >
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[420px] p-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="text-sm font-medium">Mentions</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={markAllAsRead}
            disabled={!userId}
          >
            Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-[70vh] overflow-auto">
          {!userId ? (
            <div className="px-3 py-8 text-sm text-muted-foreground">
              Sign in to see notifications.
            </div>
          ) : isPending ? (
            <div className="px-3 py-8 text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-8 text-sm text-muted-foreground">
              No mentions yet.
            </div>
          ) : (
            <div className="py-1">
              {items.map((it) => {
                const href =
                  it.kind === "task"
                    ? `/contacts/${it.contactId}/show?tab=tasks#task-${it.id}`
                    : it.kind === "contactNote"
                      ? `/contacts/${it.contactId}/show?tab=notes#note-${it.id}`
                      : `/lead-journey/${it.dealId}/show?tab=notes#note-${it.id}`;

                return (
                  <div
                    key={`${it.kind}-${it.id}`}
                    className={cn(
                      "px-3 py-2 flex items-start gap-2 hover:bg-accent/60",
                      it.isNew && "bg-accent/30",
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {it.kind === "task" ? (
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {it.kind === "task" ? (
                      <Checkbox
                        checked={it.done}
                        disabled={isUpdatingTask}
                        onCheckedChange={() => {
                          updateTask("tasks", {
                            id: it.id,
                            data: { done_date: it.done ? null : new Date().toISOString() },
                            previousData: it.task,
                          });
                          // Keep the dropdown list in sync
                          queryClient.invalidateQueries({ queryKey: ["tasks", "getList"] });
                        }}
                        className="mt-1 h-4 w-4"
                      />
                    ) : (
                      <span className="mt-1 h-4 w-4 flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <Link
                        to={href}
                        className="block no-underline text-foreground"
                        onClick={() => setOpen(false)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-muted-foreground">
                            {it.kind === "task" ? "Task" : "Note"}
                            {it.isNew ? " • New" : ""}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            <RelativeDate date={it.date} />
                          </div>
                        </div>
                        <div className="text-sm leading-5 mt-0.5 line-clamp-2">
                          {it.text}
                        </div>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



