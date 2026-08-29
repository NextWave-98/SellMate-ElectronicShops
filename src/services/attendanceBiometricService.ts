import axios from 'axios';
import { getAccessToken } from '../utils/tokenStorage';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface BiometricPolicy {
  enabled: boolean;
  enforceCheckIn: boolean;
  enforceCheckOut: boolean;
  maxRetries: number;
}

export interface VerificationChallenge {
  challengeId: string;
  challengeToken: string;
  livenessPrompt: string;
  expiresAt: string;
}

export async function getBiometricPolicy(): Promise<BiometricPolicy> {
  const res = await axios.get(`${BASE_URL}/attendance/biometric/my-policy`, {
    headers: authHeaders(),
    withCredentials: true,
  });
  return res.data?.data ?? res.data;
}

export async function createChallenge(
  action: 'check_in' | 'check_out',
  deviceFingerprint: string,
): Promise<VerificationChallenge> {
  const res = await axios.post(
    `${BASE_URL}/attendance/biometric/challenge`,
    { action, deviceFingerprint },
    { headers: authHeaders(), withCredentials: true },
  );
  return res.data?.data ?? res.data;
}

export async function verifyCheckInMultipart(
  fields: Record<string, string>,
  frameBlobs: Blob[],
): Promise<unknown> {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  frameBlobs.forEach((blob) => form.append('frames', blob, 'frame.jpg'));

  const res = await axios.post(`${BASE_URL}/attendance/biometric/verify-check-in`, form, {
    headers: authHeaders(),
    withCredentials: true,
  });
  return res.data;
}

export async function verifyCheckOutMultipart(
  fields: Record<string, string>,
  frameBlobs: Blob[],
): Promise<unknown> {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  frameBlobs.forEach((blob) => form.append('frames', blob, 'frame.jpg'));

  const res = await axios.post(`${BASE_URL}/attendance/biometric/verify-check-out`, form, {
    headers: authHeaders(),
    withCredentials: true,
  });
  return res.data;
}

export async function submitPinFallback(body: {
  action: 'check_in' | 'check_out';
  pin: string;
  deviceFingerprint: string;
  reason?: string;
}): Promise<unknown> {
  const res = await axios.post(`${BASE_URL}/attendance/biometric/pin-fallback`, body, {
    headers: authHeaders(),
    withCredentials: true,
  });
  return res.data;
}

export async function kioskVerifyCheckInMultipart(
  fields: Record<string, string>,
  frameBlobs: Blob[],
): Promise<unknown> {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  frameBlobs.forEach((blob) => form.append('frames', blob, 'frame.jpg'));

  const res = await axios.post(`${BASE_URL}/attendance/biometric/kiosk/verify-check-in`, form, {
    headers: authHeaders(),
    withCredentials: true,
  });
  return res.data;
}

export async function enrollStaffFace(staffId: string, frameBlobs: Blob[]): Promise<unknown> {
  const form = new FormData();
  form.append('consent', 'true');
  frameBlobs.forEach((blob) => form.append('frames', blob, 'enroll.jpg'));
  const res = await axios.post(`${BASE_URL}/attendance/biometric/staff/${staffId}/enroll`, form, {
    headers: authHeaders(),
    withCredentials: true,
  });
  return res.data;
}
