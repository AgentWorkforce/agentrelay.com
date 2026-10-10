/**
 * Mirrors the sign-in button's pending state (`detail`), so the showcase rushes
 * its pulses toward the form during the hand-off and settles when it ends.
 */
export const RELAY_RUSH_EVENT = 'agentrelay:sign-in-rush';

export type RelayRushEvent = CustomEvent<boolean>;
