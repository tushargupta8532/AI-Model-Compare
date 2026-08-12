import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Filter,
  GitCompare,
  Info,
  Layers3,
  LibraryBig,
  Menu,
  MessageSquareText,
  Pin,
  PinOff,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  getCompareModelsQueryKey,
  getGetCatalogSummaryQueryKey,
  getGetModelQueryKey,
  getListChangelogQueryKey,
  getListGlossaryQueryKey,
  getListModelsQueryKey,
  type CatalogSummary,
  type ChangelogEntry,
  type GlossaryTerm,
  type ListModelsParams,
  type ModelProfile,
  type ModelSummary,
  useCompareModels,
  useGetCatalogSummary,
  useGetModel,
  useListChangelog,
  useListGlossary,
  useListModels,
  useSubmitFeedback,
} from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, useRoute } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';

const queryClient = new QueryClient();

type NavItem = { href: string; label: string; detail: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { href: '/', label: 'Overview', detail: 'catalog pulse', icon: Radar },
  { href: '/models', label: 'Model directory', detail: 'search & filter', icon: LibraryBig },
  { href: '/compare', label: 'Compare', detail: 'shortlist builder', icon: GitCompare },
  { href: '/glossary', label: 'Glossary', detail: 'shared language', icon: BookOpen },
  { href: '/changelog', label: 'Changelog', detail: 'source trail', icon: FileText },
];

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  if (value === 0) return 'free';
  return `$${value < 1 ? value.toFixed(2) : value.toFixed(2)}`;
}

function formatContext(tokens: number | null | undefined) {
  if (!tokens) return '—';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 ? 1 : 0)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

function formatDate(date: string | undefined, withYear = false) {
  if (!date) return 'Not available';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
}

