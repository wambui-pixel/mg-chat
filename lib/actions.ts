"use server";

import { WorkspaceLoginSession } from "@/lib/auth";
import { decodeSessionToken, encodeSessionToken, getServerSession, getTokenExpiry } from "@/lib/nextauth";
import { generateUrl, validateTime } from "@/lib/utils";
import { EntityMembersPage, Member, RoleMembersPage } from "@/types/entities";
import { Domain, ChannelsPage, DomainsPage, MemberRolesPage, MembersPage, PageMetadata, RolePage, UserBasicInfo, UsersPage } from "@absmach/magistrala-sdk";
import type { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserProfile, ViewUser } from "./users";
import { GetWorkspaceInfo } from "./workspace";
import { UserInfo, UserRole } from "@/types/auth";
import { HttpError } from "@/types/errors";
import { EntityType } from "@/types/entities";
import { RequestOptions } from "./magistrala";

export const absoluteUrl = async () => {
  const headersList = await headers();
  let hostHeader =
    headersList.get("x-forwarded-host") ||
    headersList.get("host") ||
    "localhost";
  if (!/^https?:\/\//i.test(hostHeader)) {
    hostHeader = `http://${hostHeader}`;
  }
  const hostUrl = new URL(hostHeader);

  const host = hostUrl.hostname;

  const protocol = headersList.get("x-forwarded-proto") || "http";
  const port = headersList.get("x-forwarded-port") || "3000";

  return {
    protocol,
    host: host || "",
    port,
    origin: `${protocol}://${host}:${port}`,
  };
};

export async function WorkspaceLogin(workspaceId: string) {
  const cookiesStore = await cookies();
  const session = await getServerSession();
  const urlPath = await absoluteUrl();
  const secure = urlPath.protocol === "https";
  const cookiesSessionKey =
    urlPath.protocol === "https"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";
  const cookiesCsrfKey =
    urlPath.protocol === "https"
      ? "__Host-next-auth.csrf-token"
      : "next-auth.csrf-token";

  const port =
    urlPath.port !== "443" && urlPath.port !== "80" ? `:${urlPath.port}` : "";
  const redirectPrefix = generateUrl(
    urlPath.protocol,
    urlPath.host,
    port,
    process.env.MG_UI_BASE_PATH || "/"
  );

  if (session.error) {
    cookiesStore.delete(cookiesSessionKey);
    redirect(`${redirectPrefix}/auth?error=${session.error}`);
  }

  if (session.workspace?.id && session.workspace.id === workspaceId) {
    redirect(`${redirectPrefix}/chat`);
  }

  const sessionTokenCookie = cookiesStore.get(
    cookiesSessionKey
  ) as RequestCookie;
  const csrfTokenCookie = cookiesStore.get(cookiesCsrfKey) as RequestCookie;

  if (!csrfTokenCookie?.value || !sessionTokenCookie?.value) {
    redirect(`${redirectPrefix}/auth?error=invalid_session}`);
  }

  const workspaceSession = await WorkspaceLoginSession(
    csrfTokenCookie.value,
    sessionTokenCookie.value,
    workspaceId
  );

  if (!workspaceSession) {
    return;
  }

  cookiesStore.set({
    name: cookiesSessionKey,
    value: workspaceSession,
    httpOnly: true,
    path: "/",
    secure: secure,
  });

  redirect("/chat");
}

export async function ProcessEntityMembers(
  members: MemberRolesPage,
  queryParams: PageMetadata
): Promise<EntityMembersPage> {
  try {
    let isFiltered = false;
    const processedMembers = await Promise.all(
      members.members.map(async (member) => {
        if (!member.member_id) {
          throw new Error("Member ID is missing");
        }

        const response = await ViewUser(member.member_id);

        if (response.error) {
          throw new Error(
            `Error fetching user with ID ${member.member_id} with error "${response.error}"`
          );
        }

        const user = response.data;
        const roles = member.roles || [];

        // This filters out the users based on the query params. It performs case-insensitive matching
        // and partial mmatching
        if (queryParams) {
          if (
            (queryParams.status !== "all" &&
              user?.status !== queryParams.status) ||
            (queryParams.username &&
              !user?.credentials?.username
                ?.toLowerCase()
                .includes(queryParams.username.toLowerCase())) ||
            (queryParams.first_name &&
              !user?.first_name
                ?.toLowerCase()
                .includes(queryParams.first_name.toLowerCase())) ||
            (queryParams.last_name &&
              !user?.last_name
                ?.toLowerCase()
                .includes(queryParams.last_name.toLowerCase())) ||
            (queryParams.email &&
              !user?.email
                ?.toLowerCase()
                .includes(queryParams.email.toLowerCase())) ||
            (queryParams.id &&
              !user?.id?.toLowerCase().includes(queryParams.id.toLowerCase()))
          ) {
            isFiltered = true;
            return null;
          }
        }

        return {
          ...user,
          roles,
        } as Member;
      })
    );

    const filteredMembers = processedMembers.filter(
      (member): member is Member => member !== null
    );

    return {
      total: isFiltered ? filteredMembers.length : members.total,
      limit: members.limit,
      offset: members.offset,
      members: filteredMembers,
    };
  } catch (error) {
    console.error("Error processing entity members:", error);
    throw error;
  }
}

export const UpdateServerSession = async (): Promise<string | undefined> => {
  try {
    const cookiesStore = await cookies();
    const headersList = await headers();

    const proto = headersList.get("x-forwarded-proto");
    const secure = proto === "https";

    const cookiesSessionKey =
      proto === "https"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";
    const cookiesCsrfKey =
      proto === "https"
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token";

    const csrfTokenCookie = cookiesStore.get(cookiesCsrfKey);
    const sessionTokenCookie = cookiesStore.get(cookiesSessionKey);
    const decodedToken = await decodeSessionToken(
      csrfTokenCookie?.value as string,
      sessionTokenCookie?.value as string,
    );
    if (!decodedToken) {
      return;
    }

    const userResponse = await UserProfile(decodedToken.accessToken as string);
    if (userResponse.error !== null) {
      return;
    }
    const user = userResponse.data;

   const workspaceResponse = await GetWorkspaceInfo(true);
    if (workspaceResponse.error !== null) {
      return;
    }
    const workspace = workspaceResponse.data;

    const allowUnverifiedUser =
      process.env.MG_UI_ALLOW_UNVERIFIED_USER === "true";

    const updatedSession = await encodeSessionToken({
      ...decodedToken,
      user: {
        id: user.id as string,
        username: user.credentials?.username as string,
        // biome-ignore lint/style/useNamingConvention: This is from an external library
        first_name: user.first_name as string,
        // biome-ignore lint/style/useNamingConvention: This is from an external library
        last_name: user.last_name as string,
        email: user.email as string,
        image: user.profile_picture,
        role: user.role,
        verified:
          allowUnverifiedUser ||
          validateTime(user.verified_at) ||
          user.role === UserRole.Admin,
      } as UserInfo,
       workspace: {
        id: workspace.id,
        name: workspace.name,
        route: workspace.route,
        roles: workspace.roles,
      } as Domain,
      accessToken: decodedToken.accessToken,
      refreshToken: decodedToken.refreshToken,
      refreshTokenExpiry: getTokenExpiry(decodedToken.refreshToken as string),
      accessTokenExpiry: getTokenExpiry(decodedToken.accessToken as string),
    });

    cookiesStore.set({
      name: cookiesSessionKey,
      value: updatedSession,
      httpOnly: true,
      path: "/",
      secure: secure,
    });
  } catch (err) {
    const knownError = err as HttpError;
    const error =
      knownError.error || knownError.message || knownError.toString();
    throw new Error(error);
  }
};

export interface EntityFetchData {
  total: number;
  // biome-ignore lint/suspicious/noExplicitAny: The type of the data returned has numeroud types.
  data: any;
  limit: number;
  error: string | null;
}

