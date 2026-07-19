/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BookOpen, ArrowRight, Lightbulb, Route, Users, ListOrdered, Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBusinessContext } from '../../context/BusinessContext';
import { industryAllowsFeature } from '../../utils/industryFeatures';
import {
  SYSTEM_USAGE_MODULES,
  resolveUsageModule,
  type UsageModuleResolved,
} from '../../data/systemUsageContent';
import { useT } from '../../i18n/useT';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

/** In-app System Usage guide with EN / SI / TA and real examples. */
export default function SystemUsagePage() {
  const { industryType } = useBusinessContext() as any;
  const { branchCode } = useParams();
  const pathBase = branchCode ? `/${branchCode}` : '/superadmin';
  const { t, lang } = useT();

  const modules = useMemo(() => {
    return SYSTEM_USAGE_MODULES
      .filter((m) => {
        if (!m.feature) return true;
        return industryAllowsFeature(industryType, m.feature);
      })
      .map((m) => resolveUsageModule(m, lang));
  }, [industryType, lang]);

  const [activeId, setActiveId] = useState<string>(modules[0]?.id || 'overview');

  useEffect(() => {
    if (!modules.some((m) => m.id === activeId) && modules[0]) {
      setActiveId(modules[0].id);
    }
  }, [modules, activeId]);

  const active: UsageModuleResolved | undefined =
    modules.find((m) => m.id === activeId) || modules[0];

  if (!active) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t('usageEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
            <BookOpen className="w-7 h-7" /> {t('systemUsage')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {t('usageIntro')}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="flex flex-wrap gap-1.5 border-b pb-px">
        {modules.map((m) => {
          const selected = m.id === active.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              className={`inline-flex flex-col items-start rounded-t-md border-b-2 px-3 py-2 text-left transition-colors ${
                selected
                  ? 'border-primary bg-muted/60 text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <span className="text-sm font-medium">{m.title}</span>
              <span className="text-[11px] opacity-80">{m.short}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">{active.title}</h2>
              <Button variant="outline" size="sm" asChild>
                <Link to={`${pathBase}/${active.menuPath}`}>
                  {t('usageOpenModule')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-blue-800">
                <Users className="w-4 h-4" /> {t('usageWho')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{active.who}</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-blue-800">
                <ListOrdered className="w-4 h-4" /> {t('usageFlow')}
              </h3>
              <ol className="space-y-2">
                {active.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed text-foreground/90">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border bg-muted/40 px-4 py-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1">
                <Route className="w-4 h-4" /> {t('usageStatusPath')}
              </h3>
              <p className="font-mono text-xs sm:text-sm text-foreground/80 wrap-break-word">{active.flow}</p>
            </section>

            {active.tips && active.tips.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5 text-amber-700">
                  <Lightbulb className="w-4 h-4" /> {t('usageTips')}
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {active.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </section>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-blue-100 bg-linear-to-b from-blue-50/80 to-white">
          <CardContent className="p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 text-blue-800">
              <Sparkles className="w-4 h-4" /> {active.exampleTitle}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('usageExampleHint')}
            </p>
            <ul className="space-y-2.5">
              {active.example.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
