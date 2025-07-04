const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

// Parse service account from env
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
        // Send email
        const msg = {
          to: user.email,
          from: "your@email.com", // Change to your verified sender
          subject: "Happy Birthday from FanAddicts!",
          text: `Happy Birthday, ${user.username}! 🎉`,
          html: `<strong>Happy Birthday, ${user.username}! 🎉</strong>`,
        };
        try {
          await sgMail.send(msg);
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
