"use client";
// Application tracker: Kanban board (drag & drop between stages, "Move to"
// for touch/keyboard), a detail drawer (notes, interview + follow-up dates,
// history, delete) and a searchable/filterable table. CSV + PDF export.
import Link from "next/link";
import { memo, useDeferredValue, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import type { TKey } from "@/i18n/en";
import { STAGES, type Application, type Stage } from "@/lib/types";
import { moveApp, removeApp, updateApp, useAppState, useHydrated } from "@/lib/store";
import { downloadCsv, downloadPdf } from "@/lib/download";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button, Chip, ConfirmDialog, Dialog, EmptyState, LinkButton, PageHeader, PageSkeleton, inputCls, toast, cx } from "@/components/ui";
import { IconBoard, IconCalendar, IconDownload, IconFile, IconGrip, IconNote, IconSearch, IconTable, IconTrash } from "@/components/Icons";

const STAGE_STYLE: Record<Stage, { dot: string; head: string }> = {
  saved: { dot: "bg-slate-400", head: "text-slate-700 dark:text-slate-300" },
  applied: { dot: "bg-blue-500", head: "text-blue-700 dark:text-blue-300" },
  interview: { dot: "bg-violet-500", head: "text-violet-700 dark:text-violet-300" },
  offer: { dot: "bg-emerald-500", head: "text-emerald-700 dark:text-emerald-300" },
  rejected: { dot: "bg-rose-500", head: "text-rose-700 dark:text-rose-300" },
};

export default function TrackerPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Tracker />;
}

