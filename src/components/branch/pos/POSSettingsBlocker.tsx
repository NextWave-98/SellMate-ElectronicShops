import React from 'react';
import { Settings2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface POSSettingsBlockerProps {
  /** Pass the route path where the POS Settings page lives */
  settingsPath?: string;
}

const POSSettingsBlocker: React.FC<POSSettingsBlockerProps> = ({
  settingsPath = '/superadmin/pos/settings',
}) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-orange-50">
      {/* diagonal stripe background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #2563eb 0, #2563eb 1px, transparent 0, transparent 14px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-orange-200">
          {/* Header */}
          <div className="bg-orange-500 px-6 py-7 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Settings2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">POS Not Configured</h2>
            <p className="text-orange-100 text-sm mt-1">
              POS hardware settings must be saved before using the POS
            </p>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-4 mb-5">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-700 leading-relaxed">
                The POS settings for this branch have not been configured yet. Please select a
                printer, paper format and barcode reader before processing sales.
              </p>
            </div>

            <button
              onClick={() => navigate(settingsPath)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
            >
              <Settings2 className="w-4 h-4" />
              Configure POS Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSSettingsBlocker;
