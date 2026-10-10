/**
 * Code-owned capability implementations, independent of catalog-supplied receipts.
 * A replacement implementation requires review of this contract, not a catalog edit.
 */
export const FLOW_PLUGIN_IMPLEMENTATION_PULL_REQUESTS = Object.freeze({
  'cloud-babysitter-capability-adapter': 'https://github.com/AgentWorkforce/cloud/pull/3989',
  // No production owner PR exists yet. Null deliberately makes deployment evidence inadmissible.
  'relay-hosted-flow-extension-execution': null,
  'relay-native-existing-session-delivery': 'https://github.com/AgentWorkforce/relay/pull/1851',
});
