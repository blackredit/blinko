import { REMINDER_CHECK_TASK_NAME } from "@shared/lib/sharedConstant";
import { prisma } from "../prisma";
import { CreateNotification } from "../routerTrpc/notification";
import { BaseScheduleJob } from "./baseScheduleJob";

export class ReminderCheckJob extends BaseScheduleJob {
  protected static taskName = REMINDER_CHECK_TASK_NAME;
  protected static cronSchedule = '* * * * *'; // Every minute

  protected static async RunTask() {
    try {
      const now = new Date();
      const dueNotes = await prisma.notes.findMany({
        where: {
          remindAt: { lte: now },
          isRecycle: false,
          isArchived: false,
        },
        select: {
          id: true,
          content: true,
          accountId: true,
        },
      });

      if (dueNotes.length === 0) return { processed: 0 };

      for (const note of dueNotes) {
        const preview = note.content.substring(0, 100).replace(/[#*\[\]]/g, '').trim();
        await CreateNotification({
          type: 'reminder',
          title: 'note-reminder',
          content: preview || `Reminder for note #${note.id}`,
          metadata: { noteId: note.id },
          accountId: note.accountId ?? undefined,
        });

        await prisma.notes.update({
          where: { id: note.id },
          data: { remindAt: null },
        });
      }

      return { processed: dueNotes.length };
    } catch (error: any) {
      console.error(`[${REMINDER_CHECK_TASK_NAME}] Error:`, error);
      return { processed: 0, error: error.message };
    }
  }
}
