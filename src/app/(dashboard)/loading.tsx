import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 py-6">
      {/* Vòng xoay loading trung tâm */}
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="relative flex items-center justify-center w-10 h-10">
          <div className="absolute inset-0 rounded-full bg-primary/25 blur-md animate-pulse" />
          <Loader2 className="w-9 h-9 text-primary animate-spin stroke-[2.5] relative" />
        </div>
        <p className="text-xs font-semibold text-muted-foreground">
          Đang tải...
        </p>
      </div>

      {/* Bộ khung xương Skeleton placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-3xl bg-card border border-border/70 space-y-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary/80 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-secondary/80 rounded-md w-3/4" />
                <div className="h-3 bg-secondary/50 rounded-md w-1/2" />
              </div>
            </div>
            <div className="h-10 bg-secondary/40 rounded-2xl w-full mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
