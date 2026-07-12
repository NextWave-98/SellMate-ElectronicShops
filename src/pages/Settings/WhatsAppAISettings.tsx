/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Save, Play, ArrowLeft, Building2 } from 'lucide-react';
import { useAuthRedux } from '../../hooks/useAuthRedux';
import useWhatsAppSettings from '../../hooks/useWhatsAppSettings';
import useWhatsAppAI from '../../hooks/useWhatsAppAI';
import AIModelSelector from '../../components/WhatsApp/AIModelSelector';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';

const WhatsAppAISettingsPage: React.FC = () => {
  const { user } = useAuthRedux();
  const businessId = user?.businessId ?? undefined;
  const { settings, fetchSettings } = useWhatsAppSettings(businessId);
  const ai = useWhatsAppAI(businessId);

  useEffect(() => {
    if (businessId) fetchSettings();
  }, [businessId]);

  useEffect(() => {
    if (settings) ai.loadFromSettings(settings);
  }, [settings]);

  if (!businessId) {
    return <div className="p-6 text-muted-foreground">No organization context.</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/superadmin/communication/whatsapp">
            <ArrowLeft className="h-4 w-4 mr-1" />
            WhatsApp
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-7 w-7 text-violet-600" />
          AI Reply Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure your organization details below. On every customer message, the AI loads your setup
          plus live products, prices, categories, and inventory from the database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reply Mode</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          {(['MANUAL', 'AUTO', 'AI'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="replyMode"
                checked={ai.mode === m}
                onChange={() => ai.setMode(m)}
              />
              {m === 'MANUAL' ? 'Manual' : m === 'AUTO' ? 'Template' : 'AI Smart Reply'}
            </label>
          ))}
        </CardContent>
      </Card>

      {(ai.mode === 'AI' || ai.aiEnabled) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Model Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <AIModelSelector
                models={ai.models}
                selectedModelId={ai.aiModel}
                onSelectModel={ai.setAiModel}
                selectedProvider={ai.aiProvider}
                onSelectProvider={ai.setAiProvider}
                useOrgAiSettings={ai.useOrgAiSettings}
                onUseOrgAiSettingsChange={ai.setUseOrgAiSettings}
                hasOrgAiSettings={ai.hasOrgAiSettings}
                openRouterKey={ai.openRouterKey}
                onOpenRouterKeyChange={ai.setOpenRouterKey}
                keyDirty={ai.keyDirty}
                onKeyDirtyChange={ai.setKeyDirty}
                maskedKey={ai.maskedKey}
                hasOwnKey={ai.hasOwnKey}
                onClearKey={ai.clearOwnKey}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reply Language</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-6">
              {([
                ['si', 'සිංහල'],
                ['en', 'English'],
                ['auto', 'Auto detect'],
              ] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="lang"
                    checked={ai.replyLanguage === val}
                    onChange={() => ai.setReplyLanguage(val)}
                  />
                  {label}
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-violet-600" />
                Organization Knowledge Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tell customers what your organization provides. Product prices and stock always come
                from your live database automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                {ai.instructionTemplates.map((name) => (
                  <Button
                    key={name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => ai.applyTemplate(name as 'Pharmacy')}
                  >
                    {name} template
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-about">About your organization</Label>
                <Textarea
                  id="org-about"
                  rows={3}
                  value={ai.orgKnowledge.about ?? ''}
                  onChange={(e) => ai.updateOrgKnowledge('about', e.target.value)}
                  placeholder="What is your business? e.g. We are a photo printing and mobile repair shop in Colombo."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-services">Services you provide</Label>
                <Textarea
                  id="org-services"
                  rows={3}
                  value={ai.orgKnowledge.servicesOffered ?? ''}
                  onChange={(e) => ai.updateOrgKnowledge('servicesOffered', e.target.value)}
                  placeholder="e.g. Graphic design, photo printing, screen repair, home delivery"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-products">Products you offer (overview)</Label>
                <Textarea
                  id="org-products"
                  rows={3}
                  value={ai.orgKnowledge.productsOverview ?? ''}
                  onChange={(e) => ai.updateOrgKnowledge('productsOverview', e.target.value)}
                  placeholder="e.g. Photo frames, crystals, refurbished phones — exact prices come from inventory"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-hours">Business hours</Label>
                  <Input
                    id="org-hours"
                    value={ai.orgKnowledge.businessHours ?? ''}
                    onChange={(e) => ai.updateOrgKnowledge('businessHours', e.target.value)}
                    placeholder="Mon–Sat 9 AM – 6 PM"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-delivery">Delivery / pickup</Label>
                  <Input
                    id="org-delivery"
                    value={ai.orgKnowledge.deliveryInfo ?? ''}
                    onChange={(e) => ai.updateOrgKnowledge('deliveryInfo', e.target.value)}
                    placeholder="Same-day pickup, island-wide delivery"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-policies">Policies (returns, warranty, payment)</Label>
                <Textarea
                  id="org-policies"
                  rows={2}
                  value={ai.orgKnowledge.policies ?? ''}
                  onChange={(e) => ai.updateOrgKnowledge('policies', e.target.value)}
                  placeholder="e.g. 7-day exchange with receipt. Cash and card accepted."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Extra AI Instructions (optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                rows={4}
                value={ai.aiInstructions}
                onChange={(e) => ai.setAiInstructions(e.target.value)}
                placeholder="Any extra rules for the AI, e.g. never give medical advice, always mention our Nugegoda branch..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Your AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={ai.testMessage}
                  onChange={(e) => ai.setTestMessage(e.target.value)}
                  placeholder="Type a sample customer message..."
                  onKeyDown={(e) => e.key === 'Enter' && ai.testAiReply()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={ai.testAiReply}
                  disabled={ai.testing || !ai.testMessage.trim()}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {ai.testing ? 'Testing…' : 'Test Reply'}
                </Button>
              </div>

              {ai.testResult && (
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{ai.testResult.reply}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">🤖 {ai.testResult.modelName}</Badge>
                    <span>{ai.testResult.responseTimeMs}ms</span>
                    <span>{ai.testResult.usingOwnKey ? 'Own key ✓' : 'Platform key'}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Button type="button" onClick={ai.saveAiConfig} disabled={ai.saving}>
        <Save className="h-4 w-4 mr-1" />
        {ai.saving ? 'Saving…' : 'Save Settings'}
      </Button>
    </div>
  );
};

export default WhatsAppAISettingsPage;
