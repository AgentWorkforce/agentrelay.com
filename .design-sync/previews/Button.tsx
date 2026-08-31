import { ArrowRight, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from 'web';

export function Variants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button>Start relaying</Button>
      <Button variant="secondary">View docs</Button>
      <Button variant="outline">Open dashboard</Button>
      <Button variant="inverted">Get started</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Delete workspace</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Add agent">
        <Plus />
      </Button>
    </div>
  );
}

export function WithIcons() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button>
        Spawn agent
        <ArrowRight />
      </Button>
      <Button variant="secondary">
        <Star />
        Star on GitHub
      </Button>
      <Button variant="destructive">
        <Trash2 />
        Remove node
      </Button>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button disabled>Deploying…</Button>
      <Button variant="secondary" disabled>
        View docs
      </Button>
      <Button variant="outline" disabled>
        Open dashboard
      </Button>
    </div>
  );
}
