import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Card, { CardBody, CardHeader } from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import Field from "../../components/Field.jsx";
import IdBadge from "../../components/IdBadge.jsx";
import ResultCard from "../../components/ResultCard.jsx";
import {
  ROI_CONTENT_TYPES,
  ROI_PLATFORMS,
  ROI_REGIONS,
  roiDefaults,
  roiSchema,
} from "../../schemas/roi.js";
import { predictRoi } from "../../services/api.js";
import { useStore } from "../../store/useStore.js";
import { useToast } from "../../hooks/useToast.jsx";
import {
  platformToRoi,
  regionToRoi,
  sentimentLabelToScore,
} from "../../utils/mappers.js";
import { fmtNumber, fmtPercent, shortId } from "../../utils/format.js";
import styles from "./Roi.module.css";

export default function RoiPage() {
  const { campaigns, sentiments, actions } = useStore();
  const toast = useToast();
  const [search] = useSearchParams();
  const initialCampaignId = search.get("campaignId") || "";
  const initialPostId = search.get("postId") || "";

  const [mode, setMode] = useState(campaigns.length > 0 ? "pick" : "paste");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const defaultValues = useMemo(() => {
    const c = campaigns.find((x) => x.id === initialCampaignId) || campaigns[0];
    const preset = c ? derivePrefill(c, sentiments, initialPostId) : null;
    return {
      campaignId: preset?.campaignId || initialCampaignId || "",
      budget: preset?.budget ?? roiDefaults.budget,
      platform: preset?.platform ?? roiDefaults.platform,
      contentType: roiDefaults.contentType,
      audienceSize: preset?.audienceSize ?? roiDefaults.audienceSize,
      postingHour: roiDefaults.postingHour,
      sentimentScore: preset?.sentimentScore ?? roiDefaults.sentimentScore,
      holidayFlag: roiDefaults.holidayFlag,
      region: preset?.region ?? roiDefaults.region,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(roiSchema),
    defaultValues,
  });

  const currentCampaignId = watch("campaignId");

  useEffect(() => {
    if (mode !== "pick" || !currentCampaignId) return;
    const c = campaigns.find((x) => x.id === currentCampaignId);
    if (!c) return;
    const preset = derivePrefill(c, sentiments, initialPostId);
    setValue("budget", preset.budget, { shouldValidate: true });
    setValue("platform", preset.platform, { shouldValidate: true });
    setValue("audienceSize", preset.audienceSize, { shouldValidate: true });
    setValue("region", preset.region, { shouldValidate: true });
    setValue("sentimentScore", preset.sentimentScore, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCampaignId, mode]);

  async function onSubmit(values) {
    setResult(null);
    setError(null);
    try {
      const r = await predictRoi(values);
      actions.addPrediction(r);
      setResult(r);
      toast.success(`Predicted ROI ${Number(r.predictedRoi).toFixed(2)}x`);
    } catch (err) {
      setError(err);
      toast.error(err?.message || "ROI prediction failed");
    }
  }

  return (
    <>
      <PageHeader
        title="ROI prediction"
        subtitle="Estimate expected return on a campaign using the trained GBR model"
      />

      <Card>
        <CardHeader
          title="Inputs"
          action={
            <div className={styles.toggle}>
              <button
                type="button"
                className={mode === "pick" ? styles.toggleActive : ""}
                onClick={() => setMode("pick")}
                disabled={campaigns.length === 0}
              >
                Pick a campaign
              </button>
              <button
                type="button"
                className={mode === "paste" ? styles.toggleActive : ""}
                onClick={() => setMode("paste")}
              >
                Manual
              </button>
            </div>
          }
        />
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            {mode === "pick" ? (
              <Field
                label="Campaign"
                required
                error={errors.campaignId?.message}
              >
                <select
                  value={currentCampaignId || ""}
                  onChange={(e) =>
                    setValue("campaignId", e.target.value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <option value="">Select a campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.campaign_name} - {shortId(c.id)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field
                label="Campaign ID (UUID)"
                required
                hint="UUID of a campaign that exists in the database."
                error={errors.campaignId?.message}
              >
                <div className={styles.inlineInput}>
                  <input
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    {...register("campaignId")}
                  />
                  {campaigns[0] ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const c = campaigns[0];
                        const preset = derivePrefill(c, sentiments, "");
                        setValue("campaignId", preset.campaignId, {
                          shouldValidate: true,
                        });
                        setValue("budget", preset.budget, {
                          shouldValidate: true,
                        });
                        setValue("platform", preset.platform, {
                          shouldValidate: true,
                        });
                        setValue("audienceSize", preset.audienceSize, {
                          shouldValidate: true,
                        });
                        setValue("region", preset.region, {
                          shouldValidate: true,
                        });
                        setValue("sentimentScore", preset.sentimentScore, {
                          shouldValidate: true,
                        });
                      }}
                    >
                      Use latest campaign
                    </Button>
                  ) : null}
                </div>
              </Field>
            )}

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Spend &amp; reach</div>
              <div className={styles.grid}>
                <Field
                  label="Budget (USD)"
                  required
                  hint="Total planned spend"
                  error={errors.budget?.message}
                >
                  <input type="number" min="0" step="1" {...register("budget")} />
                </Field>
                <Field
                  label="Audience size"
                  required
                  hint="Estimated reach in users"
                  error={errors.audienceSize?.message}
                >
                  <input
                    type="number"
                    min="1"
                    step="1"
                    {...register("audienceSize")}
                  />
                </Field>
                <Field label="Region" required error={errors.region?.message}>
                  <select {...register("region")}>
                    {ROI_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Creative</div>
              <div className={styles.grid}>
                <Field
                  label="Platform"
                  required
                  error={errors.platform?.message}
                >
                  <select {...register("platform")}>
                    {ROI_PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Content type"
                  required
                  error={errors.contentType?.message}
                >
                  <select {...register("contentType")}>
                    {ROI_CONTENT_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Posting hour"
                  required
                  hint="0-23, local time"
                  error={errors.postingHour?.message}
                >
                  <input
                    type="number"
                    min="0"
                    max="23"
                    {...register("postingHour")}
                  />
                </Field>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Signal</div>
              <div className={styles.grid}>
                <Field
                  label="Sentiment score"
                  required
                  hint="Between -1 (negative) and 1 (positive)"
                  error={errors.sentimentScore?.message}
                >
                  <input
                    type="number"
                    min="-1"
                    max="1"
                    step="0.01"
                    {...register("sentimentScore")}
                  />
                </Field>
                <Field
                  label="Holiday flag"
                  required
                  hint="Are you launching near a holiday?"
                  error={errors.holidayFlag?.message}
                >
                  <select {...register("holidayFlag")}>
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className={styles.actions}>
              <Button type="submit" size="lg" loading={isSubmitting}>
                Predict ROI
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {result ? (
        <Card tone="success">
          <CardBody>
            <div className={styles.resultGrid}>
              <div className={styles.bigNumber}>
                <div className={styles.bigLabel}>Predicted ROI</div>
                <div className={styles.bigValue}>
                  {fmtNumber(result.predictedRoi, 2)}
                  <span className={styles.bigSuffix}>x</span>
                </div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Engagement</div>
                <div className={styles.metricValue}>
                  {fmtPercent(result.predictedEngagement, 2)}
                </div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Confidence</div>
                <div className={styles.metricValue}>
                  {fmtPercent(result.confidenceScore, 1)}
                </div>
              </div>
            </div>
            <div className={styles.ids}>
              <IdBadge label="campaignId" value={result.campaignId} />
            </div>
            <ResultCard title="Raw response" data={result} />
          </CardBody>
        </Card>
      ) : null}

      {error ? <ResultCard tone="error" error={error} /> : null}
    </>
  );
}

function derivePrefill(campaign, sentiments, preferredPostId) {
  const platform = platformToRoi(campaign.platform);
  const region = regionToRoi(campaign.region);
  const audienceSize = Number(campaign.audience_size || 10000);
  const budget = Number(campaign.budget || 2500);

  // prefer a sentiment on the specified postId, else most recent for any post in this campaign
  const preferred =
    preferredPostId && sentiments.find((s) => s.postId === preferredPostId);
  const anyMatch =
    preferred ||
    sentiments.find((s) => {
      return s.campaignId === campaign.id;
    });
  const score = anyMatch
    ? sentimentLabelToScore(anyMatch.sentiment, Number(anyMatch.confidence))
    : 0;

  return {
    campaignId: campaign.id,
    budget,
    platform,
    audienceSize,
    region,
    sentimentScore: score,
  };
}