export const FetchData = async (
  entity: EntityType,
  queryParams: PageMetadata,
  getData: ({ token, id, queryParams }: RequestOptions) => Promise<
    | {
        data:
          | ChannelsPage
          | UsersPage
          | DomainsPage
          | RolePage
          | EntityMembersPage;
        error: null;
      }
    | {
        data: null;
        error: string;
      }
  >,
  id?: string,
): Promise<EntityFetchData> => {
  try {
    switch (entity) {
      case EntityType.Channel: {
        const channelsPage = await getData({ queryParams });
        if (channelsPage.error !== null) {
          const knownError = channelsPage.error as unknown as HttpError;
          return {
            total: 0,
            data: [],
            limit: 0,
            error:
              knownError.error || knownError.message || knownError.toString(),
          };
        }
        return {
          total: channelsPage.data.total,
          data: (channelsPage.data as ChannelsPage).channels,
          limit: channelsPage.data.limit,
          error: null,
        };
      }
      case EntityType.User: {
        const usersPage = await getData({ queryParams });
        if (usersPage.error !== null) {
          const knownError = usersPage.error as unknown as HttpError;
          return {
            total: 0,
            data: [],
            limit: 0,
            error:
              knownError.error || knownError.message || knownError.toString(),
          };
        }
        return {
          total: usersPage.data.total,
          data: (usersPage.data as UsersPage).users,
          limit: usersPage.data.limit,
          error: null,
        };
      }
      case EntityType.Member: {
        const membersPage = await getData({ id, queryParams });
        if (membersPage.error !== null) {
          const knownError = membersPage.error as unknown as HttpError;
          return {
            total: 0,
            data: [],
            limit: 0,
            error:
              knownError.error || knownError.message || knownError.toString(),
          };
        }
        return {
          total: membersPage.data.total,
          data: (membersPage.data as EntityMembersPage).members,
          limit: membersPage.data.limit,
          error: null,
        };
      }
      case EntityType.Domain: {
        const domains = await getData({ id, queryParams });
        if (domains.error !== null) {
          const knownError = domains.error as unknown as HttpError;
          return {
            total: 0,
            data: [],
            limit: 0,
            error:
              knownError.error || knownError.message || knownError.toString(),
          };
        }
        return {
          total: domains.data.total,
          data: (domains.data as DomainsPage).domains,
          limit: domains.data.limit,
          error: null,
        };
      }
      case EntityType.Role: {
        const roles = await getData({ id, queryParams });
        if (roles.error !== null) {
          const knownError = roles.error as unknown as HttpError;
          return {
            total: 0,
            data: [],
            limit: 0,
            error:
              knownError.error || knownError.message || knownError.toString(),
          };
        }
        return {
          total: roles.data.total,
          data: (roles.data as RolePage).roles,
          limit: roles.data.limit,
          error: null,
        };
      }
      default:
        return {
          total: 0,
          data: [],
          limit: 0,
          error: "Invalid entity type",
        };
    }
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      total: 0,
      data: [],
      limit: 0,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  }
};

export async function ProcessRoleMembers(
  membersPage: MembersPage,
  queryParams: PageMetadata,
): Promise<RoleMembersPage> {
  try {
    let isFiltered = false;
    const processedMembers = await Promise.all(
      membersPage.members.map(async (memberId) => {
        if (!memberId) {
          throw new Error("Member ID is missing");
        }

        const response = await ViewUser(memberId);

        if (response.error) {
          throw new Error(
            `Error fetching user with ID ${memberId} with error "${response.error}"`,
          );
        }

        const user = response.data;

        // This filters out the users based on the query params. It performs case-insensitive matching
        // and partial mmatching
        if (queryParams) {
          if (
            (queryParams.status !== "all" &&
              user?.status !== queryParams.status) ||
            (queryParams.username &&
              !user?.credentials?.username
                ?.toLowerCase()
                .includes(queryParams.username.toLowerCase())) ||
            (queryParams.first_name &&
              !user?.first_name
                ?.toLowerCase()
                .includes(queryParams.first_name.toLowerCase())) ||
            (queryParams.last_name &&
              !user?.last_name
                ?.toLowerCase()
                .includes(queryParams.last_name.toLowerCase())) ||
            (queryParams.email &&
              !user?.email
                ?.toLowerCase()
                .includes(queryParams.email.toLowerCase())) ||
            (queryParams.id &&
              !user?.id?.toLowerCase().includes(queryParams.id.toLowerCase()))
          ) {
            isFiltered = true;
            return null;
          }
        }

        return user as UserBasicInfo;
      }),
    );

    const filteredMembers = processedMembers.filter(
      (member): member is Member => member !== null,
    );

    return {
      total: isFiltered ? filteredMembers.length : membersPage.total,
      limit: membersPage.limit,
      offset: membersPage.offset,
      members: filteredMembers,
    };
  } catch (error) {
    console.error("Error processing role members:", error);
    throw error;
  }
}
