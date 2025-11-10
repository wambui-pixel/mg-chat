"use server";

import { HttpError } from "@/types/errors";
import { mgSdk, RequestOptions, validateOrGetToken } from "./magistrala";
import { revalidatePath } from "next/cache";
import { PageMetadata, RolePage } from "@absmach/magistrala-sdk";
import { ProcessRoleMembers } from "./actions";
import { ProcessRoles } from "./workspace";


export const AddChannelRoleMembers = async (
  channelId: string,
  roleId: string,
  members: string[],
) => {
  const { workspaceId, accessToken } = await validateOrGetToken("");
  try {
    const addedMembers = await mgSdk.Channels.AddChannelRoleMembers(
      channelId,
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

export const ListChannelRoleMembers = async (
  channelId: string,
  roleId: string,
  queryParams: PageMetadata,
) => {
  const { workspaceId, accessToken } = await validateOrGetToken("");
  try {
    const members = await mgSdk.Channels.ListChannelRoleMembers(
      channelId,
      workspaceId,
      roleId,
      queryParams,
      accessToken,
    );
    const processedMembers = await ProcessRoleMembers(members, queryParams);
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

export const CreateChannelRole = async (
  channelId: string,
  roleName: string,
  optionalActions?: string[],
  optionalMembers?: string[],
) => {
  const { workspaceId, accessToken } = await validateOrGetToken("");
  try {
    const role = await mgSdk.Channels.CreateChannelRole(
      channelId,
      roleName,
      workspaceId,
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
    revalidatePath("/chat");
  }
};

export const ListChannelRoles = async ({ id, queryParams }: RequestOptions) => {
  const { workspaceId, accessToken } = await validateOrGetToken("");
  try {
    const rolesPage = await mgSdk.Channels.ListChannelRoles(
      id as string,
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
