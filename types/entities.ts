import type { MemberRoleActions, UserBasicInfo } from "@absmach/magistrala-sdk";

export enum OutputType {
  CHANNELS = "channels",
  SAVE_SENML = "save_senml",
  ALARMS = "alarms",
  EMAIL = "email",
  SAVE_REMOTE_PG = "save_remote_pg",
}

export interface Member extends UserBasicInfo {
  roles: MemberRoleActions[];
}

export interface EntityMembersPage {
  total: number;
  limit: number;
  offset: number;
  members: Member[];
}

export interface Metadata {
  [key: string]: any;
}

export interface Option {
  value: string;
  label: string;
  disable?: boolean;
  /** fixed option that can't be removed. */
  fixed?: boolean;
  /** Group the options by providing key. */
  [key: string]: string | boolean | undefined;
}

export enum EntityType {
  User = "user",
  Channel = "channel",
  Domain = "domain",
  Member = "member",
  Role = "role",
  Pat = "pat",
  Workspace = "workspace"
}

export enum Status {
  Enabled = "enabled",
  Disabled = "disabled",
  All = "all",
}

export interface RoleMembersPage {
  total: number;
  limit: number;
  offset: number;
  members: UserBasicInfo[];
}
