interface HighIntentLeadPayload {
  email?: string | null;
  company?: string | null;
  intentScore: number;
  summary: string;
  agentName?: string;
  dashboardUrl: string;
}

/**
 * Sends a structured Block Kit card to a Slack incoming webhook channel
 */
export async function sendHighIntentSlackAlert(
  webhookUrl: string,
  payload: HighIntentLeadPayload
) {
  const { email, company, intentScore, summary, agentName, dashboardUrl } = payload;

  // Build Slack Block Kit layout
  const slackBlocks = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔥 High-Intent Lead Detected!',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Lead Contact:*\n${email ? `\`${email}\`` : '_Anonymous Visitor_'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Company:*\n${company || '_Unknown_'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Intent Score:*\n\`${intentScore}/100\` ⚡`,
          },
          {
            type: 'mrkdwn',
            text: `*Agent:*\n${agentName || 'Default Sales AI'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AI Conversation Summary:*\n>${summary}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Inspect Live Transcript 💬',
              emoji: true,
            },
            url: dashboardUrl,
            style: 'primary',
          },
        ],
      },
      {
        type: 'divider',
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackBlocks),
    });

    if (!res.ok) {
      console.error(`Slack webhook error: ${res.statusText}`);
    }
  } catch (error) {
    console.error('Failed to trigger Slack notification:', error);
  }
}
