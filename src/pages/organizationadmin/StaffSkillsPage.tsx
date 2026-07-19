/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Plus, Trash2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStaff } from '../../hooks/useStaff';
import { useStaffSkills, SKILL_LEVELS } from '../../hooks/useStaffSkills';
import { useT } from '../../i18n/useT';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'bg-gray-100 text-gray-700',
  INTERMEDIATE: 'bg-blue-100 text-blue-800',
  EXPERT: 'bg-green-100 text-green-800',
};
const staffName = (s: any) => s?.user?.name || s?.user?.firstName || s?.name || s?.staffId || '—';

export default function StaffSkillsPage() {
  const { getAllStaff } = useStaff() as any;
  const { list, add: addSkill, remove: removeSkill } = useStaffSkills();
  const { t } = useT();

  const [staff, setStaff] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [skills, setSkills] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ skill: '', level: 'INTERMEDIATE', certification: '', certifiedAt: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const res = await getAllStaff(1, 200);
      const arr = res?.data?.staff ?? res?.data?.data?.staff ?? (Array.isArray(res?.data) ? res.data : []);
      setStaff(arr);
    } catch { /* ignore */ }
  }, [getAllStaff]);

  const loadSkills = useCallback(async (staffId: string) => {
    if (!staffId) {
      setSkills((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const res = await list(staffId);
    setSkills((res?.data as any) ?? []);
  }, [list]);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { loadSkills(selected); }, [selected, loadSkills]);

  const add = async () => {
    if (!selected || !form.skill) return;
    setSaving(true);
    try {
      const res = await addSkill({
        staffId: selected,
        skill: form.skill,
        level: form.level,
        certification: form.certification || null,
        certifiedAt: form.certifiedAt || null,
        notes: form.notes || null,
      });
      if (res?.success || res?.status) { setForm({ skill: '', level: 'INTERMEDIATE', certification: '', certifiedAt: '', notes: '' }); loadSkills(selected); }
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Remove this skill?')) return;
    await removeSkill(id);
    loadSkills(selected);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-800"><GraduationCap className="w-7 h-7" /> {t('technicianSkills')}</h1>
        <LanguageSwitcher />
      </div>

      <div className="max-w-md">
        <Label>Staff member</Label>
        <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select a staff member…</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{staffName(s)} {s.staffId ? `(${s.staffId})` : ''}</option>)}
        </select>
      </div>

      {selected && (
        <>
          <Card><CardContent className="p-4 grid gap-3">
            <p className="font-semibold text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Add a skill</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Skill *</Label><Input placeholder="e.g. Engine repair, AC service, Wheel alignment" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} /></div>
              <div>
                <Label>Level</Label>
                <select className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                  {SKILL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div><Label>Certification</Label><Input placeholder="e.g. Toyota Certified" value={form.certification} onChange={(e) => setForm({ ...form, certification: e.target.value })} /></div>
              <div><Label>Certified / Expiry Date</Label><Input type="date" value={form.certifiedAt} onChange={(e) => setForm({ ...form, certifiedAt: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div><Button onClick={add} disabled={saving || !form.skill}><Plus className="w-4 h-4 mr-1" /> Add Skill</Button></div>
          </CardContent></Card>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skills.map((s) => (
              <Card key={s.id}><CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-1"><Award className="w-4 h-4 text-blue-600" /> {s.skill}</p>
                    <Badge className={`text-[10px] mt-1 ${LEVEL_COLORS[s.level] || ''}`}>{s.level}</Badge>
                    {s.certification && <p className="text-xs text-muted-foreground mt-1">{s.certification}{s.certifiedAt ? ` · ${s.certifiedAt}` : ''}</p>}
                    {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => del(s.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </div>
              </CardContent></Card>
            ))}
            {skills.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No skills recorded for this staff member yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}
