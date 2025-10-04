import { type FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Pause,
  Play,
  ShieldCheck,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import {
  INTEGRATION_EVENTS,
  type IntegrationApiKeySummary,
  type IntegrationApiKeyWithSecret,
  type IntegrationEvent,
  type TenantWebhookConfig,
} from '../../shared/types/integration';
import { api } from '../lib/api';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'api', label: 'API Keys', icon: KeyRound }
] as const;

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const formatEventLabel = (event: string) => {
  return event
    .split('.')
    .map((segment) =>
      segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    )
    .join(' → ');
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('profile');
  const [copyState, setCopyState] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<IntegrationApiKeyWithSecret | null>(null);
  const [keyName, setKeyName] = useState('');
  const [keyDescription, setKeyDescription] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const keysQuery = useQuery({
    queryKey: ['integration-api-keys'],
    queryFn: () => api.get<IntegrationApiKeySummary[]>('/integrations/api-keys'),
    enabled: activeTab === 'api',
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      api.post<IntegrationApiKeyWithSecret>('/integrations/api-keys', payload),
    onSuccess: (data) => {
      setGeneratedKey(data);
      setKeyError(null);
      setKeyName('');
      setKeyDescription('');
      void queryClient.invalidateQueries({ queryKey: ['integration-api-keys'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create API key';
      setKeyError(message);
    },
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: (id: string) => api.delete<IntegrationApiKeySummary>(`/integrations/api-keys/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integration-api-keys'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to revoke API key';
      setKeyError(message);
    },
  });

  const apiKeys = useMemo(() => keysQuery.data ?? [], [keysQuery.data]);

  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookHeaders, setWebhookHeaders] = useState('');
  const [webhookActive, setWebhookActive] = useState(true);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookSuccess, setWebhookSuccess] = useState<string | null>(null);
  const [selectedWebhookEvents, setSelectedWebhookEvents] = useState<Set<IntegrationEvent>>(
    () => new Set([INTEGRATION_EVENTS[0]]),
  );

  const selectedEventsArray = useMemo(
    () => Array.from(selectedWebhookEvents.values()),
    [selectedWebhookEvents],
  );

  const webhooksQuery = useQuery({
    queryKey: ['integration-webhooks'],
    queryFn: () => api.get<TenantWebhookConfig[]>('/integrations/webhooks'),
    enabled: activeTab === 'integrations',
  });

  const createWebhookMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      url: string;
      events: IntegrationEvent[];
      secret?: string;
      headers?: Record<string, string>;
      active: boolean;
    }) => api.post<TenantWebhookConfig>('/integrations/webhooks', payload),
    onSuccess: () => {
      setWebhookError(null);
      setWebhookSuccess('Webhook saved successfully.');
      setWebhookName('');
      setWebhookUrl('');
      setWebhookSecret('');
      setWebhookHeaders('');
      setWebhookActive(true);
      setSelectedWebhookEvents(new Set([INTEGRATION_EVENTS[0]]));
      void queryClient.invalidateQueries({ queryKey: ['integration-webhooks'] });
    },
    onError: (error: unknown) => {
      setWebhookSuccess(null);
      const message = error instanceof Error ? error.message : 'Failed to save webhook';
      setWebhookError(message);
    },
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch<TenantWebhookConfig>(`/integrations/webhooks/${id}`, { active }),
    onSuccess: () => {
      setWebhookError(null);
      void queryClient.invalidateQueries({ queryKey: ['integration-webhooks'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update webhook';
      setWebhookError(message);
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => api.delete<TenantWebhookConfig>(`/integrations/webhooks/${id}`),
    onSuccess: () => {
      setWebhookError(null);
      void queryClient.invalidateQueries({ queryKey: ['integration-webhooks'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to delete webhook';
      setWebhookError(message);
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: (id: string) => api.post<{ dispatched: boolean }>(`/integrations/webhooks/${id}/test`),
    onSuccess: () => {
      setWebhookError(null);
      setWebhookSuccess('Test event dispatched successfully.');
      void queryClient.invalidateQueries({ queryKey: ['integration-webhooks'] });
    },
    onError: (error: unknown) => {
      setWebhookSuccess(null);
      const message = error instanceof Error ? error.message : 'Failed to dispatch test event';
      setWebhookError(message);
    },
  });

  const webhooks = useMemo(() => webhooksQuery.data ?? [], [webhooksQuery.data]);
  const keyLoadError = keysQuery.error instanceof Error ? keysQuery.error.message : 'Unable to load API keys.';
  const webhookLoadError =
    webhooksQuery.error instanceof Error ? webhooksQuery.error.message : 'Unable to load webhooks.';

  const handleCopy = (value: string, id: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopyState(id);
        window.setTimeout(() => setCopyState(null), 1500);
      })
      .catch(() => {
        setCopyState(null);
      });
  };

  const handleCreateKey = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createApiKeyMutation.isPending) {
      return;
    }

    const name = keyName.trim();
    const description = keyDescription.trim();

    if (!name) {
      setKeyError('Provide a name for the API key.');
      return;
    }

    setKeyError(null);
    createApiKeyMutation.mutate({ name, description: description || undefined });
  };

  const handleCreateWebhook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (createWebhookMutation.isPending) {
      return;
    }

    const name = webhookName.trim();
    const url = webhookUrl.trim();

    if (!name || !url) {
      setWebhookError('Provide both a name and callback URL.');
      return;
    }

    if (selectedEventsArray.length === 0) {
      setWebhookError('Select at least one event to subscribe to.');
      return;
    }

    let headers: Record<string, string> | undefined;

    if (webhookHeaders.trim()) {
      try {
        const parsed = JSON.parse(webhookHeaders) as Record<string, unknown>;

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Headers must be a JSON object.');
        }

        headers = Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [key, String(value)]),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Headers must be valid JSON.';
        setWebhookError(message);
        return;
      }
    }

    const secret = webhookSecret.trim();

    setWebhookError(null);
    createWebhookMutation.mutate({
      name,
      url,
      events: selectedEventsArray,
      secret: secret ? secret : undefined,
      headers,
      active: webhookActive,
    });
  };

  const toggleEvent = (event: IntegrationEvent) => {
    setSelectedWebhookEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) {
        next.delete(event);
      } else {
        next.add(event);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mutedfg">Control center</p>
          <h1 className="mt-2 text-3xl font-semibold text-fg">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-mutedfg">
            Configure WorkPro for your organization. Manage security, billing, integrations, and API credentials in one place.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface px-5 py-3 text-xs font-semibold uppercase tracking-wide text-mutedfg shadow-xl">
          <ShieldCheck className="h-4 w-4 text-success" /> SOC 2 Type II certified
        </div>
      </header>
      <nav className="flex flex-wrap items-center gap-2 rounded-3xl border border-border bg-surface p-2 shadow-xl" aria-label="Settings tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-brand text-white shadow-lg' : 'text-mutedfg hover:bg-muted'
              }`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={active}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-fg">Profile</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Full name
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="Jordan Daniels" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Email
                <input type="email" className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="jordan@workpro.io" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Job title
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="Operations Admin" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Phone
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="+1 555 123 7744" />
              </label>
            </div>
            <div className="rounded-2xl border border-border bg-white/60 px-4 py-3 text-sm text-mutedfg dark:bg-muted/60">
              <Lock className="mr-2 inline h-4 w-4 text-brand" />
              Password is protected via SSO. Manage access via your identity provider.
            </div>
            <button className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg">Save changes</button>
          </div>
        )}
        {activeTab === 'organization' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-fg">Organization</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Organization name
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="Northwind Manufacturing" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Industry
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="Industrial Manufacturing" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Time zone
                <select className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand">
                  <option>GMT-06:00 — Central Time</option>
                  <option>GMT-05:00 — Eastern Time</option>
                  <option>GMT-08:00 — Pacific Time</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Domain
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="maintenance.northwind.com" />
              </label>
            </div>
            <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4 text-sm text-mutedfg">
              <p className="font-semibold text-fg">Team invitations</p>
              <p className="mt-1">Send invites to <span className="font-semibold text-fg">techteam@northwind.com</span>. Invites expire after 7 days.</p>
            </div>
          </div>
        )}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-fg">Billing</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-white/70 p-4 shadow-inner dark:bg-muted/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">Current plan</p>
                <p className="mt-2 text-lg font-semibold text-fg">Scale - $1,000/mo</p>
                <p className="mt-1 text-sm text-mutedfg">Includes 50 technicians, priority support, and predictive analytics.</p>
              </div>
              <label className="block text-sm font-semibold text-mutedfg">
                Billing email
                <input type="email" className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="finance@northwind.com" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Payment method
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-fg shadow-inner">
                  <CreditCard className="h-4 w-4 text-brand" />
                  Visa ending in 4421 — Expires 08/27
                </div>
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Purchase order
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" placeholder="Optional" />
              </label>
            </div>
            <button className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg">Download invoices</button>
          </div>
        )}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-fg">Integrations</h2>
              <p className="mt-2 text-sm text-mutedfg">
                Configure outbound webhooks to mirror WorkPro events into your ERP, analytics, or messaging platforms.
              </p>
            </div>
            <form
              onSubmit={handleCreateWebhook}
              className="space-y-4 rounded-2xl border border-border bg-white/70 p-4 shadow-inner dark:bg-muted/70"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-mutedfg">
                  Integration name
                  <input
                    value={webhookName}
                    onChange={(event) => setWebhookName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="e.g. SAP Plant Maintenance"
                    required
                  />
                </label>
                <label className="block text-sm font-semibold text-mutedfg">
                  Callback URL
                  <input
                    value={webhookUrl}
                    onChange={(event) => setWebhookUrl(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="https://example.com/webhooks/workpro"
                    required
                  />
                </label>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-mutedfg">Events</legend>
                <div className="flex flex-wrap gap-2">
                  {INTEGRATION_EVENTS.map((event) => {
                    const checked = selectedWebhookEvents.has(event);
                    return (
                      <label
                        key={event}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          checked ? 'border-brand bg-brand/10 text-brand' : 'border-border text-mutedfg'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEvent(event)}
                          className="h-3 w-3 accent-brand"
                        />
                        {formatEventLabel(event)}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-mutedfg">
                  Signing secret
                  <input
                    value={webhookSecret}
                    onChange={(event) => setWebhookSecret(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Optional shared secret"
                  />
                </label>
                <label className="block text-sm font-semibold text-mutedfg">
                  Custom headers (JSON)
                  <textarea
                    value={webhookHeaders}
                    onChange={(event) => setWebhookHeaders(event.target.value)}
                    className="mt-2 h-24 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder='{"X-Correlation": "WorkPro"}'
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-mutedfg">
                <input
                  type="checkbox"
                  checked={webhookActive}
                  onChange={(event) => setWebhookActive(event.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
                Send events to this webhook
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-mutedfg">
                <span>Secrets are hashed before storage and used to sign the <code>X-Webhook-Signature</code> header.</span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
                  disabled={createWebhookMutation.isPending}
                >
                  {createWebhookMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  Save webhook
                </button>
              </div>
            </form>
            {webhookError && (
              <div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {webhookError}
              </div>
            )}
            {webhookSuccess && (
              <div className="flex items-center gap-2 rounded-2xl border border-success/40 bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                {webhookSuccess}
              </div>
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-mutedfg">Registered webhooks</h3>
              {webhooksQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-mutedfg">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading webhooks…
                </div>
              ) : webhooksQuery.isError ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {webhookLoadError}
                </div>
              ) : webhooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-mutedfg">
                  No webhooks configured yet. Create one to start receiving WorkPro events.
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="space-y-3 rounded-2xl border border-border bg-white/70 p-4 shadow-inner dark:bg-muted/70">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-fg">{webhook.name}</p>
                          <p className="break-all text-xs text-mutedfg">{webhook.url}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            webhook.active ? 'bg-success/10 text-success' : 'bg-muted text-mutedfg'
                          }`}
                        >
                          {webhook.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-mutedfg">
                        {webhook.events.map((event) => (
                          <span key={event} className="rounded-full bg-muted px-3 py-1 text-mutedfg">
                            {formatEventLabel(event)}
                          </span>
                        ))}
                      </div>
                      <div className="grid gap-2 text-xs text-mutedfg md:grid-cols-2 lg:grid-cols-4">
                        <p>
                          <span className="font-semibold text-fg">Last success:</span> {formatDateTime(webhook.lastSuccessAt ?? null)}
                        </p>
                        <p>
                          <span className="font-semibold text-fg">Last attempt:</span> {formatDateTime(webhook.lastAttemptAt ?? null)}
                        </p>
                        <p>
                          <span className="font-semibold text-fg">Retries:</span> {webhook.retryCount}
                        </p>
                        <p>
                          <span className="font-semibold text-fg">Secret:</span> {webhook.secretSet ? 'Configured' : 'Not set'}
                        </p>
                      </div>
                      {webhook.lastErrorMessage && (
                        <p className="rounded-2xl bg-destructive/10 p-2 text-xs text-destructive">
                          Last error: {webhook.lastErrorMessage}
                        </p>
                      )}
                      {Object.keys(webhook.headers).length > 0 && (
                        <p className="text-xs text-mutedfg">
                          Headers:{' '}
                          {Object.entries(webhook.headers)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => testWebhookMutation.mutate(webhook.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand disabled:opacity-60"
                          disabled={testWebhookMutation.isPending && testWebhookMutation.variables === webhook.id}
                        >
                          <Zap className="h-3 w-3" /> Trigger test
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleWebhookMutation.mutate({ id: webhook.id, active: !webhook.active })}
                          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-mutedfg disabled:opacity-60"
                          disabled={toggleWebhookMutation.isPending && toggleWebhookMutation.variables?.id === webhook.id}
                        >
                          {webhook.active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {webhook.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-destructive hover:border-destructive disabled:opacity-60"
                          disabled={deleteWebhookMutation.isPending && deleteWebhookMutation.variables === webhook.id}
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-fg">API Keys</h2>
              <p className="mt-2 text-sm text-mutedfg">
                Rotate credentials regularly and scope access to the minimum necessary permissions. Keys are tenant scoped and hashed at rest.
              </p>
            </div>
            <form
              onSubmit={handleCreateKey}
              className="space-y-4 rounded-2xl border border-border bg-white/70 p-4 shadow-inner dark:bg-muted/70"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-mutedfg">
                  Key name
                  <input
                    value={keyName}
                    onChange={(event) => setKeyName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="e.g. Production integration"
                    required
                  />
                </label>
                <label className="block text-sm font-semibold text-mutedfg">
                  Description
                  <input
                    value={keyDescription}
                    onChange={(event) => setKeyDescription(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Optional notes"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-mutedfg">
                <span>The generated token is shown once. Store it securely before closing this page.</span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
                  disabled={createApiKeyMutation.isPending}
                >
                  {createApiKeyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Generate API key
                </button>
              </div>
            </form>
            {keyError && (
              <div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {keyError}
              </div>
            )}
            {generatedKey && (
              <div className="rounded-2xl border border-brand/40 bg-brand/10 p-4 shadow-inner">
                <p className="text-sm font-semibold text-fg">{generatedKey.name}</p>
                <p className="text-xs text-mutedfg">Copy this token now. It will not be displayed again.</p>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-2 text-sm text-mutedfg shadow-inner">
                  <input readOnly value={generatedKey.token} className="flex-1 bg-transparent text-sm text-fg outline-none" />
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedKey.token, generatedKey.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand"
                  >
                    <Copy className="h-3 w-3" />
                    {copyState === generatedKey.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-mutedfg">Existing keys</h3>
              {keysQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-mutedfg">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading keys…
                </div>
              ) : keysQuery.isError ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {keyLoadError}
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-mutedfg">
                  No API keys yet. Generate one to authenticate external integrations.
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="rounded-2xl border border-border bg-white/70 p-4 shadow-inner dark:bg-muted/70">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-fg">{key.name}</p>
                          <p className="text-xs text-mutedfg">Created {formatDateTime(key.createdAt)}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            key.revokedAt ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
                          }`}
                        >
                          {key.revokedAt ? 'Revoked' : 'Active'}
                        </span>
                      </div>
                      {key.description && <p className="mt-2 text-xs text-mutedfg">{key.description}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-mutedfg">
                        <span className="rounded-full bg-muted px-3 py-1 font-semibold text-mutedfg">
                          {`${key.prefix}••••${key.lastFour}`}
                        </span>
                        <span>Last used: {formatDateTime(key.lastUsedAt ?? null)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-mutedfg">
                        <span>Updated {formatDateTime(key.updatedAt)}</span>
                        <button
                          type="button"
                          onClick={() => revokeApiKeyMutation.mutate(key.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-destructive hover:border-destructive disabled:opacity-60"
                          disabled={revokeApiKeyMutation.isPending || Boolean(key.revokedAt)}
                        >
                          <Trash2 className="h-3 w-3" /> Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-fg">Security checklist</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[{ label: 'SSO Enforced', status: 'Enabled', icon: ShieldCheck }, { label: 'SCIM Provisioning', status: 'Enabled', icon: Zap }, { label: 'Weekly audit log digest', status: 'Email', icon: Mail }, { label: 'Backups', status: 'Nightly', icon: Banknote }].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 text-sm text-mutedfg shadow-inner dark:bg-muted/70">
                <Icon className="h-5 w-5 text-brand" />
                <div>
                  <p className="font-semibold text-fg">{item.label}</p>
                  <p>{item.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
