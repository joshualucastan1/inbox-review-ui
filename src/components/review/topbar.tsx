'use client';

import { type FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TopbarProps {
  apiKey: string;
  status: string;
  onConnect: (key: string) => void;
}

export function Topbar({ apiKey, status, onConnect }: TopbarProps) {
  const [keyInput, setKeyInput] = useState(apiKey);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onConnect(keyInput.trim());
  };

  return (
    <header className="flex items-center justify-between gap-6 border-b border-border bg-background px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold">Inbox Review</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{status}</p>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label
          htmlFor="api-key"
          className="text-xs text-muted-foreground shrink-0"
        >
          <KeyRound className="inline mr-1 h-3.5 w-3.5" />
          API key
        </label>
        <Input
          id="api-key"
          type="password"
          autoComplete="off"
          className="h-8 w-48"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
        />
        <Button type="submit" size="sm">
          Connect
        </Button>
      </form>
    </header>
  );
}
