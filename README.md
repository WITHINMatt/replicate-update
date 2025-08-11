# Replicate Weekly Update Tool

Automatically generates and emails weekly reports about Replicate model popularity changes, trends, and new releases.

## Features

- **Top Models**: Most active models by weekly runs
- **Biggest Gainers**: Models with largest absolute and percentage increases
- **New Models**: Recently added models with their initial traction
- **Trend Analysis**: Week-over-week comparison with percentage changes

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Email Provider

The tool uses SMTP to send emails. You can use:
- **Gmail**: Use app passwords (not your regular password)
- **Outlook/Hotmail**: Use app passwords
- **Yahoo Mail**: Use app passwords  
- **Custom SMTP**: Any SMTP server

### 3. Environment Variables

For local testing, create a `.env` file:

```bash
TO_EMAIL=your-email@example.com
FROM_EMAIL=reports@yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Common SMTP Settings:**
- Gmail: `smtp.gmail.com:587`
- Outlook: `smtp-mail.outlook.com:587`
- Yahoo: `smtp.mail.yahoo.com:587`

For GitHub Actions, add these as repository secrets:
- `TO_EMAIL`
- `FROM_EMAIL` 
- `SMTP_HOST`
- `SMTP_PORT` (optional, defaults to 587)
- `SMTP_USER`
- `SMTP_PASS`

### 4. GitHub Actions Setup

The workflow runs automatically every Monday at 9:00 AM UTC. To change the schedule, edit `.github/workflows/weekly-report.yml`.

You can also trigger it manually from the Actions tab in your GitHub repository.

## Usage

### Manual Run

```bash
npm run report
```

### Test Run

```bash
npm run test
```

## Data Source

This tool uses [all-the-public-replicate-models](https://github.com/replicate/all-the-public-replicate-models) which provides:
- Complete model metadata for all public Replicate models
- Daily run count statistics
- Historical trend data

## Email Format

The weekly report includes:

1. **Top Models This Week**: Models ranked by total weekly runs
2. **Biggest Gainers (Absolute)**: Models with largest run count increases  
3. **Biggest Gainers (Percentage)**: Models with highest percentage growth (minimum 1000 runs last week)
4. **New Models**: Models that appeared for the first time this week

Each section shows up to 10 models with run counts, changes, and direct links.

## Customization

Edit `weekly-report.mjs` to:
- Change the number of models shown in each section
- Adjust the minimum threshold for percentage gainers
- Modify the email format or add new metrics
- Change the analysis time window

## Schedule

The default schedule runs every Monday at 9:00 AM UTC. Adjust the cron expression in the GitHub Actions workflow to change this:

```yaml
schedule:
  - cron: "0 9 * * MON"  # Monday 9:00 AM UTC
```

Common alternatives:
- `"0 13 * * MON"` - Monday 1:00 PM UTC (9:00 AM EDT)
- `"0 17 * * SUN"` - Sunday 5:00 PM UTC (1:00 PM EDT)