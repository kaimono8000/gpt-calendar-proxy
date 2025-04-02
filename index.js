require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");
const fs = require("fs");
const app = express();

const PORT = process.env.PORT || 3000;
const TOKEN_PATH = "token.json";

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
    prompt: "consent", // ← refresh_tokenを確実にもらうため
  });
  res.redirect(url);
});

// 認証コールバック
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send("認証が完了しました！このウィンドウは閉じてOKです。");
  } catch (error) {
    console.error("認証エラー:", error);
    res.status(500).send("認証中にエラーが発生しました。");
  }
});

// GPT用：予定取得API
app.get("/calendar/events", async (req, res) => {
  if (!fs.existsSync(TOKEN_PATH)) {
    return res.status(401).send("認証トークンが見つかりません。まず /auth にアクセスしてください。");
  }

  try {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const now = new Date().toISOString();

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now,
      maxResults: 5,
      singleEvents: true,
      orderBy: "startTime",
    });

    res.json(response.data.items);
  } catch (error) {
    console.error("カレンダー取得エラー:", error);
    res.status(500).send("エラーが発生しました");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
