import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  Link2,
  Copy,
  Check,
  Mail,
  MessageSquare,
  Send,
  ExternalLink,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import useSales from "../../../hooks/useSales";

export type ShareChannel = "EMAIL" | "SMS" | "WHATSAPP";

interface ShareInfo {
  token: string;
  url: string;
  message: string;
  enabled: boolean;
  channels: { email: boolean; sms: boolean; whatsapp: boolean };
  defaults: { email: string | null; phone: string | null };
  waUrl: string;
}

interface ShareBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  saleNumber?: string;
  /** Pre-fills the recipient boxes before the backend answers. */
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Quick POS "Send Bill" sheet.
 *
 * The bill link itself is minted by the backend the first time this opens, so a
 * customer who was already given a link always gets the same URL back.
 *
 * WhatsApp never goes through the server   the organization has no WhatsApp API
 * key, so the backend hands back a `wa.me` deep link and we open it in a new
 * tab, where the cashier's already-logged-in WhatsApp (Web or the phone app)
 * sends it.
 */
const ShareBillModal: React.FC<ShareBillModalProps> = ({
  isOpen,
  onClose,
  saleId,
  saleNumber,
  customerEmail,
  customerPhone,
}) => {
  const { getBillShareLink, sendBillLink } = useSales();

  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [channel, setChannel] = useState<ShareChannel>("WHATSAPP");
  const [email, setEmail] = useState(customerEmail || "");
  const [phone, setPhone] = useState(customerPhone || "");

  const load = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    try {
      const res: any = await getBillShareLink(saleId);
      // useFetch resolves (it does not throw) on a failed request, so the
      // success flag has to be checked explicitly.
      if (res?.success === false || res?.status === false) {
        throw new Error(res?.message || "Could not create the bill link");
      }
      const data: ShareInfo | undefined = res?.data ?? res;
      if (!data?.url) throw new Error("No link returned");
      setInfo(data);
      setEmail((prev) => prev || data.defaults?.email || "");
      setPhone((prev) => prev || data.defaults?.phone || "");
      // Land on the first channel the organization actually enabled.
      if (data.channels?.whatsapp) setChannel("WHATSAPP");
      else if (data.channels?.sms) setChannel("SMS");
      else if (data.channels?.email) setChannel("EMAIL");
    } catch (err: any) {
      toast.error(err?.message || "Could not create the bill link");
    } finally {
      setLoading(false);
    }
  }, [getBillShareLink, saleId]);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, saleId]);

  const available = useMemo(
    () =>
      (
        [
          { id: "WHATSAPP" as const, label: "WhatsApp", icon: Send, on: info?.channels?.whatsapp },
          { id: "SMS" as const, label: "SMS", icon: MessageSquare, on: info?.channels?.sms },
          { id: "EMAIL" as const, label: "Email", icon: Mail, on: info?.channels?.email },
        ]
      ).filter((c) => c.on),
    [info],
  );

  const copyLink = async () => {
    if (!info?.url) return;
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const send = async () => {
    if (!info) return;
    if (channel === "EMAIL" && !email.trim()) {
      toast.error("Enter an email address");
      return;
    }
    if (channel !== "EMAIL" && !phone.trim()) {
      toast.error("Enter a phone number");
      return;
    }

    // WhatsApp must open from the click itself, or the pop-up blocker eats it.
    const waTab = channel === "WHATSAPP" ? window.open("", "_blank") : null;

    setSending(true);
    try {
      const res: any = await sendBillLink(saleId, {
        channel,
        to: channel === "EMAIL" ? email.trim() : phone.trim(),
      });
      // useFetch resolves on failure too   surface the backend's message
      // instead of reporting a send that never happened.
      if (res?.success === false || res?.status === false) {
        throw new Error(res?.message || "Could not send the bill");
      }
      const data = res?.data ?? res;

      if (channel === "WHATSAPP") {
        const target = data?.waUrl || info.waUrl;
        if (waTab) waTab.location.href = target;
        else window.open(target, "_blank", "noopener,noreferrer");
        toast.success("Opening WhatsApp");
        onClose();
        return;
      }

      toast.success(channel === "SMS" ? "Bill sent by SMS" : "Bill emailed");
      onClose();
    } catch (err: any) {
      waTab?.close();
      toast.error(err?.message || "Could not send the bill");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Send Bill</h3>
            {saleNumber && (
              <p className="text-xs text-gray-500 mt-0.5">{saleNumber}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center text-gray-500 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Creating bill link…
          </div>
        ) : !info ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Bill link is unavailable right now.
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* The link itself */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Bill link
              </label>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 min-w-0">
                  <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-700 truncate">{info.url}</span>
                </div>
                <button
                  onClick={copyLink}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={info.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                  title="Open bill"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {available.length === 0 ? (
              <p className="text-sm text-gray-500">
                No sending channel is enabled for this organization. You can still
                copy the link above.
              </p>
            ) : (
              <>
                {/* Channel picker */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Send via
                  </label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {available.map((c) => {
                      const Icon = c.icon;
                      const active = channel === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setChannel(c.id)}
                          className={`py-2.5 rounded-xl border text-sm font-medium flex flex-col items-center gap-1 transition-colors ${
                            active
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recipient */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {channel === "EMAIL" ? "Email address" : "Phone number"}
                  </label>
                  {channel === "EMAIL" ? (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="mt-2 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    />
                  ) : (
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0771234567"
                      className="mt-2 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                    />
                  )}
                  {channel === "WHATSAPP" && (
                    <p className="mt-2 text-[11px] text-gray-500">
                      Opens WhatsApp with the message ready — you press send there.
                    </p>
                  )}
                </div>

                {/* Message preview */}
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Message
                  </p>
                  <p className="text-xs text-gray-700 break-words whitespace-pre-wrap">
                    {info.message}
                  </p>
                </div>

                <button
                  onClick={send}
                  disabled={sending}
                  className="w-full py-3 rounded-xl bg-orange-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-700 disabled:opacity-60 transition-colors"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {channel === "WHATSAPP"
                        ? "Open WhatsApp"
                        : channel === "SMS"
                          ? "Send SMS"
                          : "Send Email"}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareBillModal;
