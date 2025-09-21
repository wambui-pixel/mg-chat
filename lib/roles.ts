"use server";

import { HttpError } from "@/types/errors";
import { mgSdk, validateOrGetToken } from "./magistrala";
import { revalidatePath } from "next/cache";
import { PageMetadata } from "@absmach/magistrala-sdk";
import { ProcessRoleMembers } from "./actions";


export const AddChannelRoleMembers = async (
  channelId: string,
  roleId: string,
  members: string[],
) => {
  const { domainId, accessToken } = await validateOrGetToken("");
  try {
    const addedMembers = await mgSdk.Channels.AddChannelRoleMembers(
      channelId,
      domainId,
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
  const { domainId, accessToken } = await validateOrGetToken("");
  try {
    const members = await mgSdk.Channels.ListChannelRoleMembers(
      channelId,
      domainId,
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