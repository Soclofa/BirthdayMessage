const { MailerSend, Recipient } = require("mailersend");
const admin = require("firebase-admin");

// Firebase setup
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
        const recipients = [new Recipient(user.email, user.username)];
        try {
          await mailersend.email.send({
            from: "noreply@test-zkq340eykjkgd796.mlsender.net", // MailerSend test domain
            from_name: "FanAddicts",
            to: recipients,
            subject: "Happy Birthday from FanAddicts!",
            html: `<strong>Happy Birthday, ${user.username}! 🎉</strong>`,
            text: `Happy Birthday, ${user.username}! 🎉`,
          });
          sentCount++;
          console.log(`Sent birthday email to ${user.email}`);
        } catch (err) {
          console.error(`Failed to send to ${user.email}:`, err);
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
