/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, Trash2, Award, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useStaff } from '../../hooks/useStaff';
import { useStaffSkills, SKILL_LEVELS } from '../../hooks/useStaffSkills';
import { useT } from '../../i18n/useT';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'bg-gray-100 text-gray-700',
  INTERMEDIATE: 'bg-blue-100 text-blue-800',
  EXPERT: 'bg-green-100 text-green-800',
};

const EMPTY_FORM = {
  skill: '',
  level: 'INTERMEDIATE',
  certification: '',
  certifiedAt: '',
  notes: '',
};

const staffRecordId = (s: any) => s?.id || s?.staffUuid || '';
const staffName = (s: any) => s?.user?.name || s?.name || s?.staffId || ' ';
const staffCode = (s: any) => s?.staffId || '';
const staffRole = (s: any) => s?.user?.role?.name || '';
const staffBranch = (s: any) => s?.user?.location?.name || '';

function extractStaffList(res: any): any[] {
  if (Array.isArray(res?.staff)) return res.staff;
  if (Array.isArray(res?.data?.staff)) return res.data.staff;
  if (Array.isArray(res?.data?.data?.staff)) return res.data.data.staff;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
}

function extractSkills(res: any): any[] {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res)) return res;
  return [];
}

export default function StaffSkillsPage() {
  const { getAllStaff } = useStaff() as any;
  const { list, add: addSkill, remove: removeSkill } = useStaffSkills();
  const { t } = useT();

  const [staff, setStaff] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [skills, setSkills] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [search, setSearch] = useState('');

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await getAllStaff(1, 200);
      setStaff(extractStaffList(res));
    } catch {
      toast.error('Failed to load staff list');
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, [getAllStaff]);

  const loadSkills = useCallback(async (staffId: string) => {
    if (!staffId) {
      setSkills([]);
      return;
    }
    setLoadingSkills(true);
    try {
      const res = await list(staffId);
      setSkills(extractSkills(res));
    } catch {
      toast.error('Failed to load skills');
      setSkills([]);
    } finally {
      setLoadingSkills(false);
    }
  }, [list]);

  useEffect(() => { loadStaff(); }, [loadStaff]);
  useEffect(() => { loadSkills(selected); }, [selected, loadSkills]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => {
      const hay = `${staffName(s)} ${staffCode(s)} ${staffRole(s)} ${staffBranch(s)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [staff, search]);

  const selectedStaff = useMemo(
    () => staff.find((s) => staffRecordId(s) === selected) || null,
    [staff, selected]
  );

  const add = async () => {
    if (!selected || !form.skill.trim()) return;
    setSaving(true);
    try {
      const res = await addSkill({
        staffId: selected,
        skill: form.skill.trim(),
        level: form.level,
        certification: form.certification || null,
        certifiedAt: form.certifiedAt || null,
        notes: form.notes || null,
      });
      if (res?.success === false) return;
      setForm(EMPTY_FORM);
      await loadSkills(selected);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!window.confirm('Remove this skill?')) return;
    await removeSkill(id);
    await loadSkills(selected);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-800">
            <GraduationCap className="w-7 h-7" /> {t('technicianSkills')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a staff member, then add or remove their skills.
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm flex items-center gap-1">
                <Users className="w-4 h-4" /> Staff list
              </p>
              <span className="text-xs text-muted-foreground">{filteredStaff.length}</span>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loadingStaff ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading staff…</p>
            ) : filteredStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No staff members found. Add staff from Staff Management first.
              </p>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto divide-y rounded-md border">
                {filteredStaff.map((s) => {
                  const id = staffRecordId(s);
                  const active = id === selected;
                  return (
                    <button
                      key={id || staffCode(s)}
                      type="button"
                      onClick={() => setSelected(id)}
                      className={`w-full text-left px-3 py-2.5 transition ${
                        active ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'hover:bg-muted/60'
                      }`}
                    >
                      <p className="font-medium text-sm truncate">{staffName(s)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[staffCode(s), staffRole(s), staffBranch(s)].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!selected ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Select a staff member from the list to add skills.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-4 grid gap-3">
                  <p className="font-semibold text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add a skill
                    {selectedStaff && (
                      <span className="font-normal text-muted-foreground">
                          {staffName(selectedStaff)}
                      </span>
                    )}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Skill *</Label>
                      <Input
                        placeholder="e.g. Screen replacement, Motherboard repair"
                        value={form.skill}
                        onChange={(e) => setForm({ ...form, skill: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Level</Label>
                      <select
                        className="block w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={form.level}
                        onChange={(e) => setForm({ ...form, level: e.target.value })}
                      >
                        {SKILL_LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Certification</Label>
                      <Input
                        placeholder="e.g. Manufacturer certified"
                        value={form.certification}
                        onChange={(e) => setForm({ ...form, certification: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Certified / Expiry Date</Label>
                      <Input
                        type="date"
                        value={form.certifiedAt}
                        onChange={(e) => setForm({ ...form, certifiedAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                  <div>
                    <Button onClick={add} disabled={saving || !form.skill.trim()}>
                      <Plus className="w-4 h-4 mr-1" /> {saving ? 'Adding…' : 'Add Skill'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 gap-3">
                {loadingSkills ? (
                  <p className="col-span-full text-center text-muted-foreground py-8">Loading skills…</p>
                ) : (
                  <>
                    {skills.map((s) => (
                      <Card key={s.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold flex items-center gap-1">
                                <Award className="w-4 h-4 text-blue-600" /> {s.skill}
                              </p>
                              <Badge className={`text-[10px] mt-1 ${LEVEL_COLORS[s.level] || ''}`}>{s.level}</Badge>
                              {s.certification && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {s.certification}{s.certifiedAt ? ` · ${s.certifiedAt}` : ''}
                                </p>
                              )}
                              {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => del(s.id)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {skills.length === 0 && (
                      <p className="col-span-full text-center text-muted-foreground py-8">
                        No skills recorded for this staff member yet.
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
