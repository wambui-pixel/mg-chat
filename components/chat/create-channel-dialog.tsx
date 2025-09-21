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
import { Channel, Rule } from "@absmach/magistrala-sdk";
import { CreateChannel, CreateChannelRole } from "@/lib/channels";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { CreateRule } from "@/lib/rules";
import { OutputType } from "@/types/entities";
interface Props {
  setRevalidate: (value: boolean) => void;
  workspaceId: string;
}
export function CreateChannelDialog({ setRevalidate, workspaceId }: Props) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    const toastId = toast("Sonner");
    e.preventDefault();
    if (!name.trim()) return;
    toast.loading("Creating channel ...", { id: toastId });
    setIsLoading(true);

    const channel: Channel = {
      name,
      tags: ["chat"],
    };

    const response = await CreateChannel(channel, workspaceId);

    if (response.error !== null) {
      toast.error(`Failed to create channel with error: ${response.error}`, { id: toastId });
    } else {
      const rule: Rule = {
        input_channel: response.data.id,
        input_topic: "",
        outputs: [{ type: OutputType.SAVE_SENML }],
        logic: {
          type: 0,
          value:
            "\n" +
            "        function logicFunction()\n" +
            "  return message.payload\n" +
            "end\n" +
            "\n" +
            "return logicFunction()\n" +
            "      ",
        },
        name: `${response.data.name}save_messages`,
      };
      const ruleResponse = await CreateRule({rule});
      if (ruleResponse.error !== null) {
        toast.error(`Failed to create rule with error: ${ruleResponse.error}`, { id: toastId });
      } else {
        const optionalActions = ["read", "publish", "subscribe", "view_role_users"];
        const roleResponse = await CreateChannelRole(
          response?.data?.id as string,
          "chat-member",
          optionalActions,
        );
        if (roleResponse.error !== null) {
          toast.error(`Failed to create role with error: ${ruleResponse.error}`, { id: toastId });
        } else {
        setRevalidate(true);
        toast.success("Channel created successfully", { id: toastId });
        setName("");
        setOpen(false);
        }
      }
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>
        <Button variant="ghost" size="icon">
          <Plus className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Create a new channel for focused discussions in this workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter channel name"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? "Creating..." : "Create Channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
