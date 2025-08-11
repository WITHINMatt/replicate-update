import models from "all-the-public-replicate-models";
import stats from "all-the-public-replicate-models/stats";
import { chain } from "lodash-es";
import nodemailer from "nodemailer";
import { subDays, formatISO, parseISO, format } from "date-fns";
import { config } from "dotenv";

config();

const TO_EMAILS = process.env.TO_EMAILS ? process.env.TO_EMAILS.split(',').map(email => email.trim()) : [];
const FROM_EMAIL = process.env.FROM_EMAIL;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

if (!TO_EMAILS.length || !FROM_EMAIL || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error("Missing required environment variables:");
  console.error("- TO_EMAILS: comma-separated list of recipient email addresses");
  console.error("- FROM_EMAIL: sender email address");
  console.error("- SMTP_HOST: SMTP server hostname");
  console.error("- SMTP_PORT: SMTP server port (default: 587)");
  console.error("- SMTP_USER: SMTP username");
  console.error("- SMTP_PASS: SMTP password or app password");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(SMTP_PORT),
  secure: SMTP_PORT == 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

const today = new Date();
const endDate = subDays(today, 1);
const startDate = subDays(endDate, 6);
const prevEndDate = subDays(startDate, 1);
const prevStartDate = subDays(prevEndDate, 6);

function getDateRuns(modelKey, startDate, endDate) {
  const modelStats = stats[modelKey] || [];
  const startTime = +startDate;
  const endTime = +endDate;
  
  return modelStats
    .filter(entry => {
      const entryDate = +parseISO(entry.date);
      return entryDate >= startTime && entryDate <= endTime;
    })
    .reduce((total, entry) => total + (entry.dailyRuns || 0), 0);
}

function getFirstSeenDate(modelKey) {
  const modelStats = stats[modelKey] || [];
  return modelStats.length > 0 ? modelStats[0].date : null;
}

function formatNumber(num) {
  return num.toLocaleString();
}

function formatPercent(num) {
  return num.toFixed(1) + "%";
}

const modelIndex = new Map();
models.forEach(model => {
  modelIndex.set(`${model.owner}/${model.name}`, model);
});

const modelMetrics = [];
for (const [modelKey, model] of modelIndex.entries()) {
  const thisWeekRuns = getDateRuns(modelKey, startDate, endDate);
  const lastWeekRuns = getDateRuns(modelKey, prevStartDate, prevEndDate);
  const absoluteChange = thisWeekRuns - lastWeekRuns;
  const percentChange = lastWeekRuns > 0 ? (absoluteChange / lastWeekRuns) * 100 : (thisWeekRuns > 0 ? 100 : 0);
  
  modelMetrics.push({
    key: modelKey,
    url: model.url,
    description: model.description || "No description available",
    thisWeekRuns,
    lastWeekRuns,
    absoluteChange,
    percentChange,
    totalRuns: model.run_count,
    firstSeen: getFirstSeenDate(modelKey)
  });
}

const topThisWeek = chain(modelMetrics)
  .orderBy(["thisWeekRuns", "totalRuns"], ["desc", "desc"])
  .take(10)
  .value();

const biggestGainersAbsolute = chain(modelMetrics)
  .orderBy(["absoluteChange", "thisWeekRuns"], ["desc", "desc"])
  .take(10)
  .value();

const biggestGainersPercent = chain(modelMetrics)
  .filter(m => m.lastWeekRuns >= 1000)
  .orderBy(["percentChange", "thisWeekRuns"], ["desc", "desc"])
  .take(10)
  .value();

const newModelsThisWeek = chain(modelMetrics)
  .filter(m => {
    if (!m.firstSeen) return false;
    const firstSeenDate = +parseISO(m.firstSeen);
    return firstSeenDate >= +startDate && firstSeenDate <= +endDate;
  })
  .orderBy(["thisWeekRuns", "totalRuns"], ["desc", "desc"])
  .take(10)
  .value();

function createSection(title, items, formatter) {
  const separator = "═".repeat(title.length);
  const itemList = items.map((item, index) => {
    return `${index + 1}. ${formatter(item)}`;
  }).join("\n\n");
  
  return `\n${title}\n${separator}\n${itemList || "No items found"}\n`;
}

const dateRange = `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
const subject = `Replicate Weekly Update: ${dateRange}`;

function createHtmlSection(title, items, formatter) {
  const itemList = items.map((item, index) => {
    return `<div class="model-entry">${index + 1}. ${formatter(item)}</div>`;
  }).join('');
  
  return `
    <div class="section">
      <h2>${title}</h2>
      <div class="models-grid">
        ${itemList || "<div class='no-items'>No items found</div>"}
      </div>
    </div>
  `;
}

const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Replicate Weekly Update</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0;
      font-size: 2.5em;
      font-weight: 300;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      text-align: center;
    }
    .section {
      background: white;
      margin-bottom: 30px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 15px rgba(0,0,0,0.05);
    }
    .section h2 {
      background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
      color: white;
      margin: 0;
      padding: 20px;
      font-size: 1.4em;
      font-weight: 500;
    }
    .models-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
      padding: 20px;
    }
    .model-entry {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      transition: transform 0.2s ease;
    }
    .model-entry:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .model-name {
      font-weight: 600;
      font-size: 1.1em;
      color: #2c3e50;
      margin-bottom: 8px;
    }
    .model-description {
      color: #7f8c8d;
      font-style: italic;
      margin-bottom: 12px;
      font-size: 0.95em;
    }
    .model-stats {
      font-size: 0.9em;
      line-height: 1.4;
    }
    .model-url {
      margin-top: 8px;
    }
    .model-url a {
      color: #3498db;
      text-decoration: none;
      font-size: 0.85em;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #7f8c8d;
      border-top: 1px solid #ecf0f1;
      margin-top: 40px;
    }
    .stat-highlight {
      color: #e74c3c;
      font-weight: 600;
    }
    .growth-positive {
      color: #27ae60;
      font-weight: 600;
    }
    .growth-negative {
      color: #e74c3c;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 REPLICATE WEEKLY UPDATE</h1>
  </div>
  
  <div class="summary">
    <h3>📅 Period: ${dateRange}</h3>
    <p><strong>📊 Total Models Analyzed: ${formatNumber(modelMetrics.length)}</strong></p>
  </div>

  ${createHtmlSection("🏆 Top Models This Week", topThisWeek, (m) => 
    `<div class="model-name">${m.key}</div>
     <div class="model-description">${m.description}</div>
     <div class="model-stats">
       📈 <span class="stat-highlight">${formatNumber(m.thisWeekRuns)}</span> runs this week<br>
       🔄 Change: <span class="${m.absoluteChange >= 0 ? 'growth-positive' : 'growth-negative'}">${m.absoluteChange >= 0 ? '+' : ''}${formatNumber(m.absoluteChange)} runs (${formatPercent(m.percentChange)})</span>
     </div>
     <div class="model-url">🔗 <a href="${m.url}">${m.url}</a></div>`
  )}

  ${createHtmlSection("📈 Biggest Gainers (Absolute)", biggestGainersAbsolute, (m) => 
    `<div class="model-name">${m.key}</div>
     <div class="model-description">${m.description}</div>
     <div class="model-stats">
       📊 Growth: <span class="growth-positive">+${formatNumber(m.absoluteChange)} runs (${formatPercent(m.percentChange)} increase)</span><br>
       📈 This week: <span class="stat-highlight">${formatNumber(m.thisWeekRuns)}</span> runs
     </div>
     <div class="model-url">🔗 <a href="${m.url}">${m.url}</a></div>`
  )}

  ${createHtmlSection("🚀 Biggest Gainers (Percentage)", biggestGainersPercent, (m) => 
    `<div class="model-name">${m.key}</div>
     <div class="model-description">${m.description}</div>
     <div class="model-stats">
       🔥 Growth: <span class="growth-positive">${formatPercent(m.percentChange)} increase</span><br>
       📊 Runs: <span class="stat-highlight">${formatNumber(m.thisWeekRuns)}</span> this week
     </div>
     <div class="model-url">🔗 <a href="${m.url}">${m.url}</a></div>`
  )}

  ${createHtmlSection("🆕 New Models This Week", newModelsThisWeek, (m) => 
    `<div class="model-name">${m.key}</div>
     <div class="model-description">${m.description}</div>
     <div class="model-stats">
       ✨ Debut performance: <span class="stat-highlight">${formatNumber(m.thisWeekRuns)}</span> runs
     </div>
     <div class="model-url">🔗 <a href="${m.url}">${m.url}</a></div>`
  )}

  <div class="footer">
    🤖 Generated by Replicate Weekly Update Tool<br>
    📧 Questions? Reply to this email for support
  </div>
</body>
</html>
`;

try {
  await transporter.sendMail({
    from: FROM_EMAIL,
    to: TO_EMAILS.join(', '),
    subject: subject,
    html: emailBody
  });
  
  console.log(`✅ Weekly report sent successfully to ${TO_EMAILS.length} recipients:`);
  TO_EMAILS.forEach(email => console.log(`   📧 ${email}`));
  console.log(`📊 Report covers ${modelMetrics.length} models`);
  console.log(`📅 Period: ${dateRange}`);
} catch (error) {
  console.error("❌ Failed to send email:", error.message);
  process.exit(1);
}