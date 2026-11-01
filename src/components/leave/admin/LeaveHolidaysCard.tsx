import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LeaveHoliday } from '@/types/leave.types';
import { formatDate, WEEKDAY_SHORT, weekdayOfIso } from '../leaveFormat';
import { ALL, fromSelect, type LeaveAdminShared } from './shared';
import { EmptyRow } from './widgets';

export function LeaveHolidaysCard({ shared }: { shared: LeaveAdminShared }) {
  const { api, meta, branches } = shared;
  const canEdit = meta.permissions.managePolicies;
  const [year, setYear] = useState(Number(meta.today.slice(0, 4)));
  const [holidays, setHolidays] = useState<LeaveHoliday[] | null>(null);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState(ALL);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setHolidays(await api.listHolidays({ from: `${year}-01-01`, to: `${year}-12-31` }));
  }, [api, year]);

  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    setSaving(true);
    const created = await api.createHoliday({ holidayDate: date, name: name.trim(), locationId: fromSelect(locationId) ?? null });
    setSaving(false);
    if (created) {
      setDate('');
      setName('');
      void load();
    }
  };

  const remove = async (id: string) => {
    if (await api.removeHoliday(id)) void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Holidays</CardTitle>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">Holidays are not charged as leave (unless the settings say otherwise) and show on the leave calendar. Weekends come from the working days above.</p>
        {canEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Poya Day" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Applies to</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All branches</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void add()} disabled={saving || !date || !name.trim()}><Plus className="h-4 w-4 mr-2" />Add holiday</Button>
          </div>
        )}
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Applies to</TableHead>
                {canEdit && <TableHead className="text-right">Remove</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!holidays ? (
                <EmptyRow colSpan={4}>Loading…</EmptyRow>
              ) : holidays.length === 0 ? (
                <EmptyRow colSpan={4}>No holidays set for {year}.</EmptyRow>
              ) : (
                holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="whitespace-nowrap">{WEEKDAY_SHORT[weekdayOfIso(h.holidayDate)]}, {formatDate(h.holidayDate)}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>{h.locationName ?? 'All branches'}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => void remove(h.id)} aria-label={`Remove ${h.name}`}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default LeaveHolidaysCard;
