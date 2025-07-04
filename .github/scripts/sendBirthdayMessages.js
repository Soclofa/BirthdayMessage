const { MailerSend, EmailParams, Recipient } = require("mailersend");
const admin = require("firebase-admin");

// Firebase setup (same as before)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// MailerSend setup
const mailersend = new MailerSend({ apiKey: process.env.MAILERSEND_API_KEY });

async function main() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const usersSnapshot = await db.collection("accounts").get();
  let sentCount = 0;

  for (const doc of usersSnapshot.docs) {
    const user = doc.data();
    if (user.birthday) {
      const [year, userMonth, userDay] = user.birthday.split("-");
      if (userMonth === month && userDay === day) {
        // Prepare email
        const emailParams = new EmailParams()
          .setFrom("your@verifieddomain.com") // must be a verified sender/domain
          .setFromName("FanAddicts")
          .setSubject("Happy Birthday from FanAddicts!")
          .setHtml(`<strong>Happy Birthday, ${user.username}! 🎉</strong>`)
          .setText(`Happy Birthday, ${user.username}! 🎉`)
          .addRecipient(new Recipient(user.email, user.username));

        try {
          await mailersend.email.send(emailParams);
          sentCount++;
          console.log(`Sent birthday email to ${user.email}`);
        } catch (err) {
          console.error(`Failed to send to ${user.email}:`, err.message);
        }
      }
    }
  }
  console.log(`Done. Sent ${sentCount} birthday emails.`);
}

main().catch((err) => {
  console.error("Error running birthday script:", err);
  process.exit(1);
});
