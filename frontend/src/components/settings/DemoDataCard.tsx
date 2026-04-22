"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useI18n } from "@/i18n/I18nProvider";
import { workspacesApi } from "@/lib/api";

type Props = { workspaceId: string };

export default function DemoDataCard({ workspaceId }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const seed = useMutation({
    mutationFn: () => workspacesApi.demoBootstrap(workspaceId),
    onSuccess: (result) => {
      toast.success(t("settings.demo.seeded"), {
        description: `${result.accountsConnected.length} accounts · ${result.postsSynced} posts · ${result.insightsGenerated} insights`,
      });
      qc.invalidateQueries();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t("settings.demo.error");
      toast.error(`${t("settings.demo.error")} · ${msg}`);
    },
  });

  return (
    <Card padded={false}>
      <CardHeader>
        <div className="flex-1">
          <CardTitle>{t("settings.demo.title")}</CardTitle>
          <CardDescription>{t("settings.demo.subtitle")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => seed.mutate()}
          loading={seed.isPending}
          leftIcon={<Sparkles className="h-4 w-4" />}
        >
          {t("settings.demo.tryCta")}
        </Button>
        <Button
          variant="outline"
          onClick={() => seed.mutate()}
          loading={seed.isPending}
        >
          {t("settings.demo.resetCta")}
        </Button>
      </CardContent>
    </Card>
  );
}
