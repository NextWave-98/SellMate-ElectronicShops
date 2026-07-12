import React, { useState } from 'react';
import { Shield, Check, Calendar, User, Phone, Mail, Package, Hash, Award, Download, Printer, Share2, X, Clock, FileText, MapPin, Sparkles, QrCode, CheckCircle, AlertCircle } from 'lucide-react';

interface WarrantyCardProps {
  warranty: {
    id?: string;
    warrantyNumber: string;
    status: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    productName: string;
    productCode?: string;
    productSKU?: string;
    serialNumber?: string;
    purchaseDate?: string;
    startDate: string;
    expiryDate: string;
    warrantyMonths: number;
    warrantyType: string;
    daysRemaining?: number;
    coverage?: string;
    exclusions?: string;
    terms?: string;
    location?: { name: string };
    sale?: { soldBy?: { name: string } };
  };
  isOpen?: boolean;
  onClose?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
}

const PremiumWarrantyCard: React.FC<WarrantyCardProps> = ({ 
  warranty, 
  isOpen = true, 
  onClose,
  onDownload,
  onPrint 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'coverage' | 'terms'>('overview');
  const [showQR, setShowQR] = useState(false);

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    switch(s) {
      case 'ACTIVE': return { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'EXPIRED': return { gradient: 'from-gray-500 to-slate-500', bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
      case 'CLAIMED': return { gradient: 'from-amber-500 to-orange-400', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
      case 'VOIDED': return { gradient: 'from-red-500 to-rose-500', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
      default: return { gradient: 'from-orange-400 to-indigo-500', bg: 'bg-orange-400/20', text: 'text-orange-400', border: 'border-orange-400/30' };
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const statusColors = getStatusColor(warranty.status);
  const daysRemaining = warranty.daysRemaining || Math.ceil(
    (new Date(warranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl" style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite', animationDelay: '1s' }}></div>
      </div>

      <div className="relative w-full max-w-5xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-purple-500/20 overflow-hidden animate-slide-up">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 group border border-purple-500/20"
          >
            <X className="w-5 h-5 text-purple-300 group-hover:text-white" />
          </button>
        )}

        {/* Premium Header with Glassmorphism */}
        <div className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-r ${statusColors.gradient} opacity-90`}></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          
          <div className="relative p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-lg border border-white/30">
                  <Shield className="w-10 h-10 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <h1 className="text-3xl font-bold text-white tracking-tight">Premium Warranty</h1>
                  </div>
                  <p className="text-white/80 text-sm font-medium">Your Protection, Our Commitment</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex flex-col items-end gap-2">
                <div className={`px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg`}>
                  <p className="text-white/80 text-xs font-medium mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    {warranty.status.toUpperCase() === 'ACTIVE' && <CheckCircle className="w-5 h-5 text-white" />}
                    {isExpired && <AlertCircle className="w-5 h-5 text-white" />}
                    <p className="text-white text-xl font-bold uppercase tracking-wider">{warranty.status}</p>
                  </div>
                </div>
                {!isExpired && (
                  <div className={`px-4 py-2 ${isExpiringSoon ? 'bg-amber-500/20 border-amber-300/30' : 'bg-white/10 border-white/20'} backdrop-blur-md rounded-xl border shadow-lg`}>
                    <p className="text-white/80 text-xs text-center mb-1">Days Remaining</p>
                    <p className={`text-2xl font-bold text-center ${isExpiringSoon ? 'text-amber-300' : 'text-white'}`}>{daysRemaining}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Warranty Number - Premium Display */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-2 font-medium">Warranty Number</p>
                  <div className="flex items-center gap-3">
                    <Hash className="w-6 h-6 text-white/80" />
                    <h2 className="text-4xl font-bold text-white tracking-widest font-mono">{warranty.warrantyNumber}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-105 border border-white/20"
                >
                  <QrCode className="w-8 h-8 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-px bg-purple-500/20">
          <div className="bg-gradient-to-br from-purple-500/10 to-transparent p-5 backdrop-blur-sm hover:from-purple-500/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Purchase Date</p>
            </div>
            <p className="text-white font-bold text-lg">{formatDate(warranty.startDate)}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-400/10 to-transparent p-5 backdrop-blur-sm hover:from-orange-400/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <p className="text-orange-300 text-xs font-semibold uppercase tracking-wider">Valid Until</p>
            </div>
            <p className="text-white font-bold text-lg">{formatDate(warranty.expiryDate)}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-transparent p-5 backdrop-blur-sm hover:from-emerald-500/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wider">Coverage Period</p>
            </div>
            <p className="text-white font-bold text-lg">{warranty.warrantyMonths} Months</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-purple-500/20 bg-slate-800/50">
          {[
            { key: 'overview', label: 'Overview', icon: User },
            { key: 'coverage', label: 'Coverage', icon: Shield },
            { key: 'terms', label: 'Terms', icon: FileText }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`flex-1 py-4 px-6 text-sm font-semibold transition-all duration-300 relative group ${
                activeTab === key 
                  ? 'text-white bg-purple-500/10' 
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon className="w-4 h-4" />
                {label}
              </div>
              {activeTab === key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8 max-h-96 overflow-y-auto custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Customer Card */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-6 border border-purple-500/20 shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
                <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <User className="w-5 h-5 text-purple-400" />
                  </div>
                  Customer Information
                </h3>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="flex items-start gap-4 group">
                    <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-all duration-300">
                      <User className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-1">Full Name</p>
                      <p className="text-white font-semibold text-lg">{warranty.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 group">
                    <div className="p-3 bg-orange-400/10 rounded-xl group-hover:bg-orange-400/20 transition-all duration-300">
                      <Phone className="w-5 h-5 text-orange-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-orange-300 text-xs font-semibold uppercase tracking-wider mb-1">Phone Number</p>
                      <p className="text-white font-semibold text-lg">{warranty.customerPhone}</p>
                    </div>
                  </div>
                  {warranty.customerEmail && (
                    <div className="flex items-start gap-4 group md:col-span-2">
                      <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-all duration-300">
                        <Mail className="w-5 h-5 text-emerald-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-1">Email Address</p>
                        <p className="text-white font-semibold text-lg">{warranty.customerEmail}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Card */}
              <div className="bg-gradient-to-br from-purple-500/10 via-orange-400/10 to-transparent rounded-2xl p-6 border border-purple-500/30 shadow-lg hover:shadow-orange-400/20 transition-all duration-300">
                <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
                  <div className="p-2 bg-orange-400/20 rounded-lg">
                    <Package className="w-5 h-5 text-orange-400" />
                  </div>
                  Product Details
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Product Name', value: warranty.productName, highlight: true },
                    { label: 'Product Code', value: warranty.productCode, mono: true },
                    { label: 'SKU', value: warranty.productSKU, mono: true },
                    { label: 'Serial Number', value: warranty.serialNumber, mono: true },
                    { label: 'Warranty Type', value: warranty.warrantyType.toUpperCase() }
                  ].filter(item => item.value).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300">
                      <span className="text-purple-300 font-medium">{item.label}</span>
                      <span className={`${item.highlight ? 'text-white font-bold text-lg' : 'text-white font-semibold'} ${item.mono ? 'font-mono' : ''}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'coverage' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl p-6 border border-emerald-500/30 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                  What's Covered
                </h3>
                <p className="text-emerald-50 leading-relaxed text-base">
                  {warranty.coverage || 'Full hardware coverage including display, battery, keyboard, trackpad, logic board, and all internal components under normal use conditions.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {['Manufacturing Defects', 'Hardware Failures', 'Software Issues', 'Parts & Labor'].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-emerald-100">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500/10 to-orange-400/10 rounded-2xl p-6 border border-red-500/30 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  Exclusions
                </h3>
                <p className="text-red-50 leading-relaxed text-base">
                  {warranty.exclusions || 'Physical damage, liquid damage, unauthorized modifications, cosmetic wear and tear, loss or theft of the device.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="animate-fade-in">
              <div className="bg-slate-800/60 rounded-2xl p-6 border border-purple-500/20 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  Terms & Conditions
                </h3>
                <p className="text-purple-100 leading-relaxed mb-6 text-base">
                  {warranty.terms || 'Valid with original purchase receipt. Must be serviced at authorized centers. Parts and labor included within warranty period.'}
                </p>
                <div className="space-y-3">
                  {[
                    'Original purchase receipt required for all warranty claims',
                    'Service must be performed at authorized service centers only',
                    'All parts and labor included within the warranty period',
                    'Extended warranty options available upon request',
                    'Warranty is non-transferable without proper documentation'
                  ].map((term, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-purple-500/5 rounded-xl hover:bg-purple-500/10 transition-all duration-300">
                      <Check className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <p className="text-purple-100 text-sm">{term}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="bg-gradient-to-r from-slate-800/80 via-slate-900/80 to-slate-800/80 p-6 border-t border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-purple-400 mt-1" />
              <div>
                <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-1">Issued by</p>
                <p className="text-white font-semibold">{warranty.sale?.soldBy?.name || 'LTS Technology Solutions'}</p>
                <p className="text-purple-400 text-sm">{warranty.location?.name || 'Main Branch'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-1">Generated on</p>
              <p className="text-white text-sm font-semibold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onDownload}
              className="flex-1 min-w-[180px] px-6 py-3 bg-gradient-to-r from-purple-500 to-orange-400 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 group"
            >
              <Download className="w-5 h-5 group-hover:animate-bounce" />
              Download PDF
            </button>
            <button
              onClick={onPrint}
              className="flex-1 min-w-[180px] px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 border border-purple-500/30 group"
            >
              <Printer className="w-5 h-5 group-hover:animate-pulse" />
              Print Card
            </button>
            <button className="flex-1 min-w-[180px] px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 group">
              <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Share
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.4);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.6);
        }
      `}</style>
    </div>
  );
};

// Example usage component
const WarrantyCardDemo = () => {
  const [isOpen, setIsOpen] = useState(true);

  const sampleWarranty = {
    id: 'wrn-001',
    warrantyNumber: 'WRN-2024-0156',
    status: 'ACTIVE',
    customerName: 'Sarah Johnson',
    customerPhone: '+1 (555) 123-4567',
    customerEmail: 'sarah.johnson@email.com',
    productName: 'MacBook Pro 16" M3 Max',
    productCode: 'MBP-M3-16-2024',
    productSKU: 'APPLE-MBP16-M3',
    serialNumber: 'C02ZK3XELVCG',
    purchaseDate: '2024-01-15',
    startDate: '2024-01-15',
    expiryDate: '2026-01-15',
    warrantyMonths: 24,
    warrantyType: 'MANUFACTURER',
    daysRemaining: 403,
    coverage: 'Full hardware coverage including display, battery, keyboard, trackpad, logic board, and all internal components',
    exclusions: 'Physical damage, liquid damage, unauthorized modifications, cosmetic wear',
    terms: 'Valid with original purchase receipt. Must be serviced at authorized centers. Parts and labor included.',
    location: { name: 'LTS Technology Hub - Downtown' },
    sale: { soldBy: { name: 'Michael Chen - Sales Manager' } }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-orange-400 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
        >
          Open Warranty Card
        </button>
      )}
      <PremiumWarrantyCard
        warranty={sampleWarranty}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onDownload={() => alert('Download initiated')}
        onPrint={() => alert('Print dialog opened')}
      />
    </div>
  );
};

export default WarrantyCardDemo;