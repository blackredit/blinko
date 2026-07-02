import { observer } from "mobx-react-lite";
import { Button, Input, Switch } from "@heroui/react";
import { RootStore } from "@/store";
import { BlinkoStore } from "@/store/blinkoStore";
import { PromiseCall } from "@/store/standard/PromiseState";
import { Icon } from '@/components/Common/Iconify/icons';
import { api } from "@/lib/trpc";
import { Item } from "./Item";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { PasswordInput } from "@/components/Common/PasswordInput";
import { CollapsibleCard } from "@/components/Common/CollapsibleCard";

export const EmailSetting = observer(() => {
  const { t } = useTranslation();
  const blinko = RootStore.Get(BlinkoStore);
  const store = RootStore.Local(() => ({
    imapHost: "",
    imapPort: "993",
    imapUser: "",
    imapPassword: "",
    imapFolder: "INBOX",
    imapPollInterval: "5",
    imapEnabled: false,
    imapAutoTag: "",
  }));

  useEffect(() => {
    store.imapHost = blinko.config.value?.imapHost || "";
    store.imapPort = blinko.config.value?.imapPort || "993";
    store.imapUser = blinko.config.value?.imapUser || "";
    store.imapPassword = blinko.config.value?.imapPassword || "";
    store.imapFolder = blinko.config.value?.imapFolder || "INBOX";
    store.imapPollInterval = blinko.config.value?.imapPollInterval || "5";
    store.imapEnabled = blinko.config.value?.imapEnabled || false;
    store.imapAutoTag = blinko.config.value?.imapAutoTag || "";
  }, [blinko.config.value]);

  return (
    <CollapsibleCard
      icon="mdi:email-outline"
      title={t('email-to-note')}
    >
      <Item
        leftContent={<div className="flex flex-col gap-1">
          <div>{t('enable-imap')}</div>
          <div className="text-xs text-default-400">{t('enable-imap-desc')}</div>
        </div>}
        rightContent={
          <Switch
            isSelected={store.imapEnabled}
            onValueChange={async (checked) => {
              store.imapEnabled = checked;
              await PromiseCall(api.config.update.mutate({
                key: 'imapEnabled',
                value: checked,
              }), { autoAlert: false });
            }}
          />
        }
      />

      {store.imapEnabled && (
        <>
          <Item
            leftContent={<>{t('imap-host')}</>}
            rightContent={
              <Input
                value={store.imapHost}
                onChange={e => store.imapHost = e.target.value}
                placeholder="imap.gmail.com"
                onBlur={async (e) => {
                  await PromiseCall(api.config.update.mutate({
                    key: 'imapHost',
                    value: e.target.value,
                  }), { autoAlert: false });
                }}
              />
            }
          />
          <Item
            leftContent={<>{t('imap-port')}</>}
            rightContent={
              <Input
                value={store.imapPort}
                onChange={e => store.imapPort = e.target.value}
                placeholder="993"
                onBlur={async (e) => {
                  await PromiseCall(api.config.update.mutate({
                    key: 'imapPort',
                    value: e.target.value,
                  }), { autoAlert: false });
                }}
              />
            }
          />
          <Item
            leftContent={<>{t('imap-user')}</>}
            rightContent={
              <Input
                value={store.imapUser}
                onChange={e => store.imapUser = e.target.value}
                placeholder="your-email@gmail.com"
                onBlur={async (e) => {
                  await PromiseCall(api.config.update.mutate({
                    key: 'imapUser',
                    value: e.target.value,
                  }), { autoAlert: false });
                }}
              />
            }
          />
          <Item
            leftContent={<>{t('imap-password')}</>}
            rightContent={
              <PasswordInput
                value={store.imapPassword}
                onChange={e => store.imapPassword = e.target.value}
                placeholder={t('imap-password-desc')}
                onBlur={async (e) => {
                  await PromiseCall(api.config.update.mutate({
                    key: 'imapPassword',
                    value: e.target.value,
                  }), { autoAlert: false });
                }}
              />
            }
          />
          <Item
            leftContent={<>{t('imap-folder')}</>}
            rightContent={
              <Input
                value={store.imapFolder}
                onChange={e => store.imapFolder = e.target.value}
                placeholder="INBOX"
                onBlur={async (e) => {
                  await PromiseCall(api.config.update.mutate({
                    key: 'imapFolder',
                    value: e.target.value,
                  }), { autoAlert: false });
                }}
              />
            }
          />
          <Item
            leftContent={<>{t('auto-tag')}</>}
            rightContent={
              <Input
                value={store.imapAutoTag}
                onChange={e => store.imapAutoTag = e.target.value}
                placeholder="email"
                description={t('auto-tag-desc')}
                onBlur={async (e) => {
                  await PromiseCall(api.config.update.mutate({
                    key: 'imapAutoTag',
                    value: e.target.value,
                  }), { autoAlert: false });
                }}
              />
            }
          />
        </>
      )}
    </CollapsibleCard>
  );
});
