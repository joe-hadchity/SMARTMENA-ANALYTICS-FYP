import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import PageHeader from "../../components/PageHeader.jsx";
import Card, { CardBody } from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import Field from "../../components/Field.jsx";
import ResultCard from "../../components/ResultCard.jsx";
import {
  campaignSchema,
  campaignDefaults,
  PLATFORMS,
  REGIONS,
  CONTENT_TYPES,
} from "../../schemas/campaign.js";
import { createCampaign, config } from "../../services/api.js";
import { useStore } from "../../store/useStore.js";
import { useToast } from "../../hooks/useToast.jsx";
import styles from "./Campaigns.module.css";

export default function CampaignNewPage() {
  const navigate = useNavigate();
  const { actions } = useStore();
  const toast = useToast();
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: campaignDefaults,
  });

  async function onSubmit(values) {
    setError(null);
    try {
      const created = await createCampaign(values);
      actions.addCampaign(created);
      toast.success(`Campaign "${created.campaign_name}" created`);
      navigate(`/campaigns/${created.id}`);
    } catch (err) {
      setError(err);
      toast.error(err?.message || "Failed to create campaign");
    }
  }

  return (
    <>
      <PageHeader
        title="New campaign"
        subtitle={
          config.demoUserIdConfigured
            ? "user_id is injected automatically from VITE_DEMO_USER_ID"
            : "VITE_DEMO_USER_ID is not set - campaign creation will fail"
        }
        action={
          <Link to="/campaigns">
            <Button variant="ghost">Cancel</Button>
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formSection}>
              <Field
                label="Campaign name"
                required
                hint="A short internal name, e.g. Ramadan launch"
                error={errors.campaign_name?.message}
              >
                <input type="text" {...register("campaign_name")} />
              </Field>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>Targeting</div>
              <div className={styles.formRow}>
                <Field label="Platform" required error={errors.platform?.message}>
                  <select {...register("platform")}>
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Region" required error={errors.region?.message}>
                  <select {...register("region")}>
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Content type"
                  showOptional
                  error={errors.content_type?.message}
                >
                  <select {...register("content_type")}>
                    {CONTENT_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>Budget &amp; reach</div>
              <div className={styles.formRow}>
                <Field
                  label="Budget (USD)"
                  required
                  hint="Total spend for the campaign"
                  error={errors.budget?.message}
                >
                  <input type="number" min="0" step="1" {...register("budget")} />
                </Field>
                <Field
                  label="Audience size"
                  showOptional
                  hint="Estimated reach in users"
                  error={errors.audience_size?.message}
                >
                  <input type="number" min="0" step="1" {...register("audience_size")} />
                </Field>
              </div>
            </div>

            <div className={styles.formActions}>
              <Button type="submit" size="lg" loading={isSubmitting}>
                Create campaign
              </Button>
              <Link to="/campaigns">
                <Button variant="ghost" type="button" size="lg">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>

          {error ? <ResultCard tone="error" error={error} /> : null}
        </CardBody>
      </Card>
    </>
  );
}
