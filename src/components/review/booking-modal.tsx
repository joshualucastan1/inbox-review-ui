'use client';

import { useEffect, useState } from 'react';
import type { FreeSlot, FreeSlotsResponse } from '@/lib/types';

interface BookingModalProps {
  convId: string;
  email: string;
  name: string;
  persona: string;
  tz: string;
  onBook: (startIso: string, endIso: string) => Promise<void>;
  onLoadSlots: () => Promise<FreeSlotsResponse | null>;
  onClose: () => void;
}

export function BookingModal({
  email,
  name,
  tz,
  onBook,
  onLoadSlots,
  onClose,
}: BookingModalProps) {
  const [slots, setSlots] = useState<FreeSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoadSlots()
      .then((result) => {
        if (result?.slots) {
          setSlots(result.slots);
        } else {
          setError('Failed to load slots');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (slot: FreeSlot) => {
    if (!confirm(`Send invite for ${slot.local_label}?\n(Calendar event will be created + invite emailed; a confirmation note will be drafted in the Missive thread for you to review.)`)) {
      return;
    }
    onBook(slot.start_sgt, slot.end_sgt);
  };

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[88vh] w-full max-w-[600px] overflow-auto rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-2 flex items-baseline justify-between">
          <div>
            <strong>Book a slot for {name || email}</strong>{' '}
            <span className="text-zinc-500">&middot; {tz}</span>
          </div>
          <button onClick={onClose} className="text-xl text-zinc-500 hover:text-zinc-800">
            &times;
          </button>
        </div>
        <div className="mb-3 text-sm text-zinc-500">
          Picks a slot from Josh&apos;s calendar. Sends the invite + drafts a confirmation email in the same Missive thread (you review and send).
        </div>

        {loading && <div className="text-sm text-zinc-500">Loading availability&hellip;</div>}
        {error && <div className="text-sm text-red-600">Failed: {error}</div>}

        {slots && slots.length === 0 && (
          <div className="text-sm text-red-600">No free slots in next 7 business days</div>
        )}

        {slots && slots.length > 0 && (
          <div className="space-y-1">
            {slots.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-blue-100"
              >
                <span className="font-medium">
                  {s.local_label} ({s.tz})
                </span>
                <span className="ml-2 text-xs text-zinc-500">&middot; {s.sgt_label} SGT</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
