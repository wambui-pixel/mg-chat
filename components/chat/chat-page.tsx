"use client";

import { Sidebar } from "@/components/chat/sidebar/sidebar";
import { ChatView } from "@/components/chat/chat-view";
import { Session } from "@/types/auth";
import { useState } from "react";
import { Member } from "@/types/entities";
import { InvitationsPage, User } from "@absmach/magistrala-sdk";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../ui/resizable";

interface Props {
  session: Session;
  members: Member[];
  invitationsPage: InvitationsPage;
  dmChannelId: string;
  user: User
}
export default function ChatPage({ session, members, invitationsPage, dmChannelId, user }: Props) {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedDM, setSelectedDM] = useState<string | null>(session?.user?.id as string);
  const workspaceId = session.workspace
  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="h-screen w-full">
        <ResizablePanel defaultSize={25} minSize={15} maxSize={50}>
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
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75} minSize={15} className="flex-1 flex flex-col">
          <ChatView
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            selectedDM={selectedDM}
            session={session}
            workspaceId={workspaceId as string}
            dmChannelId={dmChannelId as string}
            />
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
