"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useI18n } from "@/i18n/I18nProvider";
import { campaignsApi } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

export default function CampaignsListPage() {
  const { t, locale } = useI18n();
  const q = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => campaignsApi.list({ limit: 100 }),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title={t("campaigns.title")}
        subtitle={t("campaigns.subtitle")}
        actions={
          <Link href="/campaigns/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            {t("campaigns.new")}
          </Link>
        }
      />

      {q.data && q.data.length === 0 ? (
        <Card>
          <EmptyState
            title={t("common.empty")}
            cta={
              <Link href="/campaigns/new" className="btn btn-primary">
                {t("campaigns.new")}
              </Link>
            }
          />
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {q.data?.map((c) => (
          <Link key={c.id} href={`/campaigns/${c.id}`} className="block">
            <Card className="hover:border-brand-300 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium truncate">{c.campaign_name}</div>
                <Chip tone="brand">{c.platform}</Chip>
              </div>
              <div className="mt-2 text-xs text-fg-muted">
                {formatDate(c.created_at, locale)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-fg-muted">Budget</div>
                  <div className="font-medium">
                    ${formatNumber(c.budget, locale)}
                  </div>
                </div>
                <div>
                  <div className="text-fg-muted">Region</div>
                  <div className="font-medium">{c.region || "—"}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
