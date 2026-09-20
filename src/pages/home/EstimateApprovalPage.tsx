/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

/**
 * PUBLIC page   customers open this from the SMS/WhatsApp link to
 * approve or reject a repair estimate. Secured by the secret token
 * in the URL; no login required.
 */
export default function EstimateApprovalPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [estimate, setEstimate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BASE_URL}/public/estimates/${id}?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Estimate not found');
        setEstimate(json.data);
        if (json.data?.status === 'APPROVED' || json.data?.status === 'REJECTED') {
          setDone(json.data.status);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    if (id && token) load();
    else { setError('Invalid link'); setLoading(false); }
  }, [id, token]);

  const respond = async (action: 'APPROVE' | 'REJECT') => {
    setResponding(true);
    try {
      const res = await fetch(`${BASE_URL}/public/estimates/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to submit response');
      setDone(json.data?.status || (action === 'APPROVE' ? 'APPROVED' : 'REJECTED'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold">Repair Estimate Approval</h1>
          </div>

          {loading && <p className="text-center text-gray-500 py-8">Loading estimate…</p>}

          {error && !loading && (
            <p className="text-center text-red-600 py-8">{error}</p>
          )}

          {estimate && !error && (
            <>
              <p className="text-sm text-gray-500 mb-1">Estimate {estimate.estimateNumber}</p>
              <p className="font-semibold mb-3">
                {estimate.vehicle ? `${estimate.vehicle.make} ${estimate.vehicle.model}   ${estimate.vehicle.registrationNo}` : ''}
              </p>
              {estimate.customerComplaints && (
                <p className="text-sm mb-3 bg-gray-100 rounded-md p-2">Reported issue: {estimate.customerComplaints}</p>
              )}

              <table className="w-full text-sm mb-3">
                <tbody>
                  {(estimate.items ?? []).map((i: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="py-1.5">{i.description}</td>
                      <td className="py-1.5 text-right whitespace-nowrap">Rs {Number(i.lineTotal).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2">TOTAL</td>
                    <td className="py-2 text-right">Rs {Number(estimate.totalAmount).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {done ? (
                <div className={`flex items-center justify-center gap-2 py-4 rounded-md ${done === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {done === 'APPROVED' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="font-semibold">
                    {done === 'APPROVED' ? 'Estimate approved   thank you! We will start the work.' : 'Estimate rejected. Please contact us for changes.'}
                  </span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={responding} onClick={() => respond('APPROVE')}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" className="flex-1" disabled={responding} onClick={() => respond('REJECT')}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
