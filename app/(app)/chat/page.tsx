import type { InvitationsPage, User } from "@absmach/magistrala-sdk";
import ChatPage from "@/components/chat/chat-page";
import { FetchData } from "@/lib/actions";
import { ListChannels } from "@/lib/channels";
import { GetWorkspaceInvitations } from "@/lib/invitations";
import { RequestOptions } from "@/lib/magistrala";
import { getServerSession } from "@/lib/nextauth";
import { UserProfile } from "@/lib/users";
import { ListWorkspaces, ListWorkspaceUsers } from "@/lib/workspace";
import { EntityType, type Member } from "@/types/entities";

export type Props = {
  searchParams?: Promise<{
    status: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const session = await getServerSession();
  const workspaces = await ListWorkspaces({
    queryParams: { limit: 100, offset: 0 },
  });

  if (workspaces.error !== null) {
    return <div>{workspaces.error}</div>;
  }
  const workspaceId = session?.workspace?.id as string;
  const memResponse = await ListWorkspaceUsers(workspaceId, {
    offset: 0,
    limit: 100,
  });
  const searchParamsValue = await searchParams;
  const status = searchParamsValue?.status || "pending";
  const roles = session?.workspace?.roles || [];
  let inviResponse;
  if (roles.some((role) => role.role_name === "admin")) {
    inviResponse = await GetWorkspaceInvitations({
      offset: 0,
      limit: 100,
      state: status,
    });
  }
  const dmChannelResponse = await ListChannels({
    queryParams: { offset: 0, limit: 1, tag: "dm" },
  });
  const dmChannelId = dmChannelResponse?.data?.channels?.[0]?.id;
  const user = await UserProfile(session.accessToken);

  const getWorkspaceUsers = ({ id, queryParams }: RequestOptions) => {
    return ListWorkspaceUsers(id!, queryParams);
  };

  const initMembers = await FetchData(
    EntityType.Member,
    {
      offset: 0,
      limit: 20,
      status: "enabled",
    },
    getWorkspaceUsers,
    workspaceId,
  );

  return (
    <ChatPage
      session={session}
      members={memResponse.data?.members as Member[]}
      invitationsPage={inviResponse?.data as InvitationsPage}
      dmChannelId={dmChannelId as string}
      user={user.data as User}
      initMembers={initMembers}
    />
  );
}
