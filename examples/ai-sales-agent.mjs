/**
 * Dummy SalesShop Backend with AI Agent
 *
 * This demo backend connects to Relay Gateway, listens for incoming Telegram
 * messages from customers (like a sample user), checks the Customer Knowledge Base,
 * and replies automatically using an AI agent!
 *
 * Usage:
 *   node examples/ai-sales-agent.mjs
 *
 * Optional:
 *   export GEMINI_API_KEY="your-gemini-key"   # for live Gemini AI
 *   export OPENAI_API_KEY="your-openai-key"   # for live OpenAI GPT
 *   (If neither is set, an intelligent built-in knowledge matcher responds!)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';

// ── 1. Load config ─────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
}
loadEnv();

const RELAY_BASE_URL = process.env.RELAY_PUBLIC_URL || 'https://relay.example.com';
const RELAY_KEY = process.env.SALESSHOP_API_KEY || process.env.RELAY_ADMIN_KEY;
const TENANT_ID = process.env.SALESSHOP_TENANT_ID || 'tn_example_store_01';

if (!RELAY_KEY) {
  console.error('❌ Error: RELAY_KEY or RELAY_ADMIN_KEY is required in environment or .env');
  process.exit(1);
}

// ── 2. SalesShop Customer Knowledge Base ──────────────────────────────────

const KNOWLEDGE_BASE = {
  customer: {
    name: 'Sample User',
    chat_id: '0000000000',
    orders: [
      {
        order_id: 'SAMPLE-001',
        item: 'Apple iPhone 15 Pro Max (256GB, Natural Titanium)',
        price: '$1,199.00',
        status: 'Processing (sample order)',
        courier: 'Example Courier',
        tracking_number: 'SAMPLE-TRACKING',
        estimated_delivery: 'Sample delivery window',
        delivery_address: '123 Example Street, Example City',
      },
    ],
    loyalty_points: 340,
    vip_tier: 'Gold Member',
  },
  store: {
    name: 'Example Store',
    support_hours: 'Saturday – Thursday: 9:00 AM – 9:00 PM',
    return_policy: '7-day hassle-free replacement on manufacturer defects. Items must have original box.',
    warranty: '1-year official brand warranty on all electronics.',
    store_address: 'Example location',
    support_hotline: '+1-555-0100',
  },
};

// ── 3. The AI Agent Engine ────────────────────────────────────────────────

async function generateAIResponse(userText) {
  const systemPrompt = `You are the friendly, fast, and professional AI customer support assistant for "${KNOWLEDGE_BASE.store.name}" on Telegram.
You are chatting with customer: ${KNOWLEDGE_BASE.customer.name} (VIP Tier: ${KNOWLEDGE_BASE.customer.vip_tier}).

Use the following real-time store & order knowledge base to answer the customer:
${JSON.stringify(KNOWLEDGE_BASE, null, 2)}

Instructions:
1. Be concise, polite, and directly address the user's question.
2. If they ask about an order, tracking, or delivery, reference order #${KNOWLEDGE_BASE.customer.orders[0].order_id} and its DHL tracking number and ETA.
3. If they ask about returns or store location, provide the exact policy and hours from the knowledge base.
4. Keep the message friendly with appropriate emojis, under 3 short paragraphs.
5. If they say hi/hello, warmly greet them by name (${KNOWLEDGE_BASE.customer.name}) and offer help with their order or store questions.`;

  // Option A: Gemini AI
  if (process.env.GEMINI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nCustomer question: ${userText}` }] }],
          }),
        }
      );
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply.trim();
    } catch (err) {
      console.warn('⚠️ Gemini API error, using knowledge matcher:', err.message);
    }
  }

  // Option B: OpenAI GPT
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userText },
          ],
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply.trim();
    } catch (err) {
      console.warn('⚠️ OpenAI API error, using knowledge matcher:', err.message);
    }
  }

  // Option C: Built-in Intelligent Knowledge Matcher (Zero external API key needed!)
  const lower = userText.toLowerCase().trim();
  const order = KNOWLEDGE_BASE.customer.orders[0];

  if (lower.match(/\b(hi|hello|hey|start|assalamu|greetings)\b/)) {
    return `Hello ${KNOWLEDGE_BASE.customer.name}! 👋 Welcome to ${KNOWLEDGE_BASE.store.name}.\n\nHow can I help you today? You can ask me about your order status, delivery tracking, store hours, or return policies!`;
  }

  if (lower.match(/\b(order|track|tracking|status|where|iphone|package|delivery|ship|when)\b/)) {
    return `📦 *Order Update for #${order.order_id}*\n\n` +
      `• *Item:* ${order.item}\n` +
      `• *Status:* ${order.status}\n` +
      `• *Courier:* ${order.courier} (Tracking: \`${order.tracking_number}\`)\n` +
      `• *Estimated Arrival:* ${order.estimated_delivery}\n` +
      `• *Delivery Address:* ${order.delivery_address}\n\n` +
      `Let me know if you need to make any changes to your delivery! 🚚`;
  }

  if (lower.match(/\b(return|refund|exchange|warranty|policy)\b/)) {
    return `ℹ️ *Store Policies & Warranty:*\n\n` +
      `• *Return Policy:* ${KNOWLEDGE_BASE.store.return_policy}\n` +
      `• *Warranty:* ${KNOWLEDGE_BASE.store.warranty}\n\n` +
      `For any claim, simply share your order ID #${order.order_id} with our team!`;
  }

  if (lower.match(/\b(hour|time|open|close|address|location|phone|contact)\b/)) {
    return `📍 *SalesShop Contact & Location:*\n\n` +
      `• *Location:* ${KNOWLEDGE_BASE.store.store_address}\n` +
      `• *Hours:* ${KNOWLEDGE_BASE.store.support_hours}\n` +
      `• *Hotline:* ${KNOWLEDGE_BASE.store.support_phone}\n\n` +
      `Feel free to visit us or reach out during open hours!`;
  }

  return `Thanks for reaching out, ${KNOWLEDGE_BASE.customer.name}! 😊\n\nI can help you with:\n1️⃣ Live status of order #${order.order_id}\n2️⃣ Warranty & return policy\n3️⃣ Store hours & pickup location\n\nWhat would you like to know?`;
}

// ── 4. Message Dispatcher via Relay Gateway ───────────────────────────────

async function sendTelegramMessage(chatId, text) {
  const res = await fetch(`${RELAY_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RELAY_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenant_id: TENANT_ID,
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error?.message || 'Failed to dispatch message');
  }
  return json.data;
}

// ── 5. Continuous Listener / Poller ────────────────────────────────────────

const repliedMessageIds = new Set();

async function pollMessages() {
  try {
    const url = RELAY_KEY.startsWith('rg_admin_')
      ? `${RELAY_BASE_URL}/v1/tenants/${TENANT_ID}/messages?limit=20`
      : `${RELAY_BASE_URL}/v1/messages?limit=20`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${RELAY_KEY}` },
    });

    if (!res.ok) return;
    const json = await res.json();
    if (!json.ok || !Array.isArray(json.data)) return;

    // Process inbound messages from oldest to newest
    const inbounds = json.data
      .filter((m) => m.direction === 'inbound')
      .reverse();

    for (const msg of inbounds) {
      if (repliedMessageIds.has(msg.id)) continue;
      repliedMessageIds.add(msg.id);

      console.log(`\n📩 [Customer Message Received] Chat ID: ${msg.chat_id}`);
      console.log(`   Text: "${msg.text}"`);

      console.log(`🤖 [AI Agent] Consulting Knowledge Base & formulating response...`);
      const aiReply = await generateAIResponse(msg.text);

      console.log(`🚀 [Dispatching to Telegram via Relay Gateway]`);
      console.log(`   Reply:\n${aiReply.split('\n').map((l) => '   ' + l).join('\n')}`);

      await sendTelegramMessage(msg.chat_id, aiReply);
      console.log(`✅ [Sent successfully!]`);
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }
}

// ── 6. Webhook HTTP Server on Port 3000 ────────────────────────────────────

const PORT = Number(process.env.PORT) || 3000;

const webhookServer = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        console.log(`\n⚡ [Webhook Event Received]: ${payload.type || 'unknown'}`);
        if (payload.type === 'message.received' && payload.data) {
          const { message_id, chat_id, text } = payload.data;
          const msgId = message_id || payload.data.id;

          if (msgId && repliedMessageIds.has(msgId)) {
            console.log(`⏩ [Already processed message ${msgId}, skipping duplicate]`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, duplicate: true }));
            return;
          }
          if (msgId) repliedMessageIds.add(msgId);

          console.log(`📩 [Customer Message via Webhook] Chat ID: ${chat_id}`);
          console.log(`   Text: "${text}"`);

          console.log(`🤖 [AI Agent] Generating response...`);
          const aiReply = await generateAIResponse(text);

          console.log(`🚀 [Dispatching Reply to Telegram]`);
          await sendTelegramMessage(chat_id, aiReply);
          console.log(`✅ [Replied successfully!]`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error('Webhook error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'active',
      store: KNOWLEDGE_BASE.store.name,
      webhook_endpoint: `http://localhost:${PORT}/webhook`,
      tenant_id: TENANT_ID,
      connected_bot: '@sales_shopzz_bot',
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

webhookServer.listen(PORT, () => {
  console.log(`🌐 [Webhook Server] Listening on http://localhost:${PORT}/webhook`);
});

// ── 7. Start the Backend Loop ──────────────────────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('   🏪  SalesShop Dummy Backend + AI Agent is Running!      ');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`• Connected to Relay: ${RELAY_BASE_URL}`);
console.log(`• Tenant ID:         ${TENANT_ID}`);
console.log(`• Webhook Server:    http://localhost:${PORT}/webhook`);
console.log(`• Target Customer:   ${KNOWLEDGE_BASE.customer.name} (Chat ID: ${KNOWLEDGE_BASE.customer.chat_id})`);
console.log(`• Active Order:      ${KNOWLEDGE_BASE.customer.orders[0].order_id} (${KNOWLEDGE_BASE.customer.orders[0].item})`);
console.log('• Listening for customer Telegram messages via Webhook & Polling... (Press Ctrl+C to stop)\n');

// Seed existing message IDs so we only reply to new messages arriving from now
async function init() {
  try {
    const url = RELAY_KEY.startsWith('rg_admin_')
      ? `${RELAY_BASE_URL}/v1/tenants/${TENANT_ID}/messages?limit=50`
      : `${RELAY_BASE_URL}/v1/messages?limit=50`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${RELAY_KEY}` },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        for (const m of json.data) {
          repliedMessageIds.add(m.id);
        }
      }
    }
  } catch {}

  console.log(`Ready! Send any message to @sales_shopzz_bot on Telegram now to test!\n`);
  setInterval(pollMessages, 2500);
}

init();
