import { useState } from "react";
import { useForm } from "react-hook-form";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Form, FormField, FormItem, FormLabel } from "../ui/form";
import { Button } from "../ui/button";
import { toast } from "sonner";
import z from "zod";
import { AddChannelRoleMembers } from "@/lib/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfiniteSelect } from "../custom/infinite-select";
import { EntityType } from "@/types/entities";
import { ListWorkspaceUsers } from "@/lib/workspace";
import { EntityFetchData } from "@/lib/actions";
import { RequestOptions } from "@/lib/magistrala";
import { ListChannelRoles } from "@/lib/roles";

const addRoleMembersFormSchema = () =>
    z.object({
        member: z.string().min(1, { error: "Please select a member" }),
    });

export const AddRoleMembersDialog = ({
    open,
    setOpen,
    channelId,
    chatName,
    initMembers,
    workspaceId,
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    channelId: string;
    chatName: string;
    initMembers: EntityFetchData;
    workspaceId: string;
}) => {
    const [processing, setProcessing] = useState(false);
    const form = useForm<z.infer<ReturnType<typeof addRoleMembersFormSchema>>>({
        resolver: zodResolver(addRoleMembersFormSchema()),
        defaultValues: {
            member: "",
        },
    });
    async function onSubmit(
        values: z.infer<ReturnType<typeof addRoleMembersFormSchema>>
    ) {
        setProcessing(true);
        const toastId = toast("Sonner");

        toast.loading("Adding chat member...", {
            id: toastId,
        });
        const roleResponse = await ListChannelRoles({
            id: channelId,
            queryParams: { offset: 0, limit: 10 },
        });

        const memberRole = roleResponse?.data?.roles?.find(
            (role) => role.name === "chat-member"
        );

        const roleId = memberRole?.id as string;
        const result = await AddChannelRoleMembers(channelId, roleId, [
            values.member,
        ]);
        setProcessing(false);
        if (result.error === null) {
            toast.success(
                `Member "${values.member}" added successfully to role ${chatName}.`,
                {
                    id: toastId,
                }
            );
            form.reset();
            setOpen(false);
        } else {
            toast.error(
                `Failed to add member to role "${chatName}" with error "${result.error}"`,
                {
                    id: toastId,
                }
            );
        }
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-[90%] max-w-md max-h-[95%] overflow-auto">
                <DialogHeader>
                    <DialogTitle>{"Add chat member"}</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4 md:space-y-8"
                    >
                        <FormField
                            control={form.control}
                            name="member"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Member
                                    </FormLabel>
                                    <InfiniteSelect
                                        field={field}
                                        initData={initMembers}
                                        entityType={EntityType.Member}
                                        getData={(options: RequestOptions) => ListWorkspaceUsers(workspaceId, options)}
                                        disableSearch={true}
                                    />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="flex flex-row justify-end gap-2">
                            <DialogClose asChild={true}>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={processing}
                                    onClick={() => {
                                        form.reset();
                                    }}
                                >
                                    Close
                                </Button>
                            </DialogClose>
                            <Button disabled={processing} type="submit">
                                Add
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