function daysAgo(date: string | undefined) {
  if (!date) return '';
  const days = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 86_400_000));
  return days === 0 ? 'today' : `${days}d ago`;
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = (href: string) => href === '/' ? location === '/' : location.startsWith(href);

  return (
    <div className="atlas-shell flex min-h-[100dvh]">
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-[268px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:static md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-6">
          <Link href="/" className="focus-ring flex items-center gap-3" data-testid="link-brand">
            <span className="flex h-9 w-9 items-center justify-center border border-sidebar-primary/60 text-sidebar-primary">
              <span className="h-3 w-3 rounded-full bg-sidebar-primary" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-[-.03em]">Model Atlas</span>
              <span className="mono mt-0.5 block text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/50">research workspace</span>
            </span>
          </Link>
          <button type="button" className="focus-ring rounded p-1 text-sidebar-foreground/70 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X size={18} /></button>
        </div>
        <div className="px-4 pt-8">
          <div className="eyebrow px-3 text-sidebar-foreground/40">Navigate</div>
          <nav className="mt-3 space-y-1" aria-label="Main navigation">
            {navItems.map(({ href, label, detail, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`focus-ring group flex items-center gap-3 rounded-md border px-3 py-3 transition-all duration-200 ${active(href) ? 'border-sidebar-primary/30 bg-sidebar-primary/10 text-sidebar-primary' : 'border-transparent text-sidebar-foreground/65 hover:border-sidebar-border hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
                <Icon size={16} strokeWidth={active(href) ? 2.2 : 1.7} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{label}</span>
                  <span className="mono block truncate text-[9px] uppercase tracking-[.12em] opacity-45">{detail}</span>
                </span>
                {active(href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto px-6 pb-6">
          <div className="border-t border-sidebar-border pt-5">
            <div className="flex items-start gap-2 text-sidebar-foreground/45">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-sidebar-primary" />
              <p className="m-0 text-[11px] leading-relaxed">Every number carries a source date. Verify the signal before you ship.</p>
            </div>
            <div className="mono mt-5 text-[9px] uppercase tracking-[.14em] text-sidebar-foreground/30">Atlas protocol / v0.1</div>
          </div>
        </div>
      </aside>
      {menuOpen && <button type="button" className="fixed inset-0 z-20 bg-foreground/20 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation overlay" data-testid="button-navigation-overlay" />}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur md:px-10">
          <button type="button" className="focus-ring rounded p-2 text-muted-foreground md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-muted-foreground md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="mono text-[10px] uppercase tracking-[.15em]">Live catalog</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/glossary" className="focus-ring hidden items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground sm:flex" data-testid="link-header-glossary"><CircleHelp size={15} /> Need a definition?</Link>
            <Link href="/compare" className="focus-ring flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-[12px] font-medium text-secondary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-header-compare"><GitCompare size={14} /> <span className="hidden sm:inline">Build comparison</span></Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function PageFrame({ eyebrow, title, description, children, actions }: { eyebrow: string; title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="page-enter mx-auto w-full max-w-[1440px] px-5 py-9 md:px-10 md:py-12">
      <div className="mb-10 flex flex-col justify-between gap-5 border-b border-border pb-8 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="eyebrow mb-4 text-primary">{eyebrow}</div>
          <h1 className="display m-0 text-4xl font-semibold leading-[.98] text-foreground md:text-6xl">{title}</h1>
          {description && <p className="mb-0 mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function LoadingState({ label = 'Reading the catalog' }: { label?: string }) {
  return (
    <div className="space-y-5" data-testid="status-loading">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="instrument-card h-32 rounded-lg p-5"><div className="skeleton h-3 w-20 rounded" /><div className="skeleton mt-5 h-8 w-28 rounded" /><div className="skeleton mt-3 h-2 w-36 rounded" /></div>)}
      </div>
      <div className="instrument-card h-72 rounded-lg p-6"><div className="skeleton h-4 w-48 rounded" /><div className="skeleton mt-8 h-44 w-full rounded" /></div>
      <p className="mono text-center text-[10px] uppercase tracking-[.15em] text-muted-foreground">{label}</p>
    </div>
  );
}

function ErrorState({ onRetry, label = 'The catalog could not be reached.' }: { onRetry: () => void; label?: string }) {
  return (
    <div className="instrument-card flex min-h-52 flex-col items-center justify-center rounded-lg px-6 text-center" data-testid="status-error">
      <CircleAlert size={25} className="text-accent" />
      <h2 className="mt-4 text-base font-semibold">{label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Try again, or check back after the source service recovers.</p>
      <button type="button" onClick={onRetry} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:border-primary hover:text-primary" data-testid="button-retry"><RefreshCw size={14} /> Retry</button>
    </div>
  );
}

function MetricCard({ label, value, note, accent = false, testId }: { label: string; value: string | number; note: string; accent?: boolean; testId: string }) {
  return (
    <div className={`instrument-card rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 ${accent ? 'border-primary/40 bg-primary/[.045]' : ''}`} data-testid={testId}>
      <div className="flex items-start justify-between">
        <span className="eyebrow text-muted-foreground">{label}</span>
        {accent ? <ArrowUpRight size={16} className="text-primary" /> : <span className="h-2 w-2 rounded-full bg-border" />}
      </div>
      <div className="display mt-5 text-3xl font-semibold">{value}</div>
      <div className="mono mt-2 text-[10px] uppercase tracking-[.1em] text-muted-foreground">{note}</div>
    </div>
  );
}

function Home() {
  const summaryQuery = useGetCatalogSummary({ query: { queryKey: getGetCatalogSummaryQueryKey() } });
  const modelsQuery = useListModels(undefined, { query: { queryKey: getListModelsQueryKey() } });
  const summary = summaryQuery.data as CatalogSummary | undefined;
  const models = (modelsQuery.data ?? []) as ModelSummary[];
  const featured = useMemo(() => [...models].sort((a, b) => b.capabilityScore - a.capabilityScore).slice(0, 4), [models]);
  const valuePicks = useMemo(() => [...models].sort((a, b) => (b.capabilityScore / Math.max(.1, b.inputPricePerM + b.outputPricePerM)) - (a.capabilityScore / Math.max(.1, a.inputPricePerM + a.outputPricePerM))).slice(0, 3), [models]);

  if (summaryQuery.isLoading || modelsQuery.isLoading) return <PageFrame eyebrow="Catalog / pulse" title="A clearer read on model choice." description="A research instrument for turning a vague model brief into a defensible shortlist."><LoadingState /></PageFrame>;
  if (summaryQuery.isError || modelsQuery.isError) return <PageFrame eyebrow="Catalog / pulse" title="The signal is interrupted." description="We could not load the overview data."><ErrorState onRetry={() => { void summaryQuery.refetch(); void modelsQuery.refetch(); }} /></PageFrame>;

  return (
    <PageFrame eyebrow="Catalog / pulse" title="A clearer read on model choice." description="Compare capability, cost, deployment fit, and evidence in one working surface. The catalog is opinionated about what is known — and explicit about what is not." actions={<Link href="/models" className="focus-ring inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-browse-directory">Browse directory <ChevronRight size={16} /></Link>}>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Models tracked" value={summary?.modelCount ?? models.length} note={`${summary?.providerCount ?? '—'} providers represented`} accent testId="metric-model-count" />
        <MetricCard label="Benchmarks indexed" value={summary?.benchmarkCount ?? '—'} note="scored, dated, source-linked" testId="metric-benchmark-count" />
        <MetricCard label="Verification age" value={summary?.medianVerificationAgeDays !== undefined ? `${summary.medianVerificationAgeDays}d` : '—'} note="median since last review" testId="metric-verification-age" />
        <MetricCard label="Price movement" value={summary?.priceTrend ?? 'Stable'} note="catalog readout" testId="metric-price-trend" />
      </section>

      <section className="mt-10 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="instrument-card rounded-lg p-6 md:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="eyebrow text-primary">01 / featured signal</div>
              <h2 className="display mt-3 text-2xl font-semibold">Capability leaders, with context.</h2>
              <p className="mt-2 text-sm text-muted-foreground">A high score is a starting point — not a shipping decision.</p>
            </div>
            <span className="mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">Updated {formatDate(summary?.lastUpdated)}</span>
          </div>
          <div className="mt-7 divide-y divide-border">
            {(summary?.capabilityLeaders?.length ? summary.capabilityLeaders : featured.map((model) => ({ category: 'General capability', model: model.name, score: model.capabilityScore }))).slice(0, 4).map((leader, index) => (
              <div key={`${leader.category}-${leader.model}`} className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0" data-testid={`signal-leader-${index}`}>
                <span className="mono w-6 text-[11px] text-muted-foreground">0{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="truncate text-sm font-medium">{leader.model}</span>
                    <span className="mono text-xs text-primary">{leader.score.toFixed(1)} / 5</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="signal-line" style={{ width: `${Math.min(100, leader.score / 5 * 100)}%` }} /></div>
                  <span className="mono mt-2 block text-[9px] uppercase tracking-[.1em] text-muted-foreground">{leader.category}</span>
                </div>
              </div>
            ))}
            {!featured.length && <EmptyState title="No model signals yet" body="The catalog is empty. Check back after the first import." />}
          </div>
        </div>
        <div className="rounded-lg bg-secondary p-6 text-secondary-foreground md:p-8">
          <div className="eyebrow text-sidebar-primary">02 / method note</div>
          <h2 className="display mt-3 text-2xl font-semibold">Defensible by design.</h2>
          <p className="mt-4 text-sm leading-relaxed text-secondary-foreground/70">Atlas keeps the tradeoffs visible: prices are per million tokens, capability ratings are editorial, and every profile exposes the date and source behind its claims.</p>
          <div className="mt-8 border-t border-secondary-foreground/15 pt-5">
            <div className="flex items-start gap-3">
              <ClipboardCheck size={18} className="mt-0.5 shrink-0 text-sidebar-primary" />
              <div><div className="text-sm font-medium">Start with constraints</div><div className="mt-1 text-xs leading-relaxed text-secondary-foreground/60">Context, deployment, retention, and budget are often more decisive than the leaderboard.</div></div>
            </div>
            <Link href="/glossary" className="focus-ring mt-6 inline-flex items-center gap-2 text-xs font-medium text-sidebar-primary hover:underline" data-testid="link-read-methodology">Read the field guide <ArrowUpRight size={14} /></Link>
          </div>
        </div>
      </section>

      <section className="instrument-card mt-5 rounded-lg p-6 md:p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div><div className="eyebrow text-primary">03 / cost × capability</div><h2 className="display mt-3 text-2xl font-semibold">Where the shortlist starts to separate.</h2></div>
          <span className="mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">Input + output / $ per M tokens</span>
        </div>
        <div className="mt-8 overflow-x-auto">
          <div className="relative h-[280px] min-w-[620px] border-b border-l border-border">
            <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-border/70" /><div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/70" /><div className="absolute inset-x-0 top-3/4 border-t border-dashed border-border/70" />
            <span className="mono absolute -left-1 top-full mt-3 -translate-x-full text-[9px] text-muted-foreground">low cost</span><span className="mono absolute right-0 top-full mt-3 translate-x-0 text-[9px] text-muted-foreground">high cost</span>
            <span className="mono absolute -left-8 bottom-0 -rotate-90 text-[9px] text-muted-foreground">capability</span>
            {models.slice(0, 12).map((model, index) => {
              const maxCost = Math.max(...models.map((item) => item.inputPricePerM + item.outputPricePerM), 1);
              const x = Math.min(91, Math.max(4, ((model.inputPricePerM + model.outputPricePerM) / maxCost) * 88 + 3));
              const y = Math.min(92, Math.max(7, 96 - model.capabilityScore / 5 * 88));
              return <Link href={`/models/${model.slug}`} key={model.id} className="focus-ring group absolute -translate-x-1/2 translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }} data-testid={`plot-model-${model.slug}`}><span className={`block h-3 w-3 rounded-full border-2 border-background transition-transform duration-200 group-hover:scale-[1.8] ${index < 3 ? 'bg-accent' : 'bg-primary'}`} /><span className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-secondary px-2 py-1 text-[10px] text-secondary-foreground group-hover:block">{model.name}</span></Link>;
            })}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between border-b border-border pb-4"><div><div className="eyebrow text-primary">04 / value lens</div><h2 className="display mt-2 text-2xl font-semibold">Three efficient starting points.</h2></div><Link href="/models" className="focus-ring hidden items-center gap-1 text-xs font-medium text-primary sm:flex" data-testid="link-see-all-models">See all models <ArrowUpRight size={14} /></Link></div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {valuePicks.map((model, index) => <ModelSignalCard key={model.id} model={model} rank={index + 1} />)}
          {!valuePicks.length && <EmptyState title="Value picks are waiting" body="Once model pricing is indexed, this lens will populate." />}
        </div>
      </section>
    </PageFrame>
  );
}

function ModelSignalCard({ model, rank }: { model: ModelSummary; rank: number }) {
  return (
    <Link href={`/models/${model.slug}`} className="instrument-card focus-ring group rounded-lg p-5 transition-all duration-300 hover:-translate-y-1" data-testid={`card-value-model-${model.slug}`}>
      <div className="flex items-center justify-between"><span className="mono text-[10px] text-muted-foreground">0{rank} / value</span><ArrowUpRight size={15} className="text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div>
      <div className="mt-8 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-xs font-semibold text-primary">{initials(model.name)}</span><div><h3 className="m-0 text-sm font-semibold">{model.name}</h3><p className="mono m-0 mt-1 text-[10px] uppercase tracking-[.1em] text-muted-foreground">{model.provider.name}</p></div></div>
      <div className="mt-7 flex items-end justify-between"><div><span className="mono block text-[9px] uppercase tracking-[.1em] text-muted-foreground">capability</span><span className="number-tick text-xl">{model.capabilityScore.toFixed(1)}</span></div><div className="text-right"><span className="mono block text-[9px] uppercase tracking-[.1em] text-muted-foreground">blended / M</span><span className="text-sm font-medium">{formatPrice(model.inputPricePerM + model.outputPricePerM)}</span></div></div>
    </Link>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-8 text-center" data-testid="status-empty"><Layers3 size={20} className="text-muted-foreground" /><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 max-w-sm text-xs text-muted-foreground">{body}</p></div>;
}

function Models() {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [modality, setModality] = useState('');
  const [deployment, setDeployment] = useState('');
  const [openWeights, setOpenWeights] = useState(false);
  const [sort, setSort] = useState<ListModelsParams['sort']>('capability');
  const [selected, setSelected] = useState<string[]>([]);
  const params = useMemo<ListModelsParams>(() => ({ search: search || undefined, provider: provider || undefined, modality: modality || undefined, deployment: deployment || undefined, openWeights: openWeights || undefined, sort }), [deployment, modality, openWeights, provider, search, sort]);
  const query = useListModels(params, { query: { queryKey: getListModelsQueryKey(params) } });
  const models = (query.data ?? []) as ModelSummary[];
  const providers = useMemo(() => Array.from(new Map(models.map((model) => [model.provider.id, model.provider.name])).entries()), [models]);
  const modalities = useMemo(() => Array.from(new Set(models.flatMap((model) => model.modalities))).sort(), [models]);
  const deployments = useMemo(() => Array.from(new Set(models.flatMap((model) => model.deploymentOptions))).sort(), [models]);
  const toggleSelected = (slug: string) => setSelected((current) => current.includes(slug) ? current.filter((item) => item !== slug) : current.length < 4 ? [...current, slug] : current);
  const [, setLocation] = useLocation();
  const clearFilters = () => { setSearch(''); setProvider(''); setModality(''); setDeployment(''); setOpenWeights(false); };

  return (
    <PageFrame eyebrow="Directory / working set" title="Find the model that fits the brief." description="Search the catalog, narrow the constraints, and pin a working set. Sort by the signal you care about — the table keeps the tradeoffs visible." actions={<button type="button" onClick={() => setLocation(`/compare${selected.length ? `?models=${selected.join(',')}` : ''}`)} disabled={selected.length < 2} className="focus-ring inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-compare-selected"><GitCompare size={15} /> Compare {selected.length > 0 ? `${selected.length}` : 'selected'}</button>}>
      <div className="instrument-card rounded-lg p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by model, provider, family, or modality" className="focus-ring h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground/70" data-testid="input-model-search" /></div>
          <div className="flex flex-wrap items-center gap-2"><Filter size={15} className="mr-1 text-primary" /><select value={provider} onChange={(event) => setProvider(event.target.value)} className="focus-ring h-10 rounded-md border border-input bg-background px-3 text-xs outline-none" data-testid="select-provider-filter"><option value="">All providers</option>{providers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select value={modality} onChange={(event) => setModality(event.target.value)} className="focus-ring h-10 rounded-md border border-input bg-background px-3 text-xs outline-none" data-testid="select-modality-filter"><option value="">Any modality</option>{modalities.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={deployment} onChange={(event) => setDeployment(event.target.value)} className="focus-ring h-10 rounded-md border border-input bg-background px-3 text-xs outline-none" data-testid="select-deployment-filter"><option value="">Any deployment</option>{deployments.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={openWeights} onChange={(event) => setOpenWeights(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" data-testid="input-open-weights" /> Open weights only</label>
          <div className="flex items-center gap-2"><span className="mono text-[10px] uppercase tracking-[.1em] text-muted-foreground">Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as ListModelsParams['sort'])} className="focus-ring rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none" data-testid="select-model-sort"><option value="capability">Capability</option><option value="price">Price</option><option value="context">Context</option><option value="name">Name</option></select><button type="button" onClick={clearFilters} className="focus-ring ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid="button-clear-filters"><X size={13} /> Clear</button></div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between"><div className="mono text-[10px] uppercase tracking-[.12em] text-muted-foreground" data-testid="text-result-count">{models.length} records / {selected.length} pinned for comparison</div>{selected.length > 0 && <button type="button" onClick={() => setSelected([])} className="focus-ring text-xs text-primary hover:underline" data-testid="button-clear-comparison">Clear comparison set</button>}</div>
      <div className="instrument-card mt-3 overflow-hidden rounded-lg">
        {query.isLoading ? <div className="p-5"><LoadingState label="Indexing matching models" /></div> : query.isError ? <div className="p-5"><ErrorState onRetry={() => void query.refetch()} /></div> : models.length === 0 ? <div className="p-5"><EmptyState title="No models match those constraints" body="Loosen a filter or search the full catalog." /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[960px] border-collapse text-left"><thead><tr className="border-b border-border bg-muted/50">{['Model', 'Capability', 'Context', 'Modalities', 'Input / M', 'Deploy', 'Verified', ''].map((header) => <th key={header} className="mono px-5 py-3 text-[9px] uppercase tracking-[.12em] text-muted-foreground">{header}</th>)}</tr></thead><tbody>{models.map((model) => <ModelRow key={model.id} model={model} selected={selected.includes(model.slug)} onToggle={() => toggleSelected(model.slug)} />)}</tbody></table></div>}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Info size={14} className="text-primary" /> Pricing is shown per million tokens. Verification dates indicate when the source was last reviewed.</p>
    </PageFrame>
  );
}

function ModelRow({ model, selected, onToggle }: { model: ModelSummary; selected: boolean; onToggle: () => void }) {
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem('atlas-pins') ?? '[]').includes(model.slug); } catch { return false; }
  });
  const togglePin = () => {
    setPinned((current: boolean) => {
      const pins = (() => { try { return JSON.parse(localStorage.getItem('atlas-pins') ?? '[]') as string[]; } catch { return []; } })();
      const next = current ? pins.filter((item) => item !== model.slug) : [...pins, model.slug];
      localStorage.setItem('atlas-pins', JSON.stringify(next));
      return !current;
    });
  };
  return <tr className={`group border-b border-border/70 transition-colors last:border-0 hover:bg-primary/[.035] ${selected ? 'bg-primary/[.055]' : ''}`} data-testid={`row-model-${model.slug}`}>
    <td className="px-5 py-4"><div className="flex items-center gap-3"><button type="button" onClick={onToggle} className={`focus-ring flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`} aria-label={`${selected ? 'Remove' : 'Add'} ${model.name} from comparison`} data-testid={`button-compare-${model.slug}`}>{selected ? <Check size={14} /> : <GitCompare size={13} />}</button><Link href={`/models/${model.slug}`} className="focus-ring min-w-0" data-testid={`link-model-${model.slug}`}><div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-semibold text-primary">{initials(model.name)}</span><span className="truncate text-sm font-semibold group-hover:text-primary">{model.name}</span></div><span className="mono ml-9 mt-1 block text-[9px] uppercase tracking-[.1em] text-muted-foreground">{model.provider.name} / {model.family}</span></Link></div></td>
    <td className="px-5 py-4"><span className="number-tick text-sm">{model.capabilityScore.toFixed(1)}</span><span className="mono ml-1 text-[9px] text-muted-foreground">/ 5</span></td>
    <td className="px-5 py-4"><span className="mono text-xs">{formatContext(model.contextWindow)}</span></td>
    <td className="px-5 py-4"><div className="flex max-w-[145px] flex-wrap gap-1">{model.modalities.slice(0, 3).map((item) => <span key={item} className="rounded bg-muted px-1.5 py-1 text-[10px] text-muted-foreground">{item}</span>)}</div></td>
    <td className="px-5 py-4"><span className="mono text-xs">{formatPrice(model.inputPricePerM)}</span></td>
    <td className="px-5 py-4"><span className="text-xs text-muted-foreground">{model.deploymentOptions[0] ?? '—'}</span></td>
    <td className="px-5 py-4"><span className="mono block text-[10px]">{formatDate(model.lastVerifiedAt)}</span><span className="mono mt-1 block text-[9px] text-muted-foreground">{daysAgo(model.lastVerifiedAt)}</span></td>
    <td className="px-5 py-4"><button type="button" onClick={togglePin} className={`focus-ring rounded p-2 transition-colors ${pinned ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`} aria-label={`${pinned ? 'Unpin' : 'Pin'} ${model.name}`} data-testid={`button-pin-${model.slug}`}>{pinned ? <Pin size={15} fill="currentColor" /> : <PinOff size={15} />}</button></td>
  </tr>;
}

function Profile() {
  const [, params] = useRoute('/models/:slug');
  const slug = params?.slug ?? '';
  const query = useGetModel(slug, { query: { enabled: Boolean(slug), queryKey: getGetModelQueryKey(slug) } });
  const profile = query.data as ModelProfile | undefined;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  if (query.isLoading) return <PageFrame eyebrow="Profile / loading" title="Reading model record." description="Loading the full evidence sheet."><LoadingState /></PageFrame>;
  if (query.isError || !profile) return <PageFrame eyebrow="Profile / unavailable" title="This model record is not available." description="The requested slug may have moved, or the source service is temporarily unavailable."><ErrorState onRetry={() => void query.refetch()} /></PageFrame>;
  return <PageFrame eyebrow={`Profile / ${profile.provider.name}`} title={profile.name} description={`${profile.family} · ${profile.license} · last verified ${formatDate(profile.lastVerifiedAt, true)}`} actions={<><Link href={`/compare?models=${profile.slug}`} className="focus-ring inline-flex items-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary" data-testid="link-compare-profile"><GitCompare size={15} /> Compare</Link><a href={profile.sourceUrl} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-primary-source">Primary source <ExternalLink size={14} /></a></>}>
    <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-5">
        <section className="instrument-card rounded-lg p-6 md:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row"><div><div className="eyebrow text-primary">Capability readout</div><div className="mt-4 flex items-end gap-3"><span className="display text-6xl font-semibold text-primary">{profile.capabilityScore.toFixed(1)}</span><span className="mono pb-2 text-xs text-muted-foreground">/ 5 editorial score</span></div></div><div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-xl font-semibold text-primary">{initials(profile.name)}</div></div><div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">{profile.capabilities.map((capability) => <div key={capability.category}><div className="flex items-center justify-between text-xs"><span className="font-medium">{capability.category}</span><span className="mono text-primary">{capability.score.toFixed(1)}</span></div><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${capability.score / 5 * 100}%` }} /></div>{capability.notes && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{capability.notes}</p>}</div>)}</div></section>
        <section className="instrument-card rounded-lg p-6 md:p-8"><SectionHeading eyebrow="Benchmarks" title="Evidence, not leaderboard theater." /><div className="mt-6 divide-y divide-border">{profile.benchmarks.map((benchmark) => <div key={`${benchmark.benchmark}-${benchmark.measuredAt}`} className="flex flex-col justify-between gap-2 py-4 first:pt-0 sm:flex-row sm:items-center"><div><div className="text-sm font-medium">{benchmark.benchmark}</div><div className="mono mt-1 text-[10px] text-muted-foreground">Measured {formatDate(benchmark.measuredAt, true)}</div></div><div className="flex items-center gap-3"><span className="number-tick text-lg">{benchmark.score}</span><span className="mono text-[10px] text-muted-foreground">{benchmark.scoreUnit}</span><a href={benchmark.sourceUrl} target="_blank" rel="noreferrer" className="focus-ring text-muted-foreground hover:text-primary" data-testid={`link-benchmark-source-${benchmark.benchmark}`}><ExternalLink size={14} /></a></div></div>)}</div>{!profile.benchmarks.length && <EmptyState title="No benchmark records" body="This profile has no benchmark evidence indexed yet." />}</section>
        <section className="instrument-card rounded-lg p-6 md:p-8"><SectionHeading eyebrow="Pricing history" title="What the meter actually costs." /><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="border-b border-border"><th className="mono pb-3 text-[9px] uppercase tracking-[.12em] text-muted-foreground">Tier</th><th className="mono pb-3 text-[9px] uppercase tracking-[.12em] text-muted-foreground">Input / M</th><th className="mono pb-3 text-[9px] uppercase tracking-[.12em] text-muted-foreground">Output / M</th><th className="mono pb-3 text-[9px] uppercase tracking-[.12em] text-muted-foreground">Effective</th></tr></thead><tbody>{profile.pricing.map((tier) => <tr key={`${tier.tierName}-${tier.effectiveDate}`} className="border-b border-border/70 last:border-0"><td className="py-3 text-sm font-medium">{tier.tierName}</td><td className="mono py-3 text-xs">{formatPrice(tier.inputPricePerM)}</td><td className="mono py-3 text-xs">{formatPrice(tier.outputPricePerM)}</td><td className="py-3 text-xs text-muted-foreground">{formatDate(tier.effectiveDate, true)}</td></tr>)}</tbody></table></div></section>
      </div>
      <aside className="space-y-5">
        <section className="instrument-card rounded-lg p-6"><SectionHeading eyebrow="Operating envelope" title="Fit before feature." /><div className="mt-6 space-y-4">{[['Context window', formatContext(profile.contextWindow)], ['Max output', formatContext(profile.maxOutputTokens)], ['Regions', profile.regionsAvailable.join(', ') || 'Not listed'], ['Retention', profile.dataRetentionDays === null ? 'Not disclosed' : `${profile.dataRetentionDays} days`], ['SDKs', profile.sdkLanguages.join(', ') || 'Not listed']].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0"><span className="text-xs text-muted-foreground">{label}</span><span className="text-right text-xs font-medium">{value}</span></div>)}</div></section>
        <section className="rounded-lg bg-secondary p-6 text-secondary-foreground"><div className="eyebrow text-sidebar-primary">Deployment & safety</div><div className="mt-5 space-y-3 text-sm"><StatusLine label="Function calling" value={profile.functionCalling} /><StatusLine label="Fine-tuning" value={profile.fineTuningSupport} /><StatusLine label="Training opt-out" value={profile.trainingOptOut} /><StatusLine label="Zero data retention" value={profile.zeroDataRetention} /></div><p className="mt-5 border-t border-secondary-foreground/15 pt-4 text-xs leading-relaxed text-secondary-foreground/65">{profile.safetyNotes}</p><a href={profile.safetyPolicyUrl} target="_blank" rel="noreferrer" className="focus-ring mt-4 inline-flex items-center gap-2 text-xs font-medium text-sidebar-primary hover:underline" data-testid="link-safety-policy">Read safety policy <ExternalLink size={13} /></a></section>
        <section className="instrument-card rounded-lg p-6"><SectionHeading eyebrow="Compliance" title="Procurement signals." /><div className="mt-5 flex flex-wrap gap-2">{profile.complianceCerts.length ? profile.complianceCerts.map((cert) => <span key={cert} className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[.06] px-2.5 py-1.5 text-[11px] text-primary"><ShieldCheck size={12} /> {cert}</span>) : <span className="text-xs text-muted-foreground">No certifications listed.</span>}</div><div className="mt-6 border-t border-border pt-4"><div className="mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">Available deployment</div><div className="mt-3 flex flex-wrap gap-2">{profile.deploymentOptions.map((option) => <span key={option} className="rounded bg-muted px-2 py-1 text-[11px]">{option}</span>)}</div></div></section>
        <section className="instrument-card rounded-lg p-6"><div className="flex items-start gap-3"><MessageSquareText size={18} className="mt-0.5 text-primary" /><div><h2 className="m-0 text-sm font-semibold">See something off?</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Send the editorial desk a source-backed correction.</p><button type="button" onClick={() => setFeedbackOpen((open) => !open)} className="focus-ring mt-4 text-xs font-medium text-primary hover:underline" data-testid="button-open-feedback">{feedbackOpen ? 'Close correction form' : 'Suggest a correction'}</button></div></div>{feedbackOpen && <FeedbackForm modelSlug={profile.slug} onClose={() => setFeedbackOpen(false)} />}</section>
      </aside>
    </div>
  </PageFrame>;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div><div className="eyebrow text-primary">{eyebrow}</div><h2 className="display mt-2 text-xl font-semibold">{title}</h2></div>;
}

function StatusLine({ label, value }: { label: string; value: boolean }) {
  return <div className="flex items-center justify-between border-b border-secondary-foreground/10 pb-3 last:border-0 last:pb-0"><span className="text-xs text-secondary-foreground/70">{label}</span><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${value ? 'text-sidebar-primary' : 'text-secondary-foreground/45'}`}><span className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-sidebar-primary' : 'bg-secondary-foreground/35'}`} />{value ? 'Yes' : 'No'}</span></div>;
}

function FeedbackForm({ modelSlug, onClose }: { modelSlug: string; onClose: () => void }) {
  const mutation = useSubmitFeedback();
  const [field, setField] = useState('general');
  const [note, setNote] = useState('');
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (note.trim().length < 5) return; mutation.mutate({ data: { modelSlug, field, note: note.trim() } }, { onSuccess: () => { setNote(''); } }); };
  return <form onSubmit={submit} className="mt-5 border-t border-border pt-5" data-testid="form-feedback"><label className="mono block text-[9px] uppercase tracking-[.12em] text-muted-foreground">Field<select value={field} onChange={(event) => setField(event.target.value)} className="focus-ring mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-xs outline-none" data-testid="select-feedback-field"><option value="general">General</option><option value="pricing">Pricing</option><option value="benchmark">Benchmark</option><option value="safety">Safety</option><option value="deployment">Deployment</option></select></label><label className="mono mt-4 block text-[9px] uppercase tracking-[.12em] text-muted-foreground">Correction note<textarea value={note} onChange={(event) => setNote(event.target.value)} minLength={5} rows={3} placeholder="What should be checked?" className="focus-ring mt-2 w-full resize-none rounded-md border border-input bg-background p-2 text-xs outline-none placeholder:text-muted-foreground/60" data-testid="textarea-feedback-note" /></label><button type="submit" disabled={mutation.isPending || note.trim().length < 5} className="focus-ring mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40" data-testid="button-submit-feedback">{mutation.isPending ? 'Sending…' : 'Send to editorial desk'}</button>{mutation.isError && <p className="mt-2 text-xs text-destructive" data-testid="status-feedback-error">Could not send. Try again.</p>}{mutation.data && <p className="mt-3 flex items-center gap-2 text-xs text-primary" data-testid="status-feedback-success"><Check size={13} /> {mutation.data.message}</p>}</form>;
}

function Compare() {
  const [location, setLocation] = useLocation();
  const selected = useMemo(() => Array.from(new Set((new URLSearchParams(location.split('?')[1] ?? '').get('models') ?? '').split(',').map((item) => item.trim()).filter(Boolean))).slice(0, 4), [location]);
  const [addSlug, setAddSlug] = useState('');
  const listQuery = useListModels(undefined, { query: { queryKey: getListModelsQueryKey() } });
  const allModels = (listQuery.data ?? []) as ModelSummary[];
  const compareParams = useMemo(() => ({ ids: selected.join(',') }), [selected]);
  const query = useCompareModels(compareParams, { query: { enabled: selected.length >= 2, queryKey: getCompareModelsQueryKey(compareParams) } });
  const addModel = () => { if (!addSlug || selected.includes(addSlug) || selected.length >= 4) return; const next = [...selected, addSlug]; setAddSlug(''); setLocation(`/compare?models=${next.join(',')}`); };
  const removeModel = (slug: string) => setLocation(`/compare?models=${selected.filter((item) => item !== slug).join(',')}`);
  const profiles = (query.data ?? []) as ModelProfile[];
  const profileBySlug = useMemo(() => new Map(profiles.map((profile) => [profile.slug, profile])), [profiles]);
  const fields = [{ label: 'Capability score', key: 'capabilityScore', render: (profile: ModelProfile) => `${profile.capabilityScore.toFixed(1)} / 5` }, { label: 'Context window', key: 'contextWindow', render: (profile: ModelProfile) => formatContext(profile.contextWindow) }, { label: 'Input / M tokens', key: 'inputPricePerM', render: (profile: ModelProfile) => formatPrice(profile.inputPricePerM) }, { label: 'Output / M tokens', key: 'outputPricePerM', render: (profile: ModelProfile) => formatPrice(profile.outputPricePerM) }, { label: 'Open weights', key: 'openWeights', render: (profile: ModelProfile) => profile.openWeights ? 'Yes' : 'No' }, { label: 'Function calling', key: 'functionCalling', render: (profile: ModelProfile) => profile.functionCalling ? 'Yes' : 'No' }, { label: 'Zero data retention', key: 'zeroDataRetention', render: (profile: ModelProfile) => profile.zeroDataRetention ? 'Yes' : 'No' }, { label: 'License', key: 'license', render: (profile: ModelProfile) => profile.license }, { label: 'Regions', key: 'regionsAvailable', render: (profile: ModelProfile) => profile.regionsAvailable.join(', ') || '—' }];
  return <PageFrame eyebrow="Compare / decision room" title="Make the tradeoffs legible." description="Keep two to four candidates in view, then share the URL with the team. Differences are surfaced field by field — no hidden weighting." actions={<Link href="/models" className="focus-ring inline-flex items-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium hover:border-primary hover:text-primary" data-testid="link-add-from-directory"><SlidersHorizontal size={15} /> Browse directory</Link>}>
    <div className="instrument-card rounded-lg p-4 md:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1"><span className="eyebrow text-muted-foreground">Add a candidate</span><select value={addSlug} onChange={(event) => setAddSlug(event.target.value)} className="focus-ring mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none" data-testid="select-compare-model"><option value="">Select a model…</option>{allModels.filter((model) => !selected.includes(model.slug)).map((model) => <option key={model.slug} value={model.slug}>{model.name} / {model.provider.name}</option>)}</select></label><button type="button" onClick={addModel} disabled={!addSlug || selected.length >= 4} className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40" data-testid="button-add-compare-model"><Check size={15} /> Add to room</button></div><div className="mt-4 flex flex-wrap gap-2">{selected.map((slug) => <span key={slug} className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[.06] px-3 py-1.5 text-xs text-primary">{profileBySlug.get(slug)?.name ?? allModels.find((model) => model.slug === slug)?.name ?? slug}<button type="button" onClick={() => removeModel(slug)} className="focus-ring rounded-full hover:text-accent" aria-label={`Remove ${slug}`} data-testid={`button-remove-compare-${slug}`}><X size={13} /></button></span>)}{!selected.length && <span className="text-xs text-muted-foreground">No candidates yet. Add two models to activate the decision room.</span>}</div></div>
    {selected.length < 2 ? <div className="mt-5"><EmptyState title="Two signals make a comparison" body="Choose at least two models above. The URL will update as you build a shareable room." /></div> : query.isLoading ? <div className="mt-5"><LoadingState label="Aligning model records" /></div> : query.isError ? <div className="mt-5"><ErrorState onRetry={() => void query.refetch()} /></div> : <div className="instrument-card mt-5 overflow-hidden rounded-lg"><div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="border-b border-border bg-muted/50"><th className="w-[190px] px-5 py-5"><span className="eyebrow text-primary">Signal / field</span></th>{selected.map((slug) => { const profile = profileBySlug.get(slug); return <th key={slug} className="min-w-[180px] px-5 py-5 align-top"><div className="flex items-start justify-between gap-2"><div><div className="text-sm font-semibold">{profile?.name ?? slug}</div><div className="mono mt-1 text-[9px] uppercase tracking-[.1em] text-muted-foreground">{profile?.provider.name ?? 'Loading'}</div></div><Link href={`/models/${slug}`} className="focus-ring text-primary" aria-label={`Open ${slug} profile`} data-testid={`link-compare-profile-${slug}`}><ArrowUpRight size={15} /></Link></div></th>; })}</tr></thead><tbody>{fields.map((field) => { const values = profiles.map((profile) => profile[field.key as keyof ModelProfile]); const comparable = values.filter((value): value is number => typeof value === 'number'); const best = field.key === 'inputPricePerM' || field.key === 'outputPricePerM' ? Math.min(...comparable) : Math.max(...comparable); return <tr key={field.key} className="border-b border-border/70 last:border-0"><th className="px-5 py-4 text-xs font-medium text-muted-foreground">{field.label}</th>{selected.map((slug) => { const profile = profileBySlug.get(slug); if (!profile) return <td key={slug} className="px-5 py-4"><span className="skeleton inline-block h-4 w-20 rounded" /></td>; const raw = profile[field.key as keyof ModelProfile]; const isBest = typeof raw === 'number' && raw === best && comparable.length > 1; return <td key={slug} className={`px-5 py-4 text-xs ${isBest ? 'bg-primary/[.07] font-semibold text-primary' : ''}`}><span className="flex items-center gap-2">{field.render(profile)}{isBest && <span className="mono rounded bg-primary px-1.5 py-0.5 text-[8px] uppercase text-primary-foreground">best</span>}</span></td>; })}</tr>; })}</tbody></table></div><div className="flex items-center gap-2 border-t border-border px-5 py-4 text-xs text-muted-foreground"><Info size={14} className="text-primary" /> Best is field-specific: lower is better for token price, higher for capability and context.</div></div>}
  </PageFrame>;
}

function Glossary() {
  const query = useListGlossary({ query: { queryKey: getListGlossaryQueryKey() } });
  const [search, setSearch] = useState('');
  const terms = (query.data ?? []) as GlossaryTerm[];
  const filtered = useMemo(() => terms.filter((term) => `${term.term} ${term.shortDefinition} ${term.detail}`.toLowerCase().includes(search.toLowerCase())), [search, terms]);
  return <PageFrame eyebrow="Reference / glossary" title="Shared language for model decisions." description="Short definitions for the terms that shape a comparison — with a path to the underlying source." actions={<div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a term" className="focus-ring h-10 w-48 rounded-md border border-input bg-background pl-9 pr-3 text-xs outline-none" data-testid="input-glossary-search" /></div>}>
    {query.isLoading ? <LoadingState label="Loading reference terms" /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : filtered.length === 0 ? <EmptyState title="No matching terms" body="Try a benchmark name, capability, or deployment phrase." /> : <div className="grid gap-4 md:grid-cols-2">{filtered.map((term, index) => <article key={term.term} className="instrument-card rounded-lg p-6 transition-all duration-300 hover:-translate-y-1" data-testid={`card-glossary-${index}`}><div className="flex items-start justify-between gap-4"><div><div className="eyebrow text-primary">Term / {String(index + 1).padStart(2, '0')}</div><h2 className="display mt-3 text-2xl font-semibold">{term.term}</h2></div><BookOpen size={18} className="text-muted-foreground" /></div><p className="mt-5 text-sm font-medium leading-relaxed">{term.shortDefinition}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{term.detail}</p><a href={term.sourceUrl} target="_blank" rel="noreferrer" className="focus-ring mt-6 inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline" data-testid={`link-glossary-source-${index}`}>Read source <ExternalLink size={13} /></a></article>)}</div>}
  </PageFrame>;
}

function Changelog() {
  const query = useListChangelog({ limit: 24 }, { query: { queryKey: getListChangelogQueryKey({ limit: 24 }) } });
  const entries = (query.data ?? []) as ChangelogEntry[];
  return <PageFrame eyebrow="Catalog / source trail" title="The catalog changes in public." description="Pricing, benchmark, model, and methodology updates with affected records called out. This is the audit trail behind the interface."><div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><div className="rounded-lg bg-secondary p-7 text-secondary-foreground"><div className="eyebrow text-sidebar-primary">Editorial promise</div><h2 className="display mt-4 text-3xl font-semibold">No silent edits.</h2><p className="mt-5 text-sm leading-relaxed text-secondary-foreground/70">When a source changes, the catalog should make that change legible. Read the latest entries, then open the source when a decision depends on it.</p><div className="mt-8 flex items-center gap-3 border-t border-secondary-foreground/15 pt-5"><ShieldCheck size={18} className="text-sidebar-primary" /><span className="text-xs text-secondary-foreground/65">Dates are source dates, not publication theater.</span></div></div><div className="space-y-3">{query.isLoading ? <LoadingState label="Reading update history" /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : entries.length === 0 ? <EmptyState title="No updates logged" body="The catalog has not published its first update yet." /> : entries.map((entry, index) => <article key={entry.id} className="instrument-card rounded-lg p-5" data-testid={`card-changelog-${entry.id}`}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="flex items-center gap-3"><span className="mono text-[10px] text-muted-foreground">0{index + 1}</span><span className="rounded-full bg-primary/[.08] px-2 py-1 text-[9px] font-medium uppercase tracking-[.1em] text-primary">{entry.type}</span><span className="mono text-[10px] text-muted-foreground">{formatDate(entry.date, true)}</span></div><a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary" data-testid={`link-changelog-source-${entry.id}`}>Source <ExternalLink size={13} /></a></div><h2 className="mt-4 text-base font-semibold">{entry.title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>{entry.affectedModels.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{entry.affectedModels.map((model) => <span key={model} className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">{model}</span>)}</div>}</article>)}</div></div></PageFrame>;
}

function NotFound() {
  return <PageFrame eyebrow="Atlas / 404" title="This page is outside the map." description="The route does not correspond to a catalog surface."><Link href="/" className="focus-ring mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground" data-testid="link-return-home">Return to overview <ArrowDownRight size={15} /></Link></PageFrame>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell><Switch><Route path="/" component={Home} /><Route path="/models" component={Models} /><Route path="/models/:slug" component={Profile} /><Route path="/compare" component={Compare} /><Route path="/glossary" component={Glossary} /><Route path="/changelog" component={Changelog} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><Router /></QueryClientProvider>;
}

export default App;