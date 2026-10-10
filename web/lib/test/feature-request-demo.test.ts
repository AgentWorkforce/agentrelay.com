import { describe, expect, it } from 'vitest';
import {
  CANVAS_WIDTH, NODE_WIDTH, workflowCameraTarget, workflowChapters,
  workflowEdges, workflowNodes, workflowPhases,
} from '../feature-request-demo';

const byPhase = (name: string) => workflowPhases.find((phase) => phase.name === name)!;

describe('feature request animation', () => {
  it('connects every animated route to existing nodes and coherent states', () => {
    const ids = workflowNodes.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(workflowEdges.map((edge) => edge.id)).size).toBe(workflowEdges.length);
    for (const edge of workflowEdges) {
      expect(ids).toContain(edge.from);
      expect(ids).toContain(edge.to);
    }
    for (const phase of workflowPhases) {
      expect(phase.duration).toBeGreaterThan(0);
      for (const id of [...phase.active, ...phase.done, ...(phase.failed ?? [])]) expect(ids).toContain(id);
      expect(phase.active.filter((id) => phase.done.includes(id))).toEqual([]);
      for (const id of phase.routes) expect(workflowEdges.some((edge) => edge.id === id)).toBe(true);
    }
    expect(workflowChapters.every((chapter) => chapter.index >= 0)).toBe(true);
  });

  it('keeps implementation locked until both research branches satisfy the priority gate', () => {
    expect(byPhase('research').active).toEqual(['competitors', 'retention']);
    expect(byPhase('more-evidence').routes).toEqual(['deepen-research', 'deepen-risk']);
    expect(byPhase('more-evidence').priorityPassed).toBe(false);
    expect(byPhase('priority-recheck').done).toEqual(expect.arrayContaining(['competitors', 'retention']));
    expect(byPhase('priority-recheck').priorityPassed).toBe(false);
    expect(byPhase('priority-passed').priorityPassed).toBe(true);
    for (const phase of workflowPhases.filter((item) => !item.priorityPassed)) {
      expect(phase.active).not.toContain('frontend');
      expect(phase.active).not.toContain('backend');
      expect(phase.routes).not.toContain('build-ui');
      expect(phase.routes).not.toContain('build-auth');
    }
  });

  it('actually traverses backwards for revisions and repeats review after failed tests', () => {
    for (const name of ['revise', 'revise-again', 'fix-test']) {
      const phase = byPhase(name);
      expect(phase.routes.length).toBeGreaterThan(0);
      for (const id of phase.routes) {
        const edge = workflowEdges.find((item) => item.id === id)!;
        expect(edge.loop).toBe(true);
        expect(workflowNodes.find((node) => node.id === edge.to)!.x)
          .toBeLessThan(workflowNodes.find((node) => node.id === edge.from)!.x);
      }
      expect(phase.testsPassed).toBe(false);
    }
    expect(byPhase('revise').revision).toBe(1);
    expect(byPhase('revise-again').revision).toBe(2);
    expect(byPhase('test-failed').failed).toEqual(['tests']);
    expect(byPhase('review-fix').active).toEqual(['backend-review']);
    expect(byPhase('retest').done).toEqual(expect.arrayContaining(['frontend-review', 'backend-review']));
    for (const phase of workflowPhases.filter((item) => !item.testsPassed)) {
      expect(phase.routes).not.toContain('feature-ready');
      expect(phase.active).not.toContain('email-agent');
      expect(phase.active).not.toContain('crm-agent');
    }
  });

  it('hands off each coding branch independently while its peer keeps working', () => {
    expect(byPhase('ui-ready').done).toContain('frontend');
    expect(byPhase('ui-ready').active).toEqual(['backend', 'frontend-review']);
    expect(byPhase('ui-ready').routes).toEqual(['review-ui']);
    expect(byPhase('auth-revision-ready').done).toContain('backend');
    expect(byPhase('auth-revision-ready').active).toEqual(['frontend', 'backend-review']);
    expect(byPhase('auth-revision-ready').routes).toEqual(['review-auth']);
    expect(byPhase('auth-review-ready').done).toContain('backend-review');
    expect(byPhase('auth-review-ready').active).toEqual(['frontend-review']);
    expect(byPhase('ui-review-ready').done).toContain('frontend-review');
    expect(byPhase('ui-review-ready').active).toEqual(['backend-review']);
    for (const phase of workflowPhases) {
      if (phase.active.includes('frontend-review')) expect(phase.done).toContain('frontend');
      if (phase.active.includes('backend-review')) expect(phase.done).toContain('backend');
      if (phase.active.includes('tests')) expect(phase.done).toEqual(expect.arrayContaining(['frontend-review', 'backend-review']));
    }
  });

  it('joins both Claude updates directly into Slack after both finish', () => {
    expect(byPhase('notify').active).toEqual(['crm-agent', 'email-agent']);
    for (const id of byPhase('notify').active) expect(workflowNodes.find((node) => node.id === id)!.icon).toBe('claude');
    expect(byPhase('notify').khaliqApproved).toBe(true);
    expect(byPhase('waiting-for-email').done).toContain('crm-updated');
    expect(byPhase('waiting-for-email').done).not.toContain('email-sent');
    expect(byPhase('waiting-for-email').updatesPassed).toBe(false);
    expect(byPhase('send-slack').routes).toEqual(['crm-ready', 'email-ready']);
    expect(byPhase('send-slack').updatesPassed).toBe(true);
    expect(workflowEdges.filter((edge) => edge.to === 'slack-sent').map((edge) => edge.from)).toEqual(['crm-updated', 'email-sent']);
    for (const phase of workflowPhases) {
      if (phase.active.includes('slack-sent')) {
        expect(phase.done).toEqual(expect.arrayContaining(['crm-updated', 'email-sent']));
        expect(phase.updatesPassed).toBe(true);
      }
    }
    expect(byPhase('complete').done).toHaveLength(workflowNodes.length);
  });

  it('routes Will’s question back to Codex and requests approval again after revision', () => {
    const question = byPhase('will-question');
    const revision = byPhase('revise-priority');
    const reapproval = byPhase('will-reapproval');
    expect(question.feedback?.question).toMatch(/renewal\?/);
    expect(revision.feedback?.question).toBe(question.feedback?.question);
    expect(revision.active).toEqual(['priority']);
    expect(revision.priorityPassed).toBe(false);
    expect(revision.routes).toEqual(['will-revision']);
    expect(workflowEdges.find((edge) => edge.id === 'will-revision')).toMatchObject({ from: 'will-approval', to: 'priority', loop: true });
    expect(reapproval.feedback?.answer).toBe(revision.feedback?.answer);
    expect(reapproval.routes).toEqual(['request-will']);
    expect(reapproval.priorityPassed).toBe(true);
    expect(reapproval.willApproved).toBe(false);
    expect(workflowPhases.indexOf(reapproval)).toBeLessThan(workflowPhases.indexOf(byPhase('will-approved')));
  });

  it('requires Will before implementation and Khaliq after tests before continuing', () => {
    expect(byPhase('will-approval').active).toEqual(['will-approval']);
    expect(byPhase('will-approval').done).not.toContain('will-approval');
    expect(byPhase('will-approval').priorityPassed).toBe(true);
    expect(byPhase('will-approval').willApproved).toBe(false);
    expect(byPhase('will-approved').willApproved).toBe(true);
    expect(byPhase('khaliq-approval').active).toEqual(['khaliq-approval']);
    expect(byPhase('khaliq-approval').done).not.toContain('khaliq-approval');
    expect(byPhase('khaliq-approval').testsPassed).toBe(true);
    expect(byPhase('khaliq-approval').khaliqApproved).toBe(false);
    expect(byPhase('khaliq-approved').khaliqApproved).toBe(true);
    for (const phase of workflowPhases) {
      if (!phase.willApproved) {
        expect(phase.active).not.toContain('frontend');
        expect(phase.active).not.toContain('backend');
        expect(phase.routes).not.toContain('build-ui');
        expect(phase.routes).not.toContain('build-auth');
      }
      if (!phase.khaliqApproved) {
        expect(phase.routes).not.toContain('draft-crm');
        expect(phase.routes).not.toContain('draft-email');
        expect(phase.active).not.toContain('email-agent');
        expect(phase.active).not.toContain('crm-agent');
      }
    }
    expect(workflowEdges.find((edge) => edge.id === 'build-ui')!.from).toBe('will-approval');
    expect(workflowEdges.find((edge) => edge.id === 'build-auth')!.from).toBe('will-approval');
    expect(workflowEdges.find((edge) => edge.id === 'request-khaliq')!.from).toBe('feature');
    expect(byPhase('khaliq-approval').done).toEqual(expect.arrayContaining(['feature', 'frontend-review', 'backend-review', 'tests']));
    expect(workflowPhases.indexOf(byPhase('feature-ready'))).toBeLessThan(workflowPhases.indexOf(byPhase('khaliq-approval')));
    expect(workflowNodes.find((node) => node.id === 'will-approval')).toMatchObject({
      action: 'Get approval from Will', photo: '/authors/will.png', gate: true,
    });
    expect(workflowNodes.find((node) => node.id === 'khaliq-approval')).toMatchObject({
      action: 'Get approval from Khaliq', photo: '/authors/khaliq.jpeg', gate: true,
    });
  });

  it('keeps the focused node inside the frame at mobile and desktop sizes', () => {
    for (const width of [266, 320, 545, 800]) {
      for (const [index, phase] of workflowPhases.entries()) {
        const offset = workflowCameraTarget(index, width);
        const node = workflowNodes.find((item) => item.id === phase.focus)!;
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(CANVAS_WIDTH - width);
        expect(node.x - offset).toBeGreaterThanOrEqual(0);
        expect(node.x + NODE_WIDTH - offset).toBeLessThanOrEqual(width);
      }
    }
  });
});
