const WEBHOOK_URL =
  process.env.COMMENT_ALERT_WEBHOOK ||
  process.env.SLACK_WEBHOOK_URL ||
  process.env.DISCORD_WEBHOOK_URL ||
  '';

const parseRequestBody = async (req) => {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const sendWebhookNotification = async (report) => {
  if (!WEBHOOK_URL) {
    console.info('[report-comment] Received report without webhook configured', report);
    return;
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `🚨 New comment report on "${report.postTitle}"`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*🚨 Comment flagged on "${report.postTitle}"*\n• Comment ID: \`${report.commentId}\`\n• Reporter: ${report.reporterName || 'anonymous'}\n• Reason: ${report.reason}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Excerpt*\n>${report.commentExcerpt || '_No content provided_'}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Post: ${report.postSlug ? `https://thenexusblog.vercel.app/posts/${report.postSlug}` : report.postId}`,
              },
            ],
          },
        ],
      }),
    });
  } catch (error) {
    console.error('[report-comment] Failed to send webhook', error);
  }
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const payload = await parseRequestBody(req);
    const {
      commentId,
      postId,
      postSlug,
      commentAuthor,
      commentExcerpt,
      reason,
      reporterId,
      reporterName,
      postTitle,
    } = payload || {};

    if (!commentId || !reason || !postId) {
      res.status(400).json({ message: 'Missing required report fields' });
      return;
    }

    const report = {
      commentId,
      postId,
      postSlug: postSlug || null,
      commentAuthor: commentAuthor || 'unknown',
      commentExcerpt: commentExcerpt || '',
      reason,
      reporterId: reporterId || null,
      reporterName: reporterName || 'anonymous',
      postTitle: postTitle || 'Untitled',
      receivedAt: new Date().toISOString(),
    };

    await sendWebhookNotification(report);

    res.status(200).json({ message: 'Report received', reportId: commentId });
  } catch (error) {
    console.error('[report-comment] Unexpected failure', error);
    res.status(500).json({ message: 'Failed to submit comment report' });
  }
};

export default handler;

