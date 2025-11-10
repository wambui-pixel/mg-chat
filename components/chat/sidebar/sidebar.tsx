"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Hash } from "lucide-react";
import { Session, UserRole } from "@/types/auth";
import { NavUser } from "./nav-user";
import { CreateChannelDialog } from "@/components/chat/create-channel-dialog";
import { ListChannels } from "@/lib/channels";
import { Channel, Invitation, InvitationsPage, User } from "@absmach/magistrala-sdk";
import { Member } from "@/types/entities";
import { InviteMember } from "../invite-user-dialog";
import { Settings } from "./settings";
import { NotificationsBell } from "@/components/invitations/view-invitations";
import { GetUserInvitations } from "@/lib/invitations";
import { ChatMemberActions } from "@/lib/data";

interface Props {
  session: Session;
  selectedChannel: string | null;
  selectedDM: string | null;
  setSelectedChannel: (channelId: string | null) => void;
  setSelectedDM: (userId: string | null) => void;
  members: Member[];
  invitationsPage: InvitationsPage;
  dmChannelId: string;
  user: User;
}

export function Sidebar({
  session,
  selectedChannel,
  selectedDM,
  setSelectedChannel,
  setSelectedDM,
  members,
  invitationsPage,
  dmChannelId,
  user,
}: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [revalidate, setRevalidate] = useState(false);
  const [directMessages, setDirectMessages] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const isAdmin = session?.user.role === UserRole.Admin;

  const workspaceId = session.workspace?.id;

  const getData = useCallback(async () => {
    const groupResponse = await ListChannels({
      queryParams: { offset: 0, limit: 100, tag: "chat", actions: ChatMemberActions },
    });
    if (groupResponse.data) {
      setChannels(groupResponse.data.channels);
    } else {
      setChannels([]);
    }

    const directResponse = await ListChannels({
      queryParams: { offset: 0, limit: 1, tag: "dm" },
    });
    if (directResponse.data) {
      setDirectMessages(directResponse.data.channels?.[0]?.id as string);
    } else {
      setDirectMessages(null);
    }
  }, []);

  const getInvitations = useCallback(async () => {
    const invitationResponse = await GetUserInvitations({
      offset: 0,
      limit: 20,
      state: "pending",
      // biome-ignore lint/style/useNamingConvention: This is from an external library
      invitee_user_id: session?.user?.id,
    });
    if (invitationResponse.data) {
      setInvitations(invitationResponse.data.invitations);
    } else {
      setInvitations([]);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (workspaceId) {
      getData();
      getInvitations()
    }
  }, [workspaceId, getData, getInvitations]);

  useEffect(() => {
    if (revalidate) {
      getData();
      setRevalidate(false);
    }
  }, [revalidate, getData]);

  const handleSwitchWorkspace = () => {
    window.location.href = "/";
  };

  const workspace = session.workspace;

  return (
    <div className="h-full flex flex-col bg-gray-800 text-white">
      <div className="p-4 border-b flex items-center justify-between border-gray-700">
        <Button
          variant="ghost"
          className="cursor-pointer w-7/10 justify-start p-2 h-auto text-white hover:bg-gray-700 items-center"
          onClick={handleSwitchWorkspace}
        >
          <Avatar>
            <AvatarFallback className=" text-black">
              {workspace?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-white truncate">
              {workspace?.name || "Loading..."}
            </p>
            <p className="text-xs text-gray-300 truncate">{workspace?.route}</p>
          </div> 
        </Button>
        {isAdmin &&  <Settings workspaceId={workspace?.id as string} invitationsPage={invitationsPage} /> }
      <NotificationsBell invitations={invitations} isSidebar={true} className="mt-4 ml-4"/>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <div className="mb-6">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-sm font-medium text-gray-300">
                Channels
              </span>
              <CreateChannelDialog setRevalidate={setRevalidate} workspaceId={workspace?.id as string}/>
            </div>

            <div className="space-y-1">
              {channels?.map((channel) => (
                <div key={channel?.id} className="flex justify-between">
                <Button
                  key={channel.id}
                  variant="ghost"
                  className={`w-full justify-start px-2 py-1 h-auto text-gray-300 hover:bg-gray-700 hover:text-white ${
                    selectedChannel === channel.id
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedChannel(channel.id as string);
                    setSelectedDM(null);
                  }}
                >
                  <Hash className="h-4 w-4 mr-2" />
                  <span className="text-sm">{channel.name}</span>
                </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4 bg-gray-700" />

          <div className="mb-6">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-sm font-medium text-gray-300">
                Direct Messages
              </span>
            </div>

            <div className="space-y-1">
              {members?.map((dmUser) => {
                
                return (
                  <Button
                    key={dmUser.id}
                    variant="ghost"
                    className={`w-full justify-start px-2 py-1 h-auto text-gray-300 hover:bg-gray-700 hover:text-white ${
                      selectedDM === dmUser.id
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedDM(dmUser.id as string)
                      setSelectedChannel(dmChannelId)
                    }}
                  >
                    <div className="relative mr-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={dmUser.profile_picture}
                        />
                        <AvatarFallback className="text-xs bg-gray-600 text-white">
                          {(dmUser.credentials?.username as string).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="text-sm truncate">{dmUser.credentials?.username}</span>
                  </Button>
                );
              })}
            </div>
            {isAdmin && <InviteMember workspaceId={workspaceId as string} />}
          </div>
        </div>
      </ScrollArea>

      <NavUser user={user} />
    </div>
  );
}
