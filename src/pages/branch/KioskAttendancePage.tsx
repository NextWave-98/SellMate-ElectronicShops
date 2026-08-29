/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FaceCaptureModal } from '@/components/attendance/FaceCaptureModal';
import { getOrCreateDeviceId } from '@/utils/deviceFingerprint';
import { getAccessToken } from '@/utils/tokenStorage';
import { createChallenge, kioskVerifyCheckInMultipart } from '@/services/attendanceBiometricService';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

export default function KioskAttendancePage() {
  const deviceFingerprint = getOrCreateDeviceId();
  const [staffId, setStaffId] = useState('');
  const [kioskId, setKioskId] = useState(localStorage.getItem('att_kiosk_id') || '');
  const [kioskSecret, setKioskSecret] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [livenessPrompt, setLivenessPrompt] = useState('blink');
  const [faceOpen, setFaceOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const reset = () => {
    setStaffId('');
    setStatus(null);
  };

  const startCheckIn = async () => {
    if (!staffId.trim() || !kioskId || !kioskSecret) {
      toast.error('Staff ID, kiosk ID and secret required');
      return;
    }
    localStorage.setItem('att_kiosk_id', kioskId);
    try {
      const res = await axios.post(
        `${BASE_URL}/attendance/biometric/kiosk/challenge`,
        { staffId, action: 'check_in', deviceFingerprint, kioskId, kioskSecret },
        { headers: { Authorization: `Bearer ${getAccessToken()}` }, withCredentials: true },
      );
      const ch = res.data?.data ?? res.data;
      setChallengeId(ch.challengeId);
      setChallengeToken(ch.challengeToken);
      setLivenessPrompt(ch.livenessPrompt);
      setFaceOpen(true);
    } catch (e: unknown) {
      toast.error('Kiosk challenge failed');
    }
  };

  const onCapture = async (blobs: Blob[]) => {
    await kioskVerifyCheckInMultipart({
      challengeId,
      challengeToken,
      deviceFingerprint,
      kioskId,
      kioskSecret,
      staffId,
    }, blobs);
    setStatus('Check-in successful');
    toast.success('Kiosk check-in complete');
    setTimeout(reset, 4000);
  };

  useEffect(() => {
    const t = setInterval(() => {
      if (!faceOpen) reset();
    }, 120000);
    return () => clearInterval(t);
  }, [faceOpen]);

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">Attendance Kiosk</h1>
      {status ? (
        <Card className="border-green-400">
          <CardContent className="py-12 text-center text-green-700 font-semibold text-xl">{status}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Staff check-in</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Staff UUID (from QR or search)</Label>
              <Input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Staff internal ID" />
            </div>
            <div>
              <Label>Kiosk ID</Label>
              <Input value={kioskId} onChange={(e) => setKioskId(e.target.value)} />
            </div>
            <div>
              <Label>Kiosk secret</Label>
              <Input type="password" value={kioskSecret} onChange={(e) => setKioskSecret(e.target.value)} />
            </div>
            <Button className="w-full" size="lg" onClick={startCheckIn}>Start face check-in</Button>
          </CardContent>
        </Card>
      )}
      <FaceCaptureModal
        open={faceOpen}
        onClose={() => setFaceOpen(false)}
        livenessPrompt={livenessPrompt}
        onCapture={onCapture}
        title="Kiosk face check-in"
      />
    </div>
  );
}
