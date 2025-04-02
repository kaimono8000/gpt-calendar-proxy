require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");
const app = express();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// スコープ（カレンダー読み取り専用）
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

// ログインURL生成
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  res.redirect(url);
});

// 認証コールバック
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  res.send("認証が完了しました！このウィンドウは閉じてOKです。");
});

// GPT用：予定取得API
app.get("/calendar/events", async (req, res) => {
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date().toISOString();

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now,
      maxResults: 5,
      singleEvents: true,
      orderBy: "startTime",
    });

    res.json(response.data.items);
  } catch (error) {
    console.error(error);
    res.status(500).send("エラーが発生しました");
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running at http://localhost:${process.env.PORT}`);
});

