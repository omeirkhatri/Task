import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleX, Copy, Pencil, Save, Plus, Trash2, Edit } from "lucide-react";
import {
  Form,
  useDataProvider,
  useGetIdentity,
  useGetOne,
  useNotify,
  useRecordContext,
  useGetList,
  useCreate,
  useUpdate,
  useDelete,
  type Identifier,
} from "ra-core";
import { useState } from "react";
import * as React from "react";
import { useFormState } from "react-hook-form";
import { useNavigate } from "react-router";
import { RecordField } from "@/components/admin/record-field";
import { TextInput } from "@/components/admin/text-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Confirm } from "@/components/admin/confirm";

import ImageEditorField from "../misc/ImageEditorField";
import type { CrmDataProvider } from "../providers/types";
import type { Sale, SalesFormData, Tag, Service } from "../types";
import { TagCreateModal } from "../tags/TagCreateModal";
import { TagEditModal } from "../tags/TagEditModal";
import { TagChip } from "../tags/TagChip";
import { colors } from "../tags/colors";
import { RoundButton } from "../tags/RoundButton";
import { useTimezone } from "@/hooks/useTimezone";
import { useOfficeLocation } from "@/hooks/useOfficeLocation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCrmDateTime } from "../misc/timezone";
import { PaymentSettingsSection } from "./PaymentSettingsSection";

