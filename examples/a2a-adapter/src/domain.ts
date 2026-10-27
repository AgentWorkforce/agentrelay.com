// arelay.to only delivers to A2A URLs that use HTTPS and sit on the verified
// domain or one of its subdomains. That applies to the agent card URL and to the
// service endpoint the card declares. These checks mirror the registry's, so a
// mistake fails here instead of at registration.

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.$/u, "");
}

export function hostBelongsToDomain(hostname: string, domain: string): boolean {
  const host = normalizeDomain(hostname);
  const verified = normalizeDomain(domain);
  return host === verified || host.endsWith(`.${verified}`);
}

/** Returns why `value` cannot be used as an A2A URL for `verifiedDomain`, or null if it can. */
export function a2aUrlProblem(label: string, value: string, verifiedDomain: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `${label} "${value}" is not a valid URL.`;
  }
  if (url.protocol !== "https:") {
    return `${label} "${value}" must use https://. arelay.to rejects any other scheme.`;
  }
  if (url.username || url.password) {
    return `${label} "${value}" must not contain a username or password.`;
  }
  if (url.hash) {
    return `${label} "${value}" must not contain a #fragment.`;
  }
  if (!hostBelongsToDomain(url.hostname, verifiedDomain)) {
    const domain = normalizeDomain(verifiedDomain);
    return `${label} host "${url.hostname}" is not ${domain} or a subdomain of it. `
      + `arelay.to requires the agent card and the endpoint it declares to both be on `
      + `your verified domain (for example https://agents.${domain}/...).`;
  }
  return null;
}
