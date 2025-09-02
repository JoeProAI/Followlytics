import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface NotificationSettings {
  email: boolean;
  webhook: boolean;
  webhookUrl?: string;
}

export const sendNotifications = functions.firestore
  .document('users/{uid}/unfollows/{eventId}')
  .onCreate(async (snap, context) => {
    const { uid, eventId } = context.params;
    const unfollowData = snap.data();

    try {
      // Get user settings
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.data();

      if (!userData || !userData.settings?.notifications) {
        return;
      }

      const notifications: NotificationSettings = userData.settings.notifications;

      // Send email notification if enabled
      if (notifications.email) {
        await sendEmailNotification(userData.email, unfollowData);
      }

      // Send webhook notification if enabled
      if (notifications.webhook && notifications.webhookUrl) {
        await sendWebhookNotification(notifications.webhookUrl, unfollowData);
      }

    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  });

async function sendEmailNotification(email: string, unfollowData: any): Promise<void> {
  // Implementation would depend on email service (SendGrid, etc.)
  console.log(`Email notification sent to ${email} for unfollow: ${unfollowData.unfollowerHandle}`);
}

async function sendWebhookNotification(webhookUrl: string, unfollowData: any): Promise<void> {
  // Implementation for webhook notifications
  console.log(`Webhook notification sent to ${webhookUrl} for unfollow: ${unfollowData.unfollowerHandle}`);
}
