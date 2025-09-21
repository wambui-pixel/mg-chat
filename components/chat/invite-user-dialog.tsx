"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import UserSearchInput from "@/components/custom/user-search-input";
import {
    GetWorkspaceBasicInfo,
    GetUserBasicInfo,
    ListWorkspaceRoles,
} from "@/lib/workspace";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Plus } from "lucide-react";
import { InviteMultipleUsersToWorkspace } from "@/lib/invitations";

const assignMembersSchema = () =>
    z.object({
        userIds: z
            .string()
            .array()
            .nonempty({ message: "Please select atleast one user" }),
    });

interface AssignMemberProps {
    workspaceId: string;
}
export function InviteMember({
    workspaceId,
}: AssignMemberProps) {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const form = useForm<z.infer<ReturnType<typeof assignMembersSchema>>>({
        resolver: zodResolver(assignMembersSchema()),
        defaultValues: {
            userIds: [],
        },
    });

    async function onSubmit(
        values: z.infer<ReturnType<typeof assignMembersSchema>>,
    ) {
        setProcessing(true);
        const toastId = toast("Sonner");
        toast.loading("Adding user to workspace ...", {
            id: toastId,
        });

        const roleResponse = await ListWorkspaceRoles({
            queryParams: { offset: 0, limit: 10 },
        });

        const memberRole = roleResponse?.data?.roles?.find(
            (role) => role.name === "domain-member"
        );

        const roleId = memberRole?.id as string;

        const response = await InviteMultipleUsersToWorkspace(values.userIds, roleId, workspaceId);

        const userNames = await Promise.all(
            values.userIds.map(async (id) => {
                const user = await GetUserBasicInfo(id);
                return typeof user === "string"
                    ? user
                    : user?.credentials?.username || id;
            }),
        );

        const workspace = await GetWorkspaceBasicInfo(workspaceId);
        const workspaceName =
            typeof workspace === "object" && "name" in workspace ? workspace.name : workspaceId;
        const hasErrors = response.errors.some((e) => e !== null);
        if (hasErrors) {
            toast.error(
                `Failed to add user(s) with error(s): "${response.errors.filter(Boolean).join(", ")}"`,
                {
                    id: toastId,
                },
            );
        } else {
            toast.success(
                `User(s) "${userNames.join(", ")}" added to workspace "${workspaceName}"`,
                { id: toastId },
            );
        }
        setProcessing(false);
        form.reset();
        setOpen(false);
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild={true}>
                <Button variant="ghost" className="w-full mt-2 justify-start">
                    <Plus className="h-3 w-3" />
                    <span>Invite User</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-md w-[90%] max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        Send invitation
                    </DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4 md:space-y-8"
                    >
                        <FormField
                            control={form.control}
                            name="userIds"
                            render={({ field, fieldState: { error } }) => (
                                <FormItem>
                                    <FormLabel>
                                        Users
                                    </FormLabel>
                                    <UserSearchInput field={field} />
                                    <FormMessage>{error?.message}</FormMessage>
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="flex flex-row justify-end gap-2">
                            <DialogClose asChild={true}>
                                <Button disabled={processing} type="button" variant="secondary">
                                    Close
                                </Button>
                            </DialogClose>
                            <Button disabled={processing} type="submit">
                                Invite
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
