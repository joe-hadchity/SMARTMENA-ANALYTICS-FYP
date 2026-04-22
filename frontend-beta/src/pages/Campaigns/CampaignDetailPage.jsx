import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import PageHeader from "../../components/PageHeader.jsx";
import Card, { CardBody, CardHeader } from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import Field from "../../components/Field.jsx";
import IdBadge from "../../components/IdBadge.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ResultCard from "../../components/ResultCard.jsx";
import { postSchema, postSamples } from "../../schemas/post.js";
import { analyzeSentiment, createPost } from "../../services/api.js";
import { useStore } from "../../store/useStore.js";
import { useToast } from "../../hooks/useToast.jsx";
import { fmtDate, fmtMoney } from "../../utils/format.js";
import styles from "./Campaigns.module.css";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campaigns, posts, sentiments, actions } = useStore();
  const toast = useToast();
  const [error, setError] = useState(null);

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === id),
    [campaigns, id],
  );
  const campaignPosts = useMemo(
    () => posts.filter((p) => p.campaign_id === id),
    [posts, id],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: {
      campaign_id: id || "",
      text_content: postSamples[0].text,
      language: "ar",
    },
  });
  const textValue = watch("text_content");

  if (!campaign) {
    return (
      <>
        <PageHeader title="Campaign not found" />
        <Card>
          <EmptyState
            title="No campaign matches this id"
            subtitle={`This session doesn't have a campaign with id ${id}. It may have been created on another device (the backend has no GET endpoints yet).`}
            action={
              <Link to="/campaigns">
                <Button>Back to campaigns</Button>
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  async function onCreatePost(values) {
    setError(null);
    try {
      const created = await createPost(values);
      actions.addPost(created);
      toast.success("Post created");
      reset({
        campaign_id: id,
        text_content: postSamples[0].text,
        language: "ar",
      });
    } catch (err) {
      setError(err);
      toast.error(err?.message || "Failed to create post");
    }
  }

  async function onAnalyze(post) {
    try {
      const result = await analyzeSentiment({
        postId: post.id,
        text: post.text_content,
      });
      actions.addSentiment(result);
      toast.success(`Sentiment: ${result.sentiment}`);
    } catch (err) {
      toast.error(err?.message || "Sentiment analysis failed");
    }
  }

  function latestSentimentFor(postId) {
    return sentiments.find((s) => s.postId === postId);
  }

  return (
    <>
      <PageHeader
        title={campaign.campaign_name}
        subtitle={`Created ${fmtDate(campaign.created_at)}`}
        action={
          <Link to={`/roi?campaignId=${campaign.id}`}>
            <Button>Predict ROI</Button>
          </Link>
        }
      />

      <Card>
        <div className={styles.detailMeta}>
          <div>
            <span className={styles.metaLabel}>Platform</span>
            <span className={styles.metaValue}>{campaign.platform}</span>
          </div>
          <div>
            <span className={styles.metaLabel}>Region</span>
            <span className={styles.metaValue}>{campaign.region || "-"}</span>
          </div>
          <div>
            <span className={styles.metaLabel}>Budget</span>
            <span className={styles.metaValue}>{fmtMoney(campaign.budget)}</span>
          </div>
          <div>
            <span className={styles.metaLabel}>Audience</span>
            <span className={styles.metaValue}>
              {campaign.audience_size != null
                ? Number(campaign.audience_size).toLocaleString()
                : "-"}
            </span>
          </div>
          <div>
            <span className={styles.metaLabel}>Content</span>
            <span className={styles.metaValue}>{campaign.content_type || "-"}</span>
          </div>
        </div>
        <div className={styles.idRow}>
          <IdBadge label="campaignId" value={campaign.id} />
          <IdBadge label="userId" value={campaign.user_id} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Posts"
          subtitle={`${campaignPosts.length} in this campaign`}
        />
        {campaignPosts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            subtitle="Add a post below. Then you can analyze sentiment and predict ROI."
          />
        ) : (
          <div>
            {campaignPosts.map((p) => {
              const s = latestSentimentFor(p.id);
              return (
                <div key={p.id} className={styles.postRow}>
                  <div className={styles.postBody}>
                    <div className={styles.postText}>{p.text_content}</div>
                    <div className={styles.postMeta}>
                      <IdBadge label="postId" value={p.id} size="sm" />
                      <span>{fmtDate(p.created_at)}</span>
                      {s ? (
                        <StatusPill tone={toneFor(s.sentiment)}>
                          {s.sentiment} ({(Number(s.confidence) * 100).toFixed(0)}%)
                        </StatusPill>
                      ) : (
                        <StatusPill tone="neutral">not analyzed</StatusPill>
                      )}
                    </div>
                  </div>
                  <div className={styles.postActions}>
                    {!s ? (
                      <Button size="sm" variant="ghost" onClick={() => onAnalyze(p)}>
                        Analyze
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate(
                            `/roi?campaignId=${campaign.id}&postId=${p.id}`,
                          )
                        }
                      >
                        Predict ROI
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Add post" subtitle="Will be linked to this campaign" />
        <CardBody>
          <div className={styles.sampleRow}>
            <span className={styles.sampleLabel}>Samples:</span>
            {postSamples.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`${styles.chip} ${textValue === s.text ? styles["chip--active"] : ""}`}
                onClick={() => setValue("text_content", s.text, { shouldValidate: true })}
              >
                {s.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onCreatePost)} className={styles.form}>
            <input type="hidden" {...register("campaign_id")} />

            <Field
              label="Post text"
              required
              hint="The content users will see. You can paste Arabic or English."
              error={errors.text_content?.message}
            >
              <textarea rows={4} {...register("text_content")} />
            </Field>

            <Field
              label="Language"
              showOptional
              hint="Defaults to Arabic for this demo."
              error={errors.language?.message}
            >
              <select {...register("language")} style={{ maxWidth: 180 }}>
                <option value="ar">ar - Arabic</option>
                <option value="en">en - English</option>
              </select>
            </Field>

            <div className={styles.formActions}>
              <Button type="submit" loading={isSubmitting}>
                Create post
              </Button>
            </div>
          </form>

          {error ? <ResultCard tone="error" error={error} /> : null}
        </CardBody>
      </Card>
    </>
  );
}

function toneFor(label) {
  if (label === "positive") return "positive";
  if (label === "negative") return "negative";
  return "neutral";
}
