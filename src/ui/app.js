// relay-gateway — client-side behaviour. Deliberately tiny: copy buttons, the
// connect form, and the test send. No framework, no bundler, no CDN.

(() => {
  const showStatus = (element, kind, text) => {
    if (!element) return;
    element.className = `notice notice-${kind}`;
    element.textContent = text;
  };

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  };

  // Copy buttons.
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains('copy')) {
      const block = target.closest('.codeblock');
      const code = block?.querySelector('code');
      if (!code) return;
      copyText(code.innerText).then((ok) => {
        const previous = target.textContent;
        target.textContent = ok ? 'Copied' : 'Press ⌘C';
        setTimeout(() => {
          target.textContent = previous;
        }, 1400);
      });
      return;
    }

    const copyValue = target.getAttribute('data-copy-value');
    if (copyValue !== null && copyValue !== undefined) {
      copyText(copyValue).then((ok) => {
        const previous = target.textContent;
        target.textContent = ok ? 'Copied' : 'Press ⌘C';
        setTimeout(() => {
          target.textContent = previous;
        }, 1400);
      });
      return;
    }
  });

  // Add a sent message to the log without reloading the page.
  const appendLogRow = (text) => {
    const empty = document.querySelector('.empty');
    // The panel has to be captured before the empty state is detached.
    const panel = empty?.closest('.panel') ?? null;
    if (empty) empty.remove();
    let log = document.querySelector('.log');
    if (!log) {
      // The list was empty, so there is no container yet. Create one where the
      // empty state was.
      if (!panel) return;
      log = document.createElement('div');
      log.className = 'log';
      panel.append(log);
    }
    const row = document.createElement('div');
    row.className = 'log-row';
    const dir = document.createElement('div');
    dir.className = 'log-dir log-out';
    dir.textContent = 'outbound';
    const body = document.createElement('div');
    body.className = 'log-text';
    body.textContent = text;
    const time = document.createElement('div');
    time.className = 'log-time';
    time.textContent = `${new Date().toISOString().replace('T', ' ').slice(0, 19)}Z`;
    row.append(dir, body, time);
    log.prepend(row);
  };

  // Send a test message from the tenant page, without leaving the page.
  const sendForm = document.querySelector('[data-send-form]');
  if (sendForm) {
    sendForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const out = document.querySelector('[data-send-out]');
      const submit = sendForm.querySelector('button[type=submit]');
      if (submit) submit.setAttribute('disabled', 'disabled');
      if (out) {
        out.classList.remove('hidden');
        out.textContent = 'Sending…';
      }
      const payload = {
        chat_id: sendForm.querySelector('[name=chat_id]')?.value ?? '',
        text: sendForm.querySelector('[name=text]')?.value ?? '',
      };
      fetch(sendForm.getAttribute('action') ?? '', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
        .then((result) => {
          if (result.ok) {
            showStatus(out, 'ok', `Sent. Message id ${result.body?.data?.id ?? '—'}.`);
            appendLogRow(payload.text);
          } else {
            showStatus(out, 'error', result.body?.error?.message ?? 'Could not send.');
          }
          if (submit) submit.removeAttribute('disabled');
        })
        .catch(() => {
          showStatus(out, 'error', 'Could not reach the server.');
          if (submit) submit.removeAttribute('disabled');
        });
    });
  }

  // Username preview on the connect page.
  const username = document.querySelector('[data-username-input]');
  const preview = document.querySelector('[data-username-preview]');
  if (username && preview) {
    const update = () => {
      const value = username.value.replace(/^@/, '').replace(/\s+/g, '');
      preview.textContent = value ? `@${value}` : '@your_brand_bot';
    };
    username.addEventListener('input', update);
    update();
  }

  // Swap the form for the "you are connected" panel.
  const showConnected = (botUsername) => {
    const wrap = document.querySelector('[data-connect-form-wrap]');
    const done = document.querySelector('[data-connect-done]');
    if (wrap) wrap.classList.add('hidden');
    if (done) {
      done.classList.remove('hidden');
      const label = done.querySelector('[data-done-bot]');
      if (label && botUsername) label.textContent = `@${botUsername}`;
    }
    document.querySelectorAll('.stepper i').forEach((step) => {
      step.classList.add('on');
    });
  };

  // Connect form: submit over fetch, show the outcome inline.
  const form = document.querySelector('[data-connect-form]');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const status = document.querySelector('[data-connect-status]');
      const submit = form.querySelector('button[type=submit]');
      if (submit) submit.setAttribute('disabled', 'disabled');
      showStatus(status, 'info', 'Creating your bot…');

      const payload = {
        username: form.querySelector('[name=username]')?.value ?? '',
        display_name: form.querySelector('[name=display_name]')?.value ?? '',
      };

      fetch(form.getAttribute('action') ?? '', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
        .then((result) => {
          if (!result.ok) {
            showStatus(status, 'error', result.body?.error?.message ?? 'Something went wrong.');
            if (submit) submit.removeAttribute('disabled');
            return;
          }

          const data = result.body?.data ?? {};
          if (data.next_url) {
            if (status) {
              status.className = 'notice notice-ok';
              status.innerHTML =
                'Your bot is ready to be created. ' +
                `<a href="${data.next_url}" target="_blank" rel="noopener">Open Telegram →</a>`;
            }
            const open = document.querySelector('[data-open-telegram]');
            if (open) {
              open.setAttribute('href', data.next_url);
              open.classList.remove('hidden');
            }
            if (submit) {
              submit.textContent = 'Bot name chosen';
            }
            return;
          }

          showConnected(data.bot_username);
        })
        .catch(() => {
          showStatus(status, 'error', 'Could not reach the server. Try again.');
          if (submit) submit.removeAttribute('disabled');
        });
    });
  }

  // In live mode Telegram creates the bot after the customer leaves the page.
  // Poll the connect link until the platform has the token.
  const poll = document.querySelector('[data-connect-poll]');
  if (poll) {
    const url = poll.getAttribute('data-connect-poll');
    let tries = 0;
    const tick = () => {
      tries += 1;
      if (tries > 90) return;
      fetch(url, { headers: { accept: 'application/json' } })
        .then((response) => response.json())
        .then((body) => {
          const status = body?.data?.status;
          if (status === 'completed') {
            showConnected(body?.data?.bot_username);
            return;
          }
          setTimeout(tick, 2000);
        })
        .catch(() => setTimeout(tick, 4000));
    };
    setTimeout(tick, 2000);
  }
})();
