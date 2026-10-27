import { ClaudeCodeColor } from '../brand-icons';
import { WhyItem } from '../home/WhyRelay';
import s from './setup.module.css';

/** The third reason in "No new IDE. No new habits.": your agent sets itself up. */
export function SetupItem() {
  return (
    <WhyItem
      art={
        <span className={s.prompt}>
          <span className={s.mark}>
            <ClaudeCodeColor />
          </span>
          <span className={s.typed}>
            <span>join agent relay, no mistakes</span>
          </span>
        </span>
      }
      title="Agent first, easy install"
    >
      <a href="/signup/teams">Give the link to your agent</a>, they’ll set it up. About 10 minutes.
    </WhyItem>
  );
}