export const SettingsPage = () => {
  const [isEditMode, setEditMode] = useState(false);
  const { identity, refetch: refetchIdentity } = useGetIdentity();
  const { data, refetch: refetchUser } = useGetOne("sales", {
    id: identity?.id,
  });
  const notify = useNotify();
  const dataProvider = useDataProvider<CrmDataProvider>();

  const { mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SalesFormData) => {
      if (!identity) {
        throw new Error("Record not found");
      }
      return dataProvider.salesUpdate(identity.id, data);
    },
    onSuccess: () => {
      refetchIdentity();
      refetchUser();
      setEditMode(false);
      notify("Your profile has been updated");
    },
    onError: (_) => {
      notify("An error occurred. Please try again", {
        type: "error",
      });
    },
  });

  if (!identity) return null;

  const handleOnSubmit = async (values: any) => {
    mutate(values);
  };

  const isAdministrator = data?.administrator === true;

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={isAdministrator ? "grid w-full grid-cols-6" : "grid w-full grid-cols-5"}>
          <TabsTrigger value="profile">My Info</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="payments">Payment Settings</TabsTrigger>
          {isAdministrator && (
            <TabsTrigger value="users">Users</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Form onSubmit={handleOnSubmit} record={data}>
            <SettingsForm isEditMode={isEditMode} setEditMode={setEditMode} />
          </Form>
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <GeneralSettingsSection />
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          <TagsManagementSection />
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <ServicesManagementSection />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentSettingsSection />
        </TabsContent>

        {isAdministrator && (
          <TabsContent value="users" className="mt-6">
            <UsersManagementSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

const SettingsForm = ({
  isEditMode,
  setEditMode,
}: {
  isEditMode: boolean;
  setEditMode: (value: boolean) => void;
}) => {
  const notify = useNotify();
  const record = useRecordContext<Sale>();
  const { identity, refetch } = useGetIdentity();
  const { isDirty } = useFormState();
  const dataProvider = useDataProvider<CrmDataProvider>();

  const { mutate: updatePassword } = useMutation({
    mutationKey: ["updatePassword"],
    mutationFn: async () => {
      if (!identity) {
        throw new Error("Record not found");
      }
      return dataProvider.updatePassword(identity.id);
    },
    onSuccess: () => {
      notify("A reset password email has been sent to your email address");
    },
    onError: (e) => {
      notify(`${e}`, {
        type: "error",
      });
    },
  });

  const { mutate: mutateSale } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SalesFormData) => {
      if (!record) {
        throw new Error("Record not found");
      }
      return dataProvider.salesUpdate(record.id, data);
    },
    onSuccess: () => {
      refetch();
      notify("Your profile has been updated");
    },
    onError: () => {
      notify("An error occurred. Please try again.");
    },
  });
  if (!identity) return null;

  const handleClickOpenPasswordChange = () => {
    updatePassword();
  };

  const handleAvatarUpdate = async (values: any) => {
    mutateSale(values);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="mb-4 flex flex-row justify-between">
            <h2 className="text-xl font-semibold text-muted-foreground">
              My info
            </h2>
          </div>

          <div className="space-y-4 mb-4">
            <ImageEditorField
              source="avatar"
              type="avatar"
              onSave={handleAvatarUpdate}
              linkPosition="right"
            />
            <TextRender source="first_name" isEditMode={isEditMode} />
            <TextRender source="last_name" isEditMode={isEditMode} />
            <TextRender source="email" isEditMode={isEditMode} />
          </div>

          <div className="flex flex-row justify-end gap-2">
            {!isEditMode && (
              <>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleClickOpenPasswordChange}
                >
                  Change password
                </Button>
              </>
            )}

            <Button
              type="button"
              variant={isEditMode ? "ghost" : "outline"}
              onClick={() => setEditMode(!isEditMode)}
              className="flex items-center"
            >
              {isEditMode ? <CircleX /> : <Pencil />}
              {isEditMode ? "Cancel" : "Edit"}
            </Button>

            {isEditMode && (
              <Button type="submit" disabled={!isDirty} variant="outline">
                <Save />
                Save
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {import.meta.env.VITE_INBOUND_EMAIL && (
        <Card>
          <CardContent>
            <div className="space-y-4 justify-between">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Inbound email
              </h2>
              <p className="text-sm text-muted-foreground">
                You can start sending emails to your server's inbound email
                address, e.g. by adding it to the
                <b> Cc: </b> field. BestDOC CRM will process the emails and add
                notes to the corresponding contacts.
              </p>
              <CopyPaste />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const TextRender = ({
  source,
  isEditMode,
}: {
  source: string;
  isEditMode: boolean;
}) => {
  if (isEditMode) {
    return <TextInput source={source} helperText={false} />;
  }
  return (
    <div className="m-2">
      <RecordField source={source} />
    </div>
  );
};

const CopyPaste = () => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    setCopied(true);
    navigator.clipboard.writeText(import.meta.env.VITE_INBOUND_EMAIL);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={handleCopy}
            variant="ghost"
            className="normal-case justify-between w-full"
          >
            <span className="overflow-hidden text-ellipsis">
              {import.meta.env.VITE_INBOUND_EMAIL}
            </span>
            <Copy className="h-4 w-4 ml-2" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : "Copy"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Tags Management Section
const TagsManagementSection = () => {
  const notify = useNotify();
  const { data: tags, isLoading, refetch } = useGetList<Tag>("tags", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "name", order: "ASC" },
  });
  const [create] = useCreate<Tag>();
  const [update] = useUpdate<Tag>();
  const [deleteTag] = useDelete();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

  const handleCreateSuccess = async () => {
    setCreateModalOpen(false);
    refetch();
    notify("Tag created successfully");
  };

  const handleEditClick = (tag: Tag) => {
    setSelectedTag(tag);
    setEditModalOpen(true);
  };

  const handleEditSuccess = async () => {
    setEditModalOpen(false);
    setSelectedTag(null);
    refetch();
    notify("Tag updated successfully");
  };

  const handleDeleteClick = (tag: Tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (tagToDelete) {
      await deleteTag("tags", { id: tagToDelete.id });
      setDeleteDialogOpen(false);
      setTagToDelete(null);
      refetch();
      notify("Tag deleted successfully");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Tags Management</CardTitle>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : tags && tags.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>{tag.name}</TableCell>
                  <TableCell>
                    <TagChip tag={tag} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(tag)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(tag)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No tags found. Create your first tag!
          </div>
        )}

        <TagCreateModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />

        {selectedTag && (
          <TagEditModal
            tag={selectedTag}
            open={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedTag(null);
            }}
            onSuccess={handleEditSuccess}
          />
        )}

        <Confirm
          isOpen={deleteDialogOpen}
          loading={false}
          title="Delete Tag"
          content={`Are you sure you want to delete the tag "${tagToDelete?.name}"? This action cannot be undone.`}
          confirm="Delete"
          cancel="Cancel"
          confirmColor="warning"
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      </CardContent>
    </Card>
  );
};

// Services Management Section
const ServicesManagementSection = () => {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { data: services, isLoading, refetch } = useGetList<Service>("services", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "name", order: "ASC" },
  });
  const [create] = useCreate<Service>();
  const [update] = useUpdate<Service>();
  const [deleteService] = useDelete();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceColor, setServiceColor] = useState("#3b82f6");
  
  // Color palette for services (expanded with unique colors, excluding blue/green/red used for status)
  // Status colors to avoid: #3b82f6 (blue), #10b981 (green), #ef4444 (red)
  const serviceColors = [
    // Purples and Violets
    "#a855f7", // purple
    "#8b5cf6", // violet
    "#c084fc", // purple-300
    "#9333ea", // purple-600
    "#7c3aed", // violet-600
    "#6d28d9", // purple-700
    "#a78bfa", // violet-400
    "#8338ec", // electric purple
    "#9370db", // medium purple
    "#8a2be2", // blue violet
    "#ba55d3", // medium orchid
    "#da70d6", // orchid
    
    // Oranges and Corals
    "#f97316", // orange
    "#fb923c", // orange-400
    "#f59e0b", // amber
    "#fbbf24", // amber-400
    "#fb7185", // rose-400
    "#f87171", // red-400 (lighter, distinct from status red)
    "#fa8b5c", // coral
    "#ff6b35", // vibrant coral
    "#fb5607", // bright orange
    "#c2410c", // orange-700 (brownish)
    "#ff6347", // tomato
    "#ff4500", // orange red
    "#ff8c00", // dark orange
    "#ffa500", // orange
    
    // Pinks and Magentas
    "#ec4899", // pink
    "#f43f5e", // rose
    "#f472b6", // pink-400
    "#e879f9", // fuchsia-400
    "#d946ef", // fuchsia-600
    "#c026d3", // fuchsia-700
    "#db2777", // pink-600
    "#ff006e", // hot pink/magenta
    "#ff1493", // deep pink
    "#ff69b4", // hot pink
    
    // Cyans and Teals
    "#06b6d4", // cyan
    "#14b8a6", // teal
    "#22d3ee", // sky
    "#2dd4bf", // teal-400
    "#0891b2", // cyan-600
    "#0d9488", // teal-600
    "#5eead4", // teal-300
    "#67e8f9", // cyan-300
    "#00ced1", // dark turquoise
    "#48d1cc", // medium turquoise
    "#40e0d0", // turquoise
    
    // Yellows and Golds
    "#eab308", // yellow
    "#facc15", // yellow-400
    "#fde047", // yellow-300
    "#ca8a04", // yellow-600
    "#ffbe0b", // golden yellow
    "#ffd700", // gold
    
    // Limes and Light Greens (distinct from status green #10b981)
    "#84cc16", // lime
    "#a3e635", // lime-400
    "#65a30d", // lime-600
    "#bef264", // lime-300
    "#4ade80", // green-300 (lighter than status green)
    "#22c55e", // green-500 (different shade)
    "#06ffa5", // mint green
    "#adff2f", // green yellow
    "#7fff00", // chartreuse
    "#00fa9a", // medium spring green
    
    // Indigos
    "#6366f1", // indigo-500
    "#818cf8", // indigo-400
    "#4f46e5", // indigo-600
    "#4338ca", // indigo-700
    
    // Slates and Grays
    "#64748b", // slate-500
    "#475569", // slate-600
    "#94a3b8", // slate-400
    "#334155", // slate-700
    "#1e293b", // slate-800
    
    // Browns and Coppers
    "#a16207", // amber-700 (brownish)
    "#92400e", // amber-800
    "#78350f", // amber-900
    "#b45309", // amber-600
    
    // Unique Vibrant Colors (different from status colors)
    "#3a86ff", // bright blue (different from status blue #3b82f6)
  ];

  const handleCreate = async () => {
    if (!serviceName.trim()) {
      notify("Service name is required", { type: "error" });
      return;
    }
    await create("services", { data: { name: serviceName.trim(), color: serviceColor } });
    setServiceName("");
    setServiceColor("#3b82f6");
    setCreateDialogOpen(false);
    // Invalidate all services queries to refresh appointment types and other components
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        Array.isArray(queryKey) && queryKey[0] === "services",
    });
    refetch();
    notify("Service created successfully");
  };

  const handleEditClick = (service: Service) => {
    setSelectedService(service);
    setServiceName(service.name);
    setServiceColor(service.color || "#3b82f6");
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!serviceName.trim() || !selectedService) {
      notify("Service name is required", { type: "error" });
      return;
    }
    await update("services", {
      id: selectedService.id,
      data: { name: serviceName.trim(), color: serviceColor },
      previousData: selectedService,
    });
    setServiceName("");
    setServiceColor("#3b82f6");
    setSelectedService(null);
    setEditDialogOpen(false);
    // Invalidate all services queries to refresh appointment types and other components
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        Array.isArray(queryKey) && queryKey[0] === "services",
    });
    refetch();
    notify("Service updated successfully");
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (serviceToDelete) {
      await deleteService("services", { id: serviceToDelete.id });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
      // Invalidate all services queries to refresh appointment types and other components
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          Array.isArray(queryKey) && queryKey[0] === "services",
      });
      refetch();
      notify("Service deleted successfully");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Services Management</CardTitle>
          <Button onClick={() => {
            setServiceName("");
            setServiceColor("#3b82f6");
            setCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : services && services.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-border"
                        style={{ backgroundColor: service.color || "#3b82f6" }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {service.color || "#3b82f6"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(service)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(service)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No services found. Create your first service!
          </div>
        )}

        {/* Create Service Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service</DialogTitle>
              <DialogDescription>
                Add a new service to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="service-name">Service Name</Label>
                <Input
                  id="service-name"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Enter service name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {serviceColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setServiceColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        serviceColor === color
                          ? "border-foreground scale-110 ring-2 ring-offset-2 ring-primary"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: serviceColor }}
                  />
                  <span className="text-sm text-muted-foreground">{serviceColor}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>
                <Save className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Service Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>
                Update the service name.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-service-name">Service Name</Label>
                <Input
                  id="edit-service-name"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Enter service name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleUpdate();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {serviceColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setServiceColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        serviceColor === color
                          ? "border-foreground scale-110 ring-2 ring-offset-2 ring-primary"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: serviceColor }}
                  />
                  <span className="text-sm text-muted-foreground">{serviceColor}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedService(null);
                  setServiceName("");
                  setServiceColor("#3b82f6");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                <Save className="h-4 w-4 mr-2" />
                Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Service Dialog */}
        <Confirm
          isOpen={deleteDialogOpen}
          loading={false}
          title="Delete Service"
          content={`Are you sure you want to delete the service "${serviceToDelete?.name}"? This action cannot be undone.`}
          confirm="Delete"
          cancel="Cancel"
          confirmColor="warning"
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      </CardContent>
    </Card>
  );
};

