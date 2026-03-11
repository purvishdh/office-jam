"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Group } from "@/lib/types";

interface Props {
  onJoin: (groupId: string) => void;
}

export default function PublicGroups({ onJoin }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-groups"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("groups")
          .select("id, name, playlist, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Supabase error:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          throw new Error(`Supabase: ${error.message || "Unknown error"}`);
        }
        return data as Group[];
      } catch (err) {
        console.error("Network error fetching groups:", err);
        throw new Error(`Network: ${err}`);
      }
    },
    refetchInterval: 10000,
    retry: (failureCount) => {
      // Don't retry network errors too aggressively
      return failureCount < 2;
    },
  });

  if (isLoading)
    return <p className="opacity-60 text-xs sm:text-sm">Loading parties…</p>;

  if (error)
    return (
      <div className="text-red-400 text-xs sm:text-sm space-y-1">
        <p>Failed to load parties.</p>
        <p className="opacity-60">Check your connection or try again later.</p>
      </div>
    );

  if (!data?.length)
    return (
      <p className="opacity-60 text-xs sm:text-sm">No active parties found</p>
    );

  return (
    <div className="mt-3 sm:mt-4 space-y-2">
      <p className="text-xs sm:text-sm font-semibold opacity-80">
        Recent parties:
      </p>
      {data.map((g) => (
          <button
            key={g.id}
            onClick={() => onJoin(g.id)}
            className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 transition-all text-sm sm:text-base cursor-pointer"
          >
            <span className="font-medium truncate">{g.name}</span>
            <span className="text-xs sm:text-sm opacity-60 ml-2">
              {g.playlist?.length ?? 0} songs
            </span>
          </button>
        ))}
    </div>
  );
}
