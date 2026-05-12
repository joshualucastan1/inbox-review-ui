'use client';

import { Clock, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ToolbarProps {
  stateFilter: string;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
  onSentHistory: () => void;
}

export function Toolbar({
  stateFilter,
  onFilterChange,
  onRefresh,
  onSentHistory,
}: ToolbarProps) {
  return (
    <section
      className="flex items-center gap-2 border-b border-border bg-muted/40 px-6 py-2.5"
      aria-label="Queue filters"
    >
      <label className="text-xs text-muted-foreground">Queue</label>
      <Select
        value={stateFilter || '_all'}
        onValueChange={(v) => onFilterChange(!v || v === '_all' ? '' : v)}
      >
        <SelectTrigger className="h-8 w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Active review</SelectItem>
          <SelectItem value="drafted">Drafted</SelectItem>
          <SelectItem value="needs_josh">Needs Josh</SelectItem>
          <SelectItem value="awaiting_send">Awaiting send</SelectItem>
          <SelectItem value="nudge_due">Nudge due</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="mr-1 h-3.5 w-3.5" />
        Refresh
      </Button>
      <Button variant="outline" size="sm" onClick={onSentHistory}>
        <Clock className="mr-1 h-3.5 w-3.5" />
        Sent history
      </Button>
    </section>
  );
}
