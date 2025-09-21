"use client";

import { Sidebar } from "@/components/chat/sidebar/sidebar";
import { ChatView } from "@/components/chat/chat-view";
import { Session } from "@/types/auth";
import { useState } from "react";
import { Member } from "@/types/entities";
import { InvitationsPage, User } from "@absmach/magistrala-sdk";
import { EntityFetchData } from "@/lib/actions";

interface Props {
  session: Session;
  members: Member[];
  invitationsPage: InvitationsPage;
  dmChannelId: string;
  user: User;
  initMembers: EntityFetchData;
}
export default function ChatPage({ session, members, invitationsPage, dmChannelId, user, initMembers }: Props) {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedDM, setSelectedDM] = useState<string | null>(session?.user?.id as string);
  const workspaceId = session.workspace
  return (
    <>
      <div
        className={`
            fixed lg:relative inset-y-0 left-0 z-50 w-[300px] shadow-lg transform transition-transform duration-300 ease-in-out
            
          `}
      >
        <Sidebar
          session={session}
          selectedChannel={selectedChannel}
          selectedDM={selectedDM}
          setSelectedChannel={setSelectedChannel}
          setSelectedDM={setSelectedDM}
          members={members}
          invitationsPage={invitationsPage}
          dmChannelId={dmChannelId as string} 
          user={user}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <ChatView
          selectedChannel={selectedChannel}
          setSelectedChannel={setSelectedChannel}
          selectedDM={selectedDM}
          session={session}
          workspaceId={workspaceId as string}
          dmChannelId={dmChannelId as string} 
          initMembers={initMembers}
        />
      </div>
    </>
  );
}
