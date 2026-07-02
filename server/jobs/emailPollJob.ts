import { EMAIL_POLL_TASK_NAME } from "@shared/lib/sharedConstant";
import { prisma } from "../prisma";
import { adminCaller } from "../routerTrpc/_app";
import { FileService } from "../lib/files";
import { BaseScheduleJob } from "./baseScheduleJob";

export class EmailPollJob extends BaseScheduleJob {
  protected static taskName = EMAIL_POLL_TASK_NAME;
  protected static cronSchedule = '*/5 * * * *'; // Every 5 minutes

  protected static async RunTask() {
    let connection: any = null;
    try {
      const config = await adminCaller.config.list();

      if (!config.imapEnabled) {
        return { skipped: true, reason: 'IMAP not enabled' };
      }

      const imapConfig = {
        imap: {
          user: config.imapUser,
          password: config.imapPassword,
          host: config.imapHost,
          port: Number(config.imapPort) || 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false },
        },
      };

      const imaps = require('imap-simple');
      const { simpleParser } = require('mailparser');
      const TurndownService = require('turndown');
      const turndown = new TurndownService();

      connection = await imaps.connect(imapConfig);
      await connection.openBox(config.imapFolder || 'INBOX');

      const lastUid = Number(config.imapLastUid) || 0;
      const searchCriteria = ['UID', `${lastUid + 1}:*`];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: true,
        struct: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      if (!messages || messages.length === 0) {
        return { processed: 0 };
      }

      // Find the superadmin account
      const adminAccount = await prisma.accounts.findFirst({
        where: { role: 'superadmin' },
      });
      if (!adminAccount) {
        return { processed: 0, error: 'No admin account found' };
      }

      let maxUid = lastUid;
      let processed = 0;

      for (const message of messages) {
        try {
          const all = message.parts.find((part: any) => part.which === '');
          if (!all) continue;

          const parsed = await simpleParser(all.body);

          // Convert HTML to markdown
          let bodyMarkdown = '';
          if (parsed.html) {
            bodyMarkdown = turndown.turndown(parsed.html);
          } else if (parsed.text) {
            bodyMarkdown = parsed.text;
          }

          const fromAddress = parsed.from?.text || 'unknown';
          const subject = parsed.subject || '(no subject)';
          const date = parsed.date?.toISOString() || new Date().toISOString();

          const content = [
            `## ${subject}`,
            '',
            `**From:** ${fromAddress}`,
            `**Date:** ${date}`,
            '',
            bodyMarkdown,
          ].join('\n');

          // Save attachments
          const attachments: { name: string; path: string; size: number; type: string }[] = [];
          if (parsed.attachments?.length) {
            for (const att of parsed.attachments) {
              if (att.filename) {
                const result = await FileService.uploadFile({
                  buffer: att.content,
                  originalName: att.filename,
                  type: att.contentType || 'application/octet-stream',
                  accountId: adminAccount.id,
                });
                attachments.push({
                  name: result.fileName,
                  path: result.filePath,
                  size: att.size,
                  type: att.contentType || 'application/octet-stream',
                });
              }
            }
          }

          // Create note with auto-tag if configured
          const autoTag = config.imapAutoTag ? ` #${config.imapAutoTag}` : '';
          const noteContent = content + autoTag;

          // Use tRPC caller to create the note
          const ctx = {
            id: adminAccount.id.toString(),
            name: adminAccount.name,
            role: adminAccount.role as 'superadmin' | 'user',
            sub: adminAccount.id.toString(),
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
          };

          await adminCaller.notes.upsert({
            content: noteContent,
            type: 1, // NOTE type
            attachments,
            metadata: {
              source: 'email',
              from: fromAddress,
              subject,
              emailDate: date,
            },
          });

          // Track highest UID
          const uid = Number(message.attributes.uid);
          if (uid > maxUid) maxUid = uid;
          processed++;
        } catch (err) {
          console.error(`[${EMAIL_POLL_TASK_NAME}] Error processing email:`, err);
        }
      }

      // Save last processed UID
      if (maxUid > lastUid) {
        await adminCaller.config.update({
          key: 'imapLastUid',
          value: maxUid.toString(),
        });
      }

      return { processed, total: messages.length };
    } catch (error: any) {
      console.error(`[${EMAIL_POLL_TASK_NAME}] Error:`, error);
      return { processed: 0, error: error.message };
    } finally {
      if (connection) {
        try { connection.end(); } catch (e) { /* ignore */ }
      }
    }
  }
}
