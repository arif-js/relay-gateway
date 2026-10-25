[ Relay Gateway ](/) [Overview](/)[Docs](/docs)[Pricing](/pricing)[Dashboard](/dashboard)

* * *

Telegram infrastructure for developers

# Add Telegram to your product.  
In an afternoon.

Relay Gateway is the layer between your product and Telegram. It handles the multi-tenant machinery — onboarding, keys, isolation, quotas, logs, webhooks, rate limits — so you can add one API call to your app and your customers get their own Telegram sender, in their own name, that they own and can revoke. 

[Read the API reference](/docs) [Open the console](/dashboard)

What you get

## The work we do, so you do not have to.

Sending a message over Telegram's API takes one HTTP request. Running Telegram for a hundred customers takes considerably more. That is the part we built. 

### One API for every customer

Each of your customers is a tenant with its own scoped key. Create one, and you get a key that can never read or write another tenant's data. We enforce the isolation. 

### Onboarding that does not leak credentials

You send them a link. They pick a bot name; Telegram creates the bot for them. We fetch the token through Telegram's own managed-bot flow, so no customer ever pastes a credential into your product, and neither do you. 

### Your customer keeps their sender

The bot is theirs. Their name, their control, revocable by them at any time. You are the infrastructure, not the sender — and you do not inherit the reputation of somebody else's message. 

### Events, not polling

Register a URL and we push every send, failure and connection event to it, signed with an HMAC. You get a message log for every tenant without writing a line of bookkeeping. 

### Rate limits handled

Telegram throttles hard: about 30 messages a second across the platform, one per second per chat, and 429s with a retry delay. We hold one shared limiter, we sleep exactly as long as Telegram says, and your bot does not get muted. 

### Secrets handled

Bot tokens are encrypted at rest, write-only, and never returned by any endpoint. API keys are stored hashed. You never handle a customer credential, and you never store one in plain text. 

### A console

Tenants, their connection state, the connect link to send them, the message log, and a panel for sending a test message. Built in, not something you have to write. 

### Usable by your agents

The same operations are MCP tools, so Claude Code or Cursor can read a thread and send on a tenant's behalf. No second integration to build. 

### Yours to self-host

One process, one database file, one command to run. AGPL-3.0, so if you run a modified version as a service, you publish the change and your users keep their data. 

Who does what

## Telegram creates the bot. We do everything else.

The division of labour matters, because the part Telegram does is the part you cannot do yourself, and the parts we do are the parts you would otherwise spend a month on. 

### Telegram does

Creates the bot in your customer's name, holds the authoritative copy of it, delivers the messages, and enforces the rate limits. We do not replace any of that. 

### Relay Gateway does

Tenants and scoped keys. The connect flow. Fetching and encrypting the token. Isolation, quotas, usage. Message logs. Signed webhooks. Rate limiting. The console. The MCP server. 

### You do

Call one API. That is the whole integration. 
```
 
    L0  Telegram            creates the bot, delivers the messages, sets the limits.
    
    L1  Relay Gateway       this platform. tenants, keys, connect flow, logs,
                             webhooks, quotas, rate limiting, console, MCP.
    
    L2  The SaaS vendor     deploys Relay Gateway. calls our API.
          └─ their customer  "Acme Software" ships Telegram in its product
    
    L3  The tenant          L2's customer. a business.
          └─ their customer  "Sara's phone shop" connects its own bot
    
    L4  The end user        the person who receives the message.
                             never sees this platform.

```

The flow

## Five steps, then you are sending.

### Create a tenant

One API call gives you a tenant and its tenant-scoped key. The key can never touch another tenant's data. 

### Mint a connect link

A hosted page your customer opens. It expires in seven days and can be re-shared from the console. 

### They pick a bot name

We hand back a t.me/newbot deep link. Telegram does the creating; we never ask for a token. 

### We fetch the token and seal it

A managed_bot update arrives; we ask Telegram for the token, encrypt it, and mark the tenant connected. Your customer sees their bot appear in Telegram. 

### You send

One call per message. We handle the rate limiting, write the log, and push the event to your webhook. 

Try it

## Two calls and a message.

Copy
```
 
    # 1. create a tenant — we hand you its scoped key
    curl -X POST https://relay.example.com/v1/tenants \
      -H "Authorization: Bearer $RELAY_ADMIN_KEY" \
      -H "content-type: application/json" \
      -d '{"name":"Sara'"'"'s Phone Shop"}'
    
    # 2. mint a connect link, send it to Sara
    curl -X POST https://relay.example.com/v1/tenants/$TENANT_ID/connect-links \
      -H "Authorization: Bearer $RELAY_ADMIN_KEY"
    
    # 3. send a message as Sara'"'"'s bot
    curl -X POST https://relay.example.com/v1/messages \
      -H "Authorization: Bearer $TENANT_KEY" \
      -H "content-type: application/json" \
      -d '{"chat_id":15551234567,"text":"Your order #412 ships tomorrow."}'

```

The full reference, including webhooks and the MCP tools, is on the [docs page](/docs). The source is AGPL-3.0: self-host it, or let us run it. 

What it does not do

## Read this before you build on it.

### A bot can only message people who wrote to it first

That is Telegram's rule, not ours. A tenant's bot can answer the customers who started a chat with it, and cannot cold-broadcast to the rest of the world. 

### Campaigns are slow by design

About 30 messages a second across the platform, one per second per chat, and Telegram asks you to spread a large send over hours. We enforce the limit so you do not get throttled. 

### The sender is a bot, not their personal account

Telegram also lets a bot reply as a business account, but only within 24 hours of an incoming message, so it cannot run campaigns. It is on the roadmap, not in this release. 

### Your customers see a bot

The bot is in their name and their control, but it is still labelled a bot. If you need a message to look like it came from a person, that is a different product. 

AGPL-3.0 · self-host it, or let us run it. Free for now.

[API reference](/docs) · [Pricing](/pricing) · [Health](/healthz)