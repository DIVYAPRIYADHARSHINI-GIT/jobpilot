"use client";
import { useI18n } from "@/i18n";
import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <EmptyState image="/images/empty-jobs.svg" title="404" text={t("common.notFound")}>
      <LinkButton href="/">{t("common.goHome")}</LinkButton>
      <LinkButton href="/jobs" variant="secondary">{t("jobs.backToJobs")}</LinkButton>
    </EmptyState>
  );
}
