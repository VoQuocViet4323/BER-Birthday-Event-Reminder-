"use client";

import { useState, Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { OfflineIndicator } from "@/components/common/offline-indicator";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { useEvents } from "@/hooks/use-events";
import { useAutoReminderScheduler } from "@/hooks/use-auto-reminder-scheduler";
import { EventWithMeta, EventFormValues } from "@/types/events";
import { UndoSnackbarPortal } from "@/components/events/undo-manager";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Tự động quét và gửi email nhắc nhở theo phút khi người dùng mở ứng dụng
  useAutoReminderScheduler();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithMeta | null>(null);
  const { addEvent, updateEvent, isAdding, isUpdating } = useEvents();

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (event: EventWithMeta) => {
    setEditingEvent(event);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (values: EventFormValues) => {
    if (editingEvent) {
      await updateEvent({ id: editingEvent.id, values });
    } else {
      await addEvent(values);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineIndicator />
      <AppHeader onOpenCreateModal={handleOpenCreate} />

      <div className="flex-1 flex w-full">
        <Suspense fallback={<aside className="hidden lg:flex w-72 shrink-0 border-r border-border/60 bg-card/40" />}>
          <DesktopSidebar onOpenCreateModal={handleOpenCreate} />
        </Suspense>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 xl:p-10 pb-24 lg:pb-12 w-full max-w-7xl">
          {children}
        </main>
      </div>

      <MobileBottomNav onOpenCreateModal={handleOpenCreate} />

      <EventFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingEvent}
        isSubmitting={isAdding || isUpdating}
      />

      {/* Global Undo Snackbar for swipe-to-delete (Prompt #071) */}
      <UndoSnackbarPortal />
    </div>
  );
}
