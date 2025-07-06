const admin = require("firebase-admin");
const { google } = require("googleapis");

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "fanaddicts-67322",
});

const db = admin.firestore();

// Gmail API setup
const credentials = require("./oauth-credentials.json");
const token = require("./gmail-token.json");

const { client_id, client_secret, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);
oAuth2Client.setCredentials(token);

const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

// Simple text email template
const createEmailTemplate = (username) => `Happy Birthday ${username}! 🎂

Wishing you a wonderful day filled with joy and happiness.

Hope you have an amazing year ahead!

Best wishes,
Birthday Bot`;

// Get today's date in MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${month}-${day}`;
};

// Extract MM-DD from date string
const extractMonthDay = (dateString) => {
  try {
    if (dateString.includes("-") && dateString.length >= 8) {
      const parts = dateString.split("-");
      if (parts.length >= 3) {
        const month = parts[1].padStart(2, "0");
        const day = parts[2].padStart(2, "0");
        return `${month}-${day}`;
      } else if (parts.length === 2) {
        const month = parts[0].padStart(2, "0");
        const day = parts[1].padStart(2, "0");
        return `${month}-${day}`;
      }
    }

    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${month}-${day}`;
    }

    return dateString;
  } catch (error) {
    console.log(`⚠️ Could not parse date: ${dateString}`);
    return dateString;
  }
};

// Send birthday email
const sendBirthdayEmail = async (userEmail, username) => {
  try {
    const textContent = createEmailTemplate(username);

    const emailContent = [
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      `To: ${userEmail}`,
      `Subject: =?UTF-8?B?${Buffer.from("🎂 Happy Birthday! 🎉").toString("base64")}?=`,
      "",
      textContent,
    ].join("\r\n");

    const encodedMessage = Buffer.from(emailContent, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    console.log(`✅ Birthday email sent to ${username} (${userEmail})`);
  } catch (error) {
    console.error(`❌ Error sending email to ${username}: ${error.message}`);
    throw error;
  }
};

// Main function to check birthdays and send emails
const checkBirthdaysAndSend = async () => {
  const today = getTodayDate();
  console.log(`🔍 Checking for birthdays on ${today}...`);

  try {
    const usersSnapshot = await db.collection("accounts").get();

    if (usersSnapshot.empty) {
      console.log("📭 No accounts found in the database!");
      return;
    }

    console.log(`👥 Found ${usersSnapshot.size} total accounts`);

    const birthdayUsers = [];

    usersSnapshot.forEach((doc) => {
      const { username, email, birthday } = doc.data();

      if (birthday) {
        const userBirthdayMD = extractMonthDay(birthday);
        if (userBirthdayMD === today) {
          birthdayUsers.push({ username, email });
          console.log(`🎂 Birthday match found: ${username}!`);
        }
      }
    });

    if (birthdayUsers.length === 0) {
      console.log("🎈 No birthdays found for today!");
      return;
    }

    console.log(`🎂 Found ${birthdayUsers.length} birthday(s) for today!`);

    const emailPromises = birthdayUsers
      .filter((user) => user.email && user.username)
      .map((user) => sendBirthdayEmail(user.email, user.username));

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `📊 Email Summary: ${successful} sent successfully, ${failed} failed`
    );
  } catch (error) {
    console.error("💥 Error in birthday check process:", error);
    throw error;
  }
};

// Main execution
const main = async () => {
  console.log("🚀 Starting Birthday Automation...");
  console.log("📅 Date:", new Date().toISOString());

  try {
    await checkBirthdaysAndSend();
    console.log("✅ Birthday automation completed successfully!");
  } catch (error) {
    console.error("💥 Birthday automation failed:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkBirthdaysAndSend, sendBirthdayEmail, extractMonthDay };
