import { SALE_JOB_TYPE_LABELS, type SaleJobType, type Priority } from '../../types/saleJob.types';
import { Briefcase } from 'lucide-react';

export interface SaleJobFormValue {
  isJob: boolean;
  jobType: SaleJobType;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
  assignedToId?: string | null;
}

interface Props {
  value: SaleJobFormValue;
  onChange: (value: SaleJobFormValue) => void;
  /** Optional staff list for immediate assignment at POS (admins). */
  staffOptions?: Array<{ userId: string; name: string }>;
}

const JOB_TYPES: SaleJobType[] = ['PHOTO_FRAME', 'GRAPHIC_DESIGN', 'PRINTING', 'CUSTOM', 'OTHER'];
const PRIORITIES: Priority[] = ['LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Drop-in checkout section: "Is this a Job?" toggle + job fields.
 *
 * Mount inside the POS checkout modal and keep `value` in the same state object
 * the checkout submits (e.g. orderData.job). POSPage already forwards
 * `orderData.job` to createSale when `isJob` is true.
 */
const SaleJobFields = ({ value, onChange, staffOptions = [] }: Props) => {
  const set = (patch: Partial<SaleJobFormValue>) => onChange({ ...value, ...patch });

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input
          data-testid="pos-job-toggle"
          type="checkbox"
          checked={value.isJob}
          onChange={(e) => set({ isJob: e.target.checked })}
        />
        <Briefcase className="w-4 h-4" />
        Is this a Job? (photo frame, graphic design, etc.)
      </label>

      {value.isJob && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Job type</label>
            <select
              data-testid="pos-job-type"
              value={value.jobType}
              onChange={(e) => set({ jobType: e.target.value as SaleJobType })}
              className="w-full py-2 px-2 text-sm border rounded-md"
            >
              {JOB_TYPES.map((t) => <option key={t} value={t}>{SALE_JOB_TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Priority</label>
            <select
              value={value.priority || 'NORMAL'}
              onChange={(e) => set({ priority: e.target.value as Priority })}
              className="w-full py-2 px-2 text-sm border rounded-md"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">Title *</label>
            <input
              data-testid="pos-job-title"
              value={value.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. A4 photo frame x2"
              className="w-full py-2 px-2 text-sm border rounded-md"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">Description / instructions</label>
            <textarea
              value={value.description || ''}
              onChange={(e) => set({ description: e.target.value })}
              rows={2}
              className="w-full py-2 px-2 text-sm border rounded-md"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Due date</label>
            <input
              type="date"
              value={value.dueDate || ''}
              onChange={(e) => set({ dueDate: e.target.value })}
              className="w-full py-2 px-2 text-sm border rounded-md"
            />
          </div>

          {staffOptions.length > 0 && (
            <div>
              <label className="text-xs text-gray-500">Assign to (optional)</label>
              <select
                value={value.assignedToId || ''}
                onChange={(e) => set({ assignedToId: e.target.value || null })}
                className="w-full py-2 px-2 text-sm border rounded-md"
              >
                <option value="">Leave unassigned</option>
                {staffOptions.map((s) => <option key={s.userId} value={s.userId}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SaleJobFields;
