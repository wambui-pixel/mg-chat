"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Domain, Rule } from "@absmach/magistrala-sdk";
import { CreateWorkspace, CreateWorkspaceRole } from "@/lib/workspace";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { CreateChannel } from "@/lib/channels";
import { OutputType } from "@/types/entities";
import { CreateRule } from "@/lib/rules";

interface Props {
  isMobile: boolean;
}

export function CreateWorkspaceDialog({ isMobile }: Props) {
  const [name, setName] = useState("");
  const [route, setRoute] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    const toastId = toast("Sonner");
    e.preventDefault();
    if (!name.trim() && !route.trim()) return;
    toast.loading("Creating workspace ...", { id: toastId });
    setIsLoading(true);

    const newWorkspace: Domain = {
      name: name.trim(),
      route: route.trim(),
    };

    const result = await CreateWorkspace(newWorkspace);
    if (result.error === null) {
      const optionalActions = ["read", "view_role_users", "channel_create"];
      const roleResponse = await CreateWorkspaceRole("domain-member", result?.data?.id as string, optionalActions);

      if (roleResponse.error !== null) {
        toast.error(`Failed to create workspace role: ${roleResponse.error}`, { id: toastId });
      } else {
        const createChanresp = await CreateChannel({ name: "direct-message", tags: ["dm"] }, result?.data?.id as string);
        if (createChanresp.error !== null) {
          toast.error(`Failed to create channel: ${createChanresp.error}`, { id: toastId });
        } else {
          const rule: Rule = {
            input_channel: createChanresp.data.id,
            input_topic: "",
            outputs: [{ type: OutputType.SAVE_SENML }],
            logic: {
              type: 0,
              value: `
        function logicFunction()
          return message.payload
        end

        return logicFunction()
        `,
            },
            name: `${createChanresp.data.name}save_messages`,
          };

          const ruleResponse = await CreateRule({ rule, workspace: result.data!.id });
          if (ruleResponse.error !== null) {
            toast.error(`Failed to create rule: ${ruleResponse.error}`, { id: toastId });
          } else {
            toast.success("Workspace created successfully", { id: toastId });
            setOpen(false);
            setName("");
            setRoute("");
          }
        }
      }
    } else {
      toast.error(`Failed to create workspace: ${result.error}`, { id: toastId });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>
        {isMobile ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-12 w-12 p-0 rounded-xl bg-gray-700 hover:bg-gray-600 hover:rounded-lg transition-all duration-200"
            title="Create workspace"
          >
            <Plus className="h-5 w-5 text-gray-300" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            <span>Create Workspace</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your team conversations and
            collaborate effectively.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workspace name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="route">Route</Label>
              <Input
                id="route"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder=" A user-friendly alias for this workspace"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
