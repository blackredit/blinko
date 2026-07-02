import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Button, DatePicker, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Icon } from "@/components/Common/Iconify/icons";
import { RootStore } from "@/store";
import { BlinkoStore } from "@/store/blinkoStore";
import { api } from "@/lib/trpc";
import { PromiseCall } from "@/store/standard/PromiseState";
import { useTranslation } from "react-i18next";
import { parseDate, today, getLocalTimeZone } from "@internationalized/date";

interface ReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: number;
  currentRemindAt?: Date | null;
}

export const ReminderDialog = observer(({ isOpen, onClose, noteId, currentRemindAt }: ReminderDialogProps) => {
  const { t } = useTranslation();
  const blinko = RootStore.Get(BlinkoStore);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSetReminder = async () => {
    if (!selectedDate) return;
    setIsLoading(true);
    try {
      const date = new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day, selectedDate.hour || 0, selectedDate.minute || 0);
      await PromiseCall(api.notes.upsert.mutate({
        id: noteId,
        remindAt: date,
      }), { autoAlert: true });
      blinko.updateTicker++;
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearReminder = async () => {
    setIsLoading(true);
    try {
      await PromiseCall(api.notes.upsert.mutate({
        id: noteId,
        remindAt: null,
      }), { autoAlert: true });
      blinko.updateTicker++;
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:bell-ring-outline" width="20" height="20" />
            {t('set-reminder')}
          </div>
        </ModalHeader>
        <ModalBody>
          <DatePicker
            label={t('reminder-time')}
            variant="bordered"
            granularity="minute"
            hourCycle={24}
            onChange={setSelectedDate}
          />
          {currentRemindAt && (
            <div className="text-sm text-default-500">
              {t('current-reminder')}: {new Date(currentRemindAt).toLocaleString()}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {currentRemindAt && (
            <Button
              color="danger"
              variant="light"
              onPress={handleClearReminder}
              isLoading={isLoading}
            >
              {t('clear-reminder')}
            </Button>
          )}
          <Button
            color="primary"
            onPress={handleSetReminder}
            isLoading={isLoading}
            isDisabled={!selectedDate}
          >
            {t('set')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});