// Users Management Section
const UsersManagementSection = () => {
  const notify = useNotify();
  const navigate = useNavigate();
  const { identity } = useGetIdentity();
  const { data: users, isLoading, refetch } = useGetList<Sale>("sales", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "first_name", order: "ASC" },
  });
  const dataProvider = useDataProvider<CrmDataProvider>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Sale | null>(null);
  const [deleteUser] = useDelete();

  const handleDeleteClick = (user: Sale) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (userToDelete) {
      await deleteUser("sales", { id: userToDelete.id });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      refetch();
      notify("User deleted successfully");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Users Management</CardTitle>
          <Button onClick={() => navigate("/sales/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : users && users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.administrator ? (
                      <Badge variant="secondary">Administrator</Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.disabled ? (
                      <Badge variant="destructive">Disabled</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/sales/${user.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.id !== identity?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No users found. Create your first user!
          </div>
        )}

        <Confirm
          isOpen={deleteDialogOpen}
          loading={false}
          title="Delete User"
          content={`Are you sure you want to delete the user "${userToDelete?.first_name} ${userToDelete?.last_name}"? This action cannot be undone.`}
          confirm="Delete"
          cancel="Cancel"
          confirmColor="warning"
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      </CardContent>
    </Card>
  );
};

// General Settings Section
const GeneralSettingsSection = () => {
  const { timezone, setTimezone, offsetLabel, displayName } = useTimezone();
  const { officeLocation, isLoading: officeLocationLoading, updateOfficeLocation } = useOfficeLocation();
  const notify = useNotify();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isEditingOffice, setIsEditingOffice] = React.useState(false);
  const [officeFormData, setOfficeFormData] = React.useState({
    latitude: "",
    longitude: "",
    address: "",
  });

  // Update current time display every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update time display when timezone changes
  React.useEffect(() => {
    setCurrentTime(new Date());
  }, [timezone]);

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    // Show notification briefly before reload
    notify("Timezone updated successfully. Page will refresh...", { type: "success" });
    // Force a page refresh to update all date/time displays
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Initialize office form data when editing
  React.useEffect(() => {
    if (isEditingOffice && officeLocation) {
      setOfficeFormData({
        latitude: officeLocation.latitude.toString(),
        longitude: officeLocation.longitude.toString(),
        address: officeLocation.address,
      });
    }
  }, [isEditingOffice, officeLocation]);

  const handleOfficeLocationSave = async () => {
    try {
      const lat = parseFloat(officeFormData.latitude);
      const lng = parseFloat(officeFormData.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        notify("Please enter valid numeric coordinates", { type: "error" });
        return;
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        notify("Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180", { type: "error" });
        return;
      }

      await updateOfficeLocation({
        latitude: lat,
        longitude: lng,
        address: officeFormData.address || "Office",
      });

      setIsEditingOffice(false);
    } catch (error) {
      console.error("Error updating office location:", error);
    }
  };

  const handleOfficeLocationCancel = () => {
    setIsEditingOffice(false);
    if (officeLocation) {
      setOfficeFormData({
        latitude: officeLocation.latitude.toString(),
        longitude: officeLocation.longitude.toString(),
        address: officeLocation.address,
      });
    }
  };

  // Common timezones with their display names
  const timezones = [
    { value: "Asia/Dubai", label: "Dubai (UTC+4)", offset: "UTC+4" },
    { value: "Asia/Kolkata", label: "Mumbai/Kolkata (UTC+5:30)", offset: "UTC+5:30" },
    { value: "Asia/Singapore", label: "Singapore (UTC+8)", offset: "UTC+8" },
    { value: "Asia/Tokyo", label: "Tokyo (UTC+9)", offset: "UTC+9" },
    { value: "Europe/London", label: "London (UTC+0/+1)", offset: "UTC+0/+1" },
    { value: "Europe/Paris", label: "Paris (UTC+1/+2)", offset: "UTC+1/+2" },
    { value: "America/New_York", label: "New York (UTC-5/-4)", offset: "UTC-5/-4" },
    { value: "America/Los_Angeles", label: "Los Angeles (UTC-8/-7)", offset: "UTC-8/-7" },
    { value: "Australia/Sydney", label: "Sydney (UTC+10/+11)", offset: "UTC+10/+11" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="timezone-select">Application Timezone</Label>
            <p className="text-sm text-muted-foreground">
              All dates and times in the application will be displayed in this timezone.
            </p>
            <Select value={timezone} onValueChange={handleTimezoneChange}>
              <SelectTrigger id="timezone-select" className="w-full max-w-md">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 text-sm text-muted-foreground">
              <p>Current timezone: <strong>{displayName}</strong> ({offsetLabel})</p>
              <p className="mt-1">Current time: <strong>{formatCrmDateTime(currentTime)}</strong></p>
            </div>
          </div>

          {/* Office Location Settings */}
          <div className="space-y-2 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="office-location">Office Location</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Set your office coordinates for transport routing and map displays.
                </p>
              </div>
              {!isEditingOffice && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingOffice(true)}
                  disabled={officeLocationLoading}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>

            {isEditingOffice ? (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="office-latitude">Latitude</Label>
                    <Input
                      id="office-latitude"
                      type="number"
                      step="any"
                      value={officeFormData.latitude}
                      onChange={(e) =>
                        setOfficeFormData({ ...officeFormData, latitude: e.target.value })
                      }
                      placeholder="25.2048"
                    />
                    <p className="text-xs text-muted-foreground">Range: -90 to 90</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office-longitude">Longitude</Label>
                    <Input
                      id="office-longitude"
                      type="number"
                      step="any"
                      value={officeFormData.longitude}
                      onChange={(e) =>
                        setOfficeFormData({ ...officeFormData, longitude: e.target.value })
                      }
                      placeholder="55.2708"
                    />
                    <p className="text-xs text-muted-foreground">Range: -180 to 180</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office-address">Address</Label>
                  <Input
                    id="office-address"
                    type="text"
                    value={officeFormData.address}
                    onChange={(e) =>
                      setOfficeFormData({ ...officeFormData, address: e.target.value })
                    }
                    placeholder="Office, Dubai, UAE"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleOfficeLocationSave}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOfficeLocationCancel}
                    size="sm"
                  >
                    <CircleX className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-md">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Latitude</p>
                    <p className="font-medium">{officeLocation?.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Longitude</p>
                    <p className="font-medium">{officeLocation?.longitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">{officeLocation?.address || "Not set"}</p>
                  </div>
                </div>
                {officeLocation && (
                  <div className="mt-3">
                    <a
                      href={`https://www.google.com/maps?q=${officeLocation.latitude},${officeLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View on Google Maps →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

SettingsPage.path = "/settings";
