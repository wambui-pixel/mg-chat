"use client";

import { EllipsisVertical } from "lucide-react";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";
import { AddRoleMembersDialog } from "./add-members-dialog";
import { EntityFetchData } from "@/lib/actions";

export function ChatMenu({
    channelId,
    chatName,
    initMembers,
    workspaceId,
}: {
    channelId: string;
    chatName: string;
    initMembers: EntityFetchData;
    workspaceId: string;
}) {
    const [showMembersDialog, setShowMembersDialog] = useState(false);
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild={true}>
                    <Button variant="ghost">
                        <EllipsisVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-(--radix-dropdown-menu-trigger-width) min-w-32 rounded-lg ml-2"
                    side="bottom"
                    align="end"
                    sideOffset={4}
                >
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild={true} onSelect={() => setShowMembersDialog(true)}>
                            <span>Add members</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            <AddRoleMembersDialog
                open={showMembersDialog}
                setOpen={setShowMembersDialog}
                channelId={channelId}
                chatName={chatName}
                initMembers={initMembers}
                workspaceId={workspaceId}
            />
        </>
    );
}
