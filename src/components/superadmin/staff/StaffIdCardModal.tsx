import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StaffIdCardData {
  mode: 'qr-only' | 'id-card';
  qrToken: string;
  qrPayload: string;
  expiresIn: string;
  qrImageDataUrl: string;
  organization?: {
    name: string;
    logo: string | null;
  };
  staff: {
    userId: string;
    staffId: string;
    name: string;
    email: string;
    roleName: string;
    locationName: string;
    locationCode: string | null;
    phoneNumber: string | null;
    profileImage: string | null;
  };
}

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  const first = parts[0]?.charAt(0) || '';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
};

interface StaffIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StaffIdCardData | null;
}

const createPrintHtml = (data: StaffIdCardData) => {
  const isQrOnly = data.mode === 'qr-only';
  const initials = getInitials(data.staff.name);
  const orgName = data.organization?.name || 'Organization';
  const orgLogo = data.organization?.logo;

  return `
    <html>
      <head>
        <title>Staff ID Card</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #1f2937; }
          .card { width: 340px; margin: 0 auto; border: 2px solid #1d4ed8; border-radius: 14px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1d4ed8, #3b82f6); color: #fff; padding: 16px 18px; text-align: center; }
          .org-logo { width: 42px; height: 42px; object-fit: cover; border-radius: 9999px; border: 2px solid rgba(255,255,255,0.7); display: block; margin: 0 auto 8px; background: #fff; }
          .org-name { margin: 0; font-size: 16px; font-weight: 700; }
          .content { padding: 18px; }
          .avatar { width: 88px; height: 88px; border-radius: 9999px; border: 3px solid #1d4ed8; object-fit: cover; display:block; margin: 0 auto 12px; }
          .avatar-fallback { width: 88px; height: 88px; border-radius: 9999px; border: 3px solid #1d4ed8; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 700; color: #1d4ed8; background: #eff6ff; }
          .name { font-size: 22px; margin: 8px 0 4px; font-weight: 700; text-align: center; }
          .role { font-size: 14px; color: #1d4ed8; text-align: center; margin: 0 0 14px; font-weight: 700; }
          .row { margin: 6px 0; font-size: 13px; }
          .label { color: #6b7280; margin-right: 6px; }
          .qr { display:block; margin: 16px auto 8px; width: 140px; height: 140px; }
          .footer { text-align:center; font-size: 11px; color: #6b7280; margin-top: 8px; }
          .qr-only { text-align:center; }
          .qr-only .qr { width: 220px; height: 220px; margin-top: 8px; }
        </style>
      </head>
      <body>
        ${
          isQrOnly
            ? `<div class="qr-only"><h2>Staff QR Login</h2><img class="qr" src="${data.qrImageDataUrl}" alt="Staff QR" /><p><strong>${data.staff.name}</strong> (${data.staff.staffId})</p><p>${orgName}</p><p>Valid for ${data.expiresIn}</p></div>`
            : `<div class="card"><div class="header">${orgLogo ? `<img class="org-logo" src="${orgLogo}" alt="Organization Logo" />` : ''}<p class="org-name">${orgName}</p></div><div class="content">${data.staff.profileImage ? `<img class="avatar" src="${data.staff.profileImage}" alt="Staff" />` : `<div class="avatar-fallback">${initials}</div>`}<p class="name">${data.staff.name}</p><p class="role">${data.staff.roleName}</p><div class="row"><span class="label">ID:</span>${data.staff.staffId}</div><div class="row"><span class="label">Email:</span>${data.staff.email}</div><div class="row"><span class="label">Phone:</span>${data.staff.phoneNumber || 'N/A'}</div><div class="row"><span class="label">Location:</span>${data.staff.locationName}</div><img class="qr" src="${data.qrImageDataUrl}" alt="Staff QR" /><p class="footer">QR login token valid for ${data.expiresIn}</p></div></div>`
        }
      </body>
    </html>
  `;
};

export default function StaffIdCardModal({ isOpen, onClose, data }: StaffIdCardModalProps) {
  if (!data) return null;
  const initials = getInitials(data.staff.name);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=520,height=780');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(createPrintHtml(data));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = data.qrImageDataUrl;
    link.download = `${data.staff.staffId}-qr.png`;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {data.mode === 'qr-only' ? 'Staff QR Code' : 'Staff ID Card + QR'}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-blue-200 overflow-hidden bg-white">
          {data.mode === 'id-card' && (
            <div className="bg-linear-to-r from-blue-700 to-blue-500 text-white px-4 py-3 text-center font-semibold">
              {data.organization?.logo && (
                <img
                  src={data.organization.logo}
                  alt="Organization Logo"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/70 mx-auto mb-2 bg-white"
                />
              )}
              <div>{data.organization?.name || 'Organization'}</div>
            </div>
          )}

          <div className="p-4">
            {data.mode === 'id-card' && (
              <>
                {data.staff.profileImage ? (
                  <img
                    src={data.staff.profileImage}
                    alt={data.staff.name}
                    className="w-20 h-20 rounded-full border-4 border-blue-600 object-cover mx-auto mb-3"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-blue-600 bg-blue-50 text-blue-700 text-2xl font-bold flex items-center justify-center mx-auto mb-3">
                    {initials}
                  </div>
                )}
                <h3 className="text-xl font-bold text-center text-gray-900">{data.staff.name}</h3>
                <p className="text-sm text-blue-700 font-semibold text-center mb-3">{data.staff.roleName}</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><span className="text-gray-500">ID:</span> {data.staff.staffId}</p>
                  <p><span className="text-gray-500">Email:</span> {data.staff.email}</p>
                  <p><span className="text-gray-500">Phone:</span> {data.staff.phoneNumber || 'N/A'}</p>
                  <p><span className="text-gray-500">Location:</span> {data.staff.locationName}</p>
                </div>
              </>
            )}

            {data.mode === 'qr-only' && (
              <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{data.staff.name}</h3>
                <p className="text-sm text-gray-600">{data.staff.staffId}</p>
              </div>
            )}

            <img
              src={data.qrImageDataUrl}
              alt="Staff QR"
              className={`${data.mode === 'qr-only' ? 'w-52 h-52' : 'w-36 h-36'} mx-auto mt-4`}
            />
            <p className="text-center text-xs text-gray-500 mt-2">QR login token valid for {data.expiresIn}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleDownloadQr}>Download QR</Button>
          <Button variant="outline" onClick={handlePrint}>Print</Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
