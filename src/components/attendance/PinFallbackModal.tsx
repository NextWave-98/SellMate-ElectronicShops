import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PinFallbackModalProps {
  open: boolean;
  onClose: () => void;
  action: 'check_in' | 'check_out';
  onSubmit: (pin: string, reason: string) => Promise<void>;
}

export function PinFallbackModal({ open, onClose, action, onSubmit }: PinFallbackModalProps) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!/^\d{4,6}$/.test(pin)) return;
    setLoading(true);
    try {
      await onSubmit(pin, reason);
      setPin('');
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>PIN fallback   manager approval required</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">
          Face verification failed. Enter your attendance PIN. Your {action === 'check_in' ? 'check-in' : 'check-out'}
          will be sent to a manager for approval.
        </p>
        <div className="space-y-3">
          <div>
            <Label>PIN (4–6 digits)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || pin.length < 4}>
            {loading ? 'Submitting…' : 'Request approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