function Tracker() {
  const { t } = useI18n();
  const { apps, profile } = useAppState();
  const [view, setView] = useState<"board" | "table">("board");
  const [openId, setOpenId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const open = apps.find((a) => a.id === openId) ?? null;

  const onMove = (id: string, stage: Stage) => {
    const a = apps.find((x) => x.id === id);
    if (!a || a.stage === stage) return;
    moveApp(id, stage);
    toast(t("tracker.moved", { stage: t(`stage.${stage}`) }), "info");
  };

  return (
    <div>
      <PageHeader title={t("tracker.title")} subtitle={t("tracker.subtitle")}>
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
          {(["board", "table"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} data-testid={`view-${v}`} className={cx("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold", view === v ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400")}>
              {v === "board" ? <IconBoard size={16} /> : <IconTable size={16} />}
              {t(`tracker.${v}`)}
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={() => setExportOpen(true)} disabled={!apps.length} data-testid="export-open">
          <IconDownload size={18} />
          {t("tracker.export")}
        </Button>
      </PageHeader>

      {apps.length === 0 ? (
        <EmptyState image="/images/empty-applications.svg" title={t("tracker.empty.title")} text={t("tracker.empty.text")}>
          <LinkButton href="/jobs">{t("home.ctaJobs")}</LinkButton>
        </EmptyState>
      ) : view === "board" ? (
        <Board apps={apps} onMove={onMove} onOpen={setOpenId} />
      ) : (
        <TableView apps={apps} onOpen={setOpenId} />
      )}

      {open && <DetailDrawer key={open.id} app={open} onClose={() => setOpenId(null)} onMove={onMove} />}

      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} title={t("tracker.export")} testId="export-dialog">
        <div className="grid gap-2">
          <Button variant="secondary" onClick={() => { downloadCsv(apps); setExportOpen(false); }} data-testid="export-csv">
            <IconDownload size={18} />
            {t("tracker.exportCsv")}
          </Button>
          <Button onClick={() => { downloadPdf(apps, profile?.fullName); setExportOpen(false); }} data-testid="export-pdf">
            <IconFile size={18} />
            {t("tracker.exportPdf")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Board({ apps, onMove, onOpen }: { apps: Application[]; onMove: (id: string, s: Stage) => void; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const [over, setOver] = useState<Stage | null>(null);
  const dragId = useRef<string | null>(null);
  const columns = useMemo(() => {
    const m: Record<Stage, Application[]> = { saved: [], applied: [], interview: [], offer: [], rejected: [] };
    for (const a of apps) m[a.stage].push(a);
    for (const s of STAGES) m[s].sort((x, y) => y.updatedAt - x.updatedAt);
    return m;
  }, [apps]);

  return (
    <>
      <p className="mb-2 text-xs text-slate-500 lg:hidden">{t("tracker.dragHint")}</p>
      <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-4 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0" data-testid="kanban">
        {STAGES.map((stage) => (
          <section
            key={stage}
            data-testid={`col-${stage}`}
            data-over={over === stage}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (over !== stage) setOver(stage);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === stage ? null : o));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || dragId.current;
              setOver(null);
              if (id) onMove(id, stage);
            }}
            className="kanban-col flex w-72 shrink-0 snap-start flex-col rounded-2xl bg-slate-100/80 p-2 transition-colors lg:w-auto dark:bg-slate-900/60"
          >
            <h2 className={cx("flex items-center gap-2 px-2 py-1.5 text-sm font-semibold", STAGE_STYLE[stage].head)}>
              <span className={cx("h-2.5 w-2.5 rounded-full", STAGE_STYLE[stage].dot)} />
              {t(`stage.${stage}`)}
              <span className="ml-auto rounded-full bg-white px-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300" data-testid={`count-${stage}`}>{columns[stage].length}</span>
            </h2>
            <div className="mt-1 flex min-h-24 flex-1 flex-col gap-2">
              {columns[stage].map((a) => (
                <KanbanCard key={a.id} app={a} onOpen={onOpen} onMove={onMove} onDragStart={(id) => (dragId.current = id)} />
              ))}
              {columns[stage].length === 0 && <p className="rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">{t("tracker.emptyColumn")}</p>}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

const KanbanCard = memo(function KanbanCard({ app, onOpen, onMove, onDragStart }: { app: Application; onOpen: (id: string) => void; onMove: (id: string, s: Stage) => void; onDragStart: (id: string) => void }) {
  const { t, formatDate } = useI18n();
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", app.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(app.id);
      }}
      data-testid="kanban-card"
      data-app-id={app.id}
      data-stage={app.stage}
      className="group cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-indigo-300 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900"
    >
      <button type="button" onClick={() => onOpen(app.id)} className="flex w-full items-start gap-2 text-left" data-testid="card-open">
        <CompanyLogo companyId={app.companyId} size={34} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{app.title}</span>
          <span className="block truncate text-xs text-slate-500">{app.company}</span>
        </span>
        <IconGrip size={16} className="shrink-0 text-slate-300 group-hover:text-slate-500" />
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Chip tone={app.matchScore >= 75 ? "green" : app.matchScore >= 50 ? "amber" : "red"}>{app.matchScore}%</Chip>
        {app.portalStatus === "viewed" && <Chip tone="cyan">{t("status.viewed")}</Chip>}
        {app.source === "auto" && <Chip tone="indigo">{t("tracker.source.auto")}</Chip>}
        {app.interviewDate && app.stage === "interview" && (
          <Chip tone="indigo"><IconCalendar size={12} />{formatDate(app.interviewDate, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Chip>
        )}
        {app.notes && <IconNote size={14} className="text-slate-400" />}
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <span className="sr-only lg:not-sr-only lg:hidden">{t("tracker.moveTo")}</span>
        <select value={app.stage} onChange={(e) => onMove(app.id, e.target.value as Stage)} aria-label={t("tracker.moveTo")} data-testid="card-move" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
          {STAGES.map((s) => <option key={s} value={s}>{t("tracker.moveTo")}: {t(`stage.${s}`)}</option>)}
        </select>
      </label>
    </article>
  );
});

function DetailDrawer({ app, onClose, onMove }: { app: Application; onClose: () => void; onMove: (id: string, s: Stage) => void }) {
  const { t, formatDate } = useI18n();
  const [notes, setNotes] = useState(app.notes);
  const [confirmDel, setConfirmDel] = useState(false);
  const saveNotes = () => notes !== app.notes && updateApp(app.id, { notes });

  return (
    <>
      <Dialog open onClose={() => { saveNotes(); onClose(); }} title={app.title} testId="app-detail" wide>
        <div className="flex items-center gap-3">
          <CompanyLogo companyId={app.companyId} size={48} />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-slate-900 dark:text-white">{app.company}</p>
            <p className="text-slate-500">{app.location} · {app.salary}</p>
          </div>
          <Chip tone={app.matchScore >= 75 ? "green" : app.matchScore >= 50 ? "amber" : "red"}>{app.matchScore}% {t("common.match")}</Chip>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            {t("tracker.col.stage")}
            <select value={app.stage} onChange={(e) => onMove(app.id, e.target.value as Stage)} className={cx(inputCls(), "mt-1")} data-testid="detail-stage">
              {STAGES.map((s) => <option key={s} value={s}>{t(`stage.${s}`)}</option>)}
            </select>
          </label>
          <div className="text-sm">
            <p className="font-medium">{t("tracker.portalStatus")}</p>
            <p className="mt-2 text-slate-600 dark:text-slate-400" data-testid="detail-portal">
              {app.portalStatus ? t(`status.${app.portalStatus}`) : "—"}
              {app.receiptId && <span className="block text-xs text-slate-500">{t("tracker.receipt")}: {app.receiptId}</span>}
            </p>
          </div>
          <label className="text-sm font-medium">
            {t("tracker.interviewDate")}
            <input type="datetime-local" value={app.interviewDate ?? ""} onChange={(e) => updateApp(app.id, { interviewDate: e.target.value || undefined })} className={cx(inputCls(), "mt-1")} data-testid="detail-interview" />
          </label>
          <label className="text-sm font-medium">
            {t("tracker.followUpDate")}
            <input type="date" value={app.followUpDate ?? ""} onChange={(e) => updateApp(app.id, { followUpDate: e.target.value || undefined })} className={cx(inputCls(), "mt-1")} data-testid="detail-followup" />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            {t("tracker.notes")}
            <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} placeholder={t("tracker.notesPlaceholder")} className={cx(inputCls(), "mt-1")} data-testid="detail-notes" />
          </label>
        </div>
        {(app.matchedSkills.length > 0 || app.missingSkills.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {app.matchedSkills.map((s) => <Chip key={s} tone="green">✓ {s}</Chip>)}
            {app.missingSkills.map((s) => <Chip key={s} tone="red">✕ {s}</Chip>)}
          </div>
        )}
        <h3 className="mt-5 text-sm font-semibold text-slate-900 dark:text-white">{t("tracker.history")}</h3>
        <ol className="mt-2 space-y-2 border-l-2 border-indigo-200 pl-4 dark:border-indigo-500/30" data-testid="detail-history">
          {app.timeline.map((e, i) => (
            <li key={i} className="relative text-sm">
              <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <span className="font-medium">{t(`status.${e.status}` as TKey)}</span>
              <span className="ml-2 text-xs text-slate-500">{formatDate(e.at, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={() => setConfirmDel(true)} data-testid="detail-delete">
            <IconTrash size={16} />
            {t("tracker.delete")}
          </Button>
          <div className="flex gap-2 sm:ml-auto">
            <LinkButton href={`/jobs/${app.jobId}`} variant="secondary">{t("tracker.viewJob")}</LinkButton>
            {app.stage === "saved" && <LinkButton href={`/jobs/${app.jobId}/apply`}>{t("tracker.applyNow")}</LinkButton>}
            <Button onClick={() => { saveNotes(); onClose(); }} data-testid="detail-close">{t("common.save")}</Button>
          </div>
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirmDel}
        danger
        title={t("tracker.delete")}
        text={t("tracker.deleteConfirm")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => {
          setConfirmDel(false);
          onClose();
          removeApp(app.id);
        }}
      />
    </>
  );
}

function TableView({ apps, onOpen }: { apps: Application[]; onOpen: (id: string) => void }) {
  const { t, formatDate } = useI18n();
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);
  const [stage, setStage] = useState<"" | Stage>("");
  const [source, setSource] = useState<"" | Application["source"]>("");
  const [sort, setSort] = useState<{ key: "company" | "matchScore" | "submittedAt"; dir: 1 | -1 }>({ key: "submittedAt", dir: -1 });

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return apps
      .filter((a) => (!stage || a.stage === stage) && (!source || a.source === source) && (!needle || `${a.company} ${a.title} ${a.notes} ${a.location}`.toLowerCase().includes(needle)))
      .sort((a, b) => {
        const k = sort.key;
        const av = k === "company" ? a.company : k === "matchScore" ? a.matchScore : (a.submittedAt ?? 0);
        const bv = k === "company" ? b.company : k === "matchScore" ? b.matchScore : (b.submittedAt ?? 0);
        return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
      });
  }, [apps, query, stage, source, sort]);

  const th = (key: typeof sort.key, label: string) => (
    <th className="px-3 py-2">
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))} className="font-semibold hover:text-indigo-600">
        {label} {sort.key === key ? (sort.dir === 1 ? "↑" : "↓") : ""}
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-3 grid gap-2 sm:grid-cols-4">
        <label className="relative sm:col-span-2">
          <span className="sr-only">{t("common.search")}</span>
          <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("tracker.searchPlaceholder")} className={cx(inputCls(), "pl-10")} data-testid="table-search" />
        </label>
        <select value={stage} onChange={(e) => setStage(e.target.value as "" | Stage)} className={inputCls()} aria-label={t("tracker.stageFilter")} data-testid="table-stage">
          <option value="">{t("tracker.stageFilter")}: {t("common.all")}</option>
          {STAGES.map((s) => <option key={s} value={s}>{t(`stage.${s}`)}</option>)}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value as "" | Application["source"])} className={inputCls()} aria-label={t("tracker.sourceFilter")} data-testid="table-source">
          <option value="">{t("tracker.sourceFilter")}: {t("common.all")}</option>
          {(["manual", "auto", "demo"] as const).map((s) => <option key={s} value={s}>{t(`tracker.source.${s}`)}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700/70 dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-left text-sm" data-testid="tracker-table">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              {th("company", t("tracker.col.company"))}
              <th className="px-3 py-2 font-semibold">{t("tracker.col.role")}</th>
              <th className="px-3 py-2 font-semibold">{t("tracker.col.stage")}</th>
              {th("matchScore", t("tracker.col.match"))}
              {th("submittedAt", t("tracker.col.applied"))}
              <th className="px-3 py-2 font-semibold">{t("tracker.col.interview")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} onClick={() => onOpen(a.id)} className="cursor-pointer border-t border-slate-100 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:bg-slate-800/60" data-testid="table-row">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-white"><CompanyLogo companyId={a.companyId} size={28} />{a.company}</span>
                </td>
                <td className="px-3 py-2">{a.title}</td>
                <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5"><span className={cx("h-2 w-2 rounded-full", STAGE_STYLE[a.stage].dot)} />{t(`stage.${a.stage}`)}</span></td>
                <td className="px-3 py-2">{a.matchScore}%</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{a.submittedAt ? formatDate(a.submittedAt) : "—"}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{a.interviewDate ? formatDate(a.interviewDate, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500" data-testid="table-empty">{t("tracker.noResults")}</p>}
      </div>
      <p className="mt-2 text-xs text-slate-500"><Link href="/jobs" className="underline">{t("home.ctaJobs")}</Link></p>
    </div>
  );
}
