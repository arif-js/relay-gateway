import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { badInput } from '../errors.js';

type ResolvedAddress = { address: string; family: number };
export type WebhookResolver = (hostname: string) => Promise<ResolvedAddress[]>;

const blockedIPv4 = new BlockList();
for (const [subnet, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedIPv4.addSubnet(subnet, prefix, 'ipv4');
}

const globalIPv6 = new BlockList();
globalIPv6.addSubnet('2000::', 3, 'ipv6');

const blockedIPv6 = new BlockList();
for (const [subnet, prefix] of [
  ['2001::', 23],
  ['2002::', 16],
  ['3fff::', 20],
] as const) {
  blockedIPv6.addSubnet(subnet, prefix, 'ipv6');
}

export function isPublicWebhookAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedIPv4.check(address, 'ipv4');
  if (family === 6) {
    return globalIPv6.check(address, 'ipv6') && !blockedIPv6.check(address, 'ipv6');
  }
  return false;
}

export function validateWebhookUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw badInput('That is not a valid URL');
  }
  if (url.protocol !== 'https:') {
    throw badInput('Webhook URLs must use HTTPS');
  }
  if (url.username || url.password) {
    throw badInput('Webhook URLs must not contain credentials');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    (isIP(hostname) !== 0 && !isPublicWebhookAddress(hostname))
  ) {
    throw badInput('Webhook URLs must use a publicly reachable host');
  }
  return url;
}

const resolveHost: WebhookResolver = async (hostname) =>
  lookup(hostname, { all: true, verbatim: true });

export async function resolvePublicWebhookAddress(
  hostname: string,
  resolver: WebhookResolver = resolveHost,
): Promise<ResolvedAddress> {
  const addresses = await resolver(hostname);
  if (
    addresses.length === 0 ||
    addresses.some(
      ({ address, family }) => family !== isIP(address) || !isPublicWebhookAddress(address),
    )
  ) {
    throw new Error('Webhook host did not resolve exclusively to public IP addresses');
  }
  const address = addresses[0];
  if (!address) throw new Error('Webhook host did not resolve to an address');
  return address;
}

export async function postWebhookEvent(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<number> {
  const target = validateWebhookUrl(url);
  const resolved = await resolvePublicWebhookAddress(target.hostname.replace(/^\[|\]$/g, ''));

  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      target,
      {
        method: 'POST',
        headers,
        lookup: (_hostname, _options, callback) => {
          callback(null, resolved.address, resolved.family);
        },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      },
    );
    request.setTimeout(10_000, () => request.destroy(new Error('Webhook request timed out')));
    request.on('error', reject);
    request.end(body);
  });
}
