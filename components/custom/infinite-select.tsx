"use client";

import type {
    Channel,
    ChannelsPage,
    Client,
    DomainsPage,
    Group,
    PageMetadata,
    Role,
    RolePage,
    User,
    UsersPage,
} from "@absmach/magistrala-sdk";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { type EntityFetchData, FetchData } from "@/lib/actions";
import { cn } from "@/lib/utils";
import {
    type EntityMembersPage,
    EntityType,
} from "@/types/entities";
import { useCallback, useEffect, useState } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { RequestOptions } from "@/lib/magistrala";

// biome-ignore lint/suspicious/noExplicitAny: This infiniteSelect component is meant to be used by any dataType.
type InfiniteSelectController = ControllerRenderProps<any>;

type InfiniteSelectProps = {
    field: InfiniteSelectController;
    entityType: EntityType;
    entityId?: string;
    initData: EntityFetchData;
    id?: string;
    displayValue?: string;
    disableSearch?: boolean;
    onChange?: (value: string | undefined, displayName?: string) => void;
    getData: ({ token, id, queryParams }: RequestOptions, domainId?: string) => Promise<
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
    >;
};

export const InfiniteSelect = ({
    field,
    entityType,
    entityId,
    initData,
    id,
    onChange,
    getData,
    displayValue,
    disableSearch,
}: InfiniteSelectProps) => {
    const [data, setData] = useState<
        Channel[] | Client[] | User[] | Group[] | Role[]
    >([]);
    const [total, setTotal] = useState(0);
    const [ref, inView] = useInView();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedValue, setSelectedValue] = useState<string | undefined>(
        undefined,
    );
    const [error, setError] = useState<string | null>(initData?.error);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const limit: number = 20;

    useEffect(() => {
        if (displayValue) {
            setSelectedValue(displayValue);
        }
    }, [displayValue]);

    const getDisplayValue = (entity: Channel | Client | User | Group | Role) => {
        if (entityType === EntityType.User || entityType === EntityType.Member) {
            return (entity as User).credentials?.username || entity.id;
        }
        return (entity as Channel | Client | Group | Role).name || entity.id;
    };

    const loadMoreEntities = useCallback(async () => {
        if (isLoading) {
            return;
        }
        setIsLoading(true);

        const queryParams: PageMetadata = {
            offset: data.length,
            limit,
            ...(entityType === EntityType.Role
                ? // biome-ignore lint/style/useNamingConvention: This is from an external library
                { role_name: searchTerm }
                : entityType === EntityType.User || entityType === EntityType.Member
                    ? { username: searchTerm }
                    : { name: searchTerm }),
        };

        const newData = await FetchData(entityType, queryParams, getData, id);

        if (newData.error) {
            setError(newData.error);
            toast.error(`Error fetching data with error: ${newData.error}`);
        } else if (newData.data.length > 0) {
            const filteredData = entityId
                ? removeOwn(newData.data, entityId)
                : newData.data;
            const updatedData = [...data, ...filteredData];
            setData(updatedData);
            setTotal(entityId ? newData.total - 1 : newData.total);
        }

        setIsLoading(false);
    }, [data, entityType, entityId, id, getData, searchTerm, isLoading]);

    const fetchData = useCallback(
        async (searchValue: string) => {
            setIsLoading(true);
            setData([]);
            const queryParams: PageMetadata = {
                offset: 0,
                limit,
                ...(entityType === EntityType.Role
                    ? // biome-ignore lint/style/useNamingConvention: This is from an external library
                    { role_name: searchValue }
                    : entityType === EntityType.User || entityType === EntityType.Member
                        ? { username: searchValue }
                        : { name: searchValue }),
            };
            const newData = await FetchData(entityType, queryParams, getData, id);
            if (newData.error) {
                setError(newData.error);
                toast.error(`Error fetching data with error: ${newData.error}`);
            } else {
                setData(entityId ? removeOwn(newData.data, entityId) : newData.data);
                setTotal(entityId ? newData.total - 1 : newData.total);
            }

            setIsLoading(false);
        },
        [entityType, entityId, id, getData],
    );

    useEffect(() => {
        if (inView && !error && !isLoading && data.length < total) {
            loadMoreEntities();
        }
    }, [inView, loadMoreEntities, error, data?.length, total, isLoading]);

    useEffect(() => {
        if (initData?.error) {
            setError(initData.error);
            toast.error(`Error fetching data with error: ${initData.error}`);
            return;
        }

        if (initData) {
            const safeData = initData.data || [];
            const cleaned = entityId ? removeOwn(safeData, entityId) : safeData;
            setData(cleaned);
            setTotal(entityId ? initData.total - 1 : initData.total);
        }
    }, [initData, entityId]);

    const handleSearch = useDebouncedCallback((value) => {
        setSearchTerm(value);
        fetchData(value);
    }, 1000);

    return (
        <>
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <FormControl>
                    <PopoverTrigger asChild={true} className="md:min-w-32">
                        <Button
                            variant="outline"
                            // biome-ignore lint/a11y/useSemanticElements: intentional
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between truncate"
                        >
                            {selectedValue ||
                                `Select a ${entityType
                                }`}
                            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                </FormControl>
                <PopoverContent className="p-0 w-(--radix-popover-trigger-width)">
                    <Command>
                        {!disableSearch && (
                            <>
                                <div className="flex items-center border-b px-3">
                                    <Search className="mr-2 size-4 shrink-0 opacity-50" />
                                    <Input
                                        ref={(node: HTMLInputElement) => node?.focus()}
                                        placeholder={`Search ${entityType} by name`}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleSearch(e.target.value);
                                        }}
                                        className="w-full p-0 focus-visible:ring-0 text-sm border-none bg-transparent focus-visible:ring-transparent focus-visible:ring-offset-0 outline-none"
                                    />
                                </div>
                                <Button
                                    className="my-2 w-full"
                                    variant="ghost"
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedValue(undefined);
                                        field.onChange(undefined);
                                        setSearchTerm("");
                                        fetchData("");
                                        if (onChange) {
                                            onChange(undefined, undefined);
                                        }
                                    }}
                                >
                                    Clear selection
                                </Button>
                            </>
                        )}

                        <CommandList>
                            {!isLoading && (
                                <CommandEmpty>No results</CommandEmpty>
                            )}
                            <CommandGroup>
                                {data?.length > 0 &&
                                    data.map((entity) => (
                                        <CommandItem
                                            key={entity.id}
                                            value={entity.id}
                                            onSelect={(value) => {
                                                const displayValue = getDisplayValue(entity);
                                                setSelectedValue(displayValue);
                                                field.onChange(value);
                                                if (onChange) {
                                                    onChange(value, displayValue);
                                                }
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "size-4 m-0",
                                                    field.value === entity.id
                                                        ? "opacity-100"
                                                        : "opacity-0",
                                                )}
                                            />
                                            {getDisplayValue(entity)}
                                        </CommandItem>
                                    ))}
                            </CommandGroup>
                            {isLoading && (
                                <div className="flex justify-center p-2">
                                    <Spinner />
                                </div>
                            )}
                            {!isLoading && data?.length < total && (
                                <div ref={ref} className="flex justify-center p-2">
                                    <Button variant="ghost" onClick={loadMoreEntities}>
                                        Load more
                                    </Button>
                                </div>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
                <FormMessage />
            </Popover>
        </>
    );
};

type Entity = { id: string };

const removeOwn = <T extends Entity>(data: T[], existingId: string): T[] => {
    return data.filter((entity) => entity.id !== existingId);
};
