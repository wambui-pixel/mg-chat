"use server";

import type { Domain, DomainBasicInfo, MemberRolesPage, Role, RolePage, UserBasicInfo } from "@absmach/magistrala-sdk";
import { mgSdk, RequestOptions, validateOrGetToken } from "@/lib/magistrala";
import type { HttpError } from "@/types/errors";
import { revalidatePath } from "next/cache";
import { EntityMembersPage, Member } from "@/types/entities";
import { ViewUser } from "./users";

export const CreateWorkspace = async (workspace: Domain) => {
  const { accessToken } = await validateOrGetToken("");
  try {
    const response = await mgSdk.Domains.CreateDomain(workspace, accessToken);
    return {
      data: response,
      error: null,
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      data: null,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  } finally {
    revalidatePath("/");
  }
};

export const ListWorkspaces = async ({ queryParams }: RequestOptions) => {
  try {
    const { accessToken } = await validateOrGetToken("");
    const workspacePage = await mgSdk.Domains.Domains(queryParams, accessToken);

    return {
      data: workspacePage,
      error: null,
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    const error =
      knownError.error || knownError.message || knownError.toString();
    return {
      data: null,
      error: error,
    };
  }
};

export const AddWorkspaceRoleMembers = async (
  workspaceId: string,
  roleId: string,
  members: string[],
) => {
  const { accessToken } = await validateOrGetToken("");
  try {
    const addedMembers = await mgSdk.Domains.AddDomainRoleMembers(
      workspaceId,
      roleId,
      members,
      accessToken,
    );
    return {
      data: addedMembers,
      error: null,
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      data: null,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  } finally {
    revalidatePath("/chat");
  }
};

export const GetWorkspaceBasicInfo = async (workspaceId: string) => {
  try {
    const { accessToken } = await validateOrGetToken("");
    const workspace = await mgSdk.Domains.Domain(workspaceId, accessToken);
    return {
      id: workspace.id,
      name: workspace.name,
      route: workspace.route,
    } as DomainBasicInfo;
  } catch (_error) {
    return workspaceId;
  }
};

export async function GetUserBasicInfo(userId: string, token = "") {
  try {
    const { accessToken } = await validateOrGetToken(token);
    const userInfo = await mgSdk.Users.User(userId, accessToken);
    return {
      id: userInfo.id,
      email: userInfo.email,
      // biome-ignore lint/style/useNamingConvention: This is from an external library
      first_name: userInfo.first_name,
      // biome-ignore lint/style/useNamingConvention: This is from an external library
      last_name: userInfo.last_name,
      status: userInfo.status,
      credentials: userInfo.credentials,
    } as UserBasicInfo;
  } catch (_error) {
    return userId;
  }
}

export const ListWorkspaceRoles = async ({ queryParams }: RequestOptions) => {
  const { workspaceId, accessToken } = await validateOrGetToken("");
  try {
    const rolesPage = await mgSdk.Domains.ListDomainRoles(
      workspaceId,
      queryParams,
      accessToken,
    );
    const roles = await ProcessRoles(rolesPage.roles, accessToken);
    return {
      data: {
        total: rolesPage.total,
        offset: rolesPage.offset,
        limit: rolesPage.limit,
        roles,
      } as RolePage,
      error: null,
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      data: null,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  }
};

export async function ProcessRoles(
  roles: Role[],
  token: string,
): Promise<Role[]> {
  const processedDomains: Role[] = [];
  if (roles && roles.length > 0) {
    for (const role of roles) {
      try {
        const createdBy: UserBasicInfo | string =
          typeof role.created_by === "string"
            ? role.created_by === ""
              ? role.created_by
              : await GetUserBasicInfo(role.created_by, token)
            : role.created_by
              ? (role.created_by as UserBasicInfo)
              : "";

        const updatedBy: UserBasicInfo | string =
          typeof role.updated_by === "string"
            ? role.updated_by === ""
              ? role.updated_by
              : await GetUserBasicInfo(role.updated_by, token)
            : role.updated_by
              ? (role.updated_by as UserBasicInfo)
              : "";

        const processedRole: Role = {
          ...role,
          // biome-ignore lint/style/useNamingConvention: This is from an external library
          created_by: createdBy as string,
          // biome-ignore lint/style/useNamingConvention: This is from an external library
          updated_by: updatedBy as string,
        };
        processedDomains.push(processedRole);
      } catch {
        processedDomains.push(role);
      }
    }
    return processedDomains;
  }
  return roles;
}


export const ListWorkspaceUsers = async (
  workspaceId: string,
  queryParams: RequestOptions["queryParams"],
) => {
  try {
    const { accessToken } = await validateOrGetToken("");
    const workspaceMembers = await mgSdk.Domains.ListDomainMembers(
      workspaceId,
      queryParams,
      accessToken,
    );
    const processedMembers = await ProcessEntityMembers(
      workspaceMembers,
    );
    return {
      data: processedMembers,
      error: null,
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      data: null,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  }
};

export async function ProcessEntityMembers(
  members: MemberRolesPage,
): Promise<EntityMembersPage> {
  try {
    const processedMembers = await Promise.all(
      members.members.map(async (member) => {
        if (!member.member_id) {
          throw new Error("Member ID is missing");
        }

        const response = await ViewUser(member.member_id);

        if (response.error) {
          throw new Error(
            `Error fetching user with ID ${member.member_id} with error "${response.error}"`,
          );
        }

        const user = response.data;
        const roles = member.roles || [];

        return {
          ...user,
          roles,
        } as Member;
      }),
    );

    const filteredMembers = processedMembers.filter(
      (member): member is Member => member !== null,
    );

    return {
      total: filteredMembers.length,
      limit: members.limit,
      offset: members.offset,
      members: filteredMembers,
    };
  } catch (error) {
    console.error("Error processing entity members:", error);
    throw error;
  }
}

export const EnableWorkspace = async (id: string) => {
  try {
    const { accessToken } = await validateOrGetToken("");
    await mgSdk.Domains.EnableDomain(id, accessToken);
    return {
      data: "Workspace enabled",
      error: null,
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      data: null,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  } finally {
    revalidatePath("/info");
  }
};

export const DisableWorkspace = async (id: string) => {
  try {
    const { accessToken } = await validateOrGetToken("");
    await mgSdk.Domains.DisableDomain(id, accessToken);
    return {
      data: "Workspace disabled",
      error: null,
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      data: null,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  } finally {
    revalidatePath("/info");
  }
};

export const UpdateWorkspace = async (workspace: Domain) => {
  try {
    const { accessToken } = await validateOrGetToken("");
    const updated = await mgSdk.Domains.UpdateDomain(workspace, accessToken);
    return {
      data: updated.name as string,
      error: null,
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      data: null,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  } finally {
    revalidatePath("/info");
  }
};

export const GetWorkspaceInfo = async (listRoles?: boolean) => {
  try {
    const { accessToken, workspaceId } = await validateOrGetToken("");
    if (workspaceId !== "") {
      const workspace = await mgSdk.Domains.Domain(
        workspaceId,
        accessToken,
        listRoles,
      );
      return {
        data: workspace,
        error: null,
      };
    }
    return {
      data: null,
      error: "missing workspace in token",
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      data: null,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  }
};

export const CreateWorkspaceRole = async (
  roleName: string,
  domain: string,
  optionalActions?: string[],
  optionalMembers?: string[],
) => {
  const { workspaceId, accessToken } = await validateOrGetToken("");
  try {
    const role = await mgSdk.Domains.CreateDomainRole(
      domain ?? workspaceId,
      roleName,
      accessToken,
      optionalActions,
      optionalMembers,
    );
    return {
      data: role,
      error: null,
    };
  } catch (err: unknown) {
    const knownError = err as HttpError;
    return {
      data: null,
      error: knownError.error || knownError.message || knownError.toString(),
    };
  } finally {
    revalidatePath("/");
  }
};
