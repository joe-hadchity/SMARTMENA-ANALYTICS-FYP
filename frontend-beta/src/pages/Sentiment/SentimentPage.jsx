import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import PageHeader from "../../components/PageHeader.jsx";
import Card, { CardBody, CardHeader } from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import Field from "../../components/Field.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import ResultCard from "../../components/ResultCard.jsx";
import IdBadge from "../../components/IdBadge.jsx";
import { sentimentSchema } from "../../schemas/sentiment.js";
import { postSamples } from "../../schemas/post.js";
import { analyzeSentiment } from "../../services/api.js";
import { useStore } from "../../store/useStore.js";
import { useToast } from "../../hooks/useToast.jsx";
import { fmtPercent, shortId } from "../../utils/format.js";
import styles from "./Sentiment.module.css";

export default function SentimentPage() {
  const { posts, actions } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState(posts.length > 0 ? "pick" : "paste");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const defaultPost = posts[0] || null;
  const defaultValues = useMemo(
    () => ({
      postId: defaultPost?.id || "",
      text: defaultPost?.text_content || postSamples[0].text,
    }),
    [defaultPost],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(sentimentSchema),
    defaultValues,
  });

  const currentPostId = watch("postId");

  function handlePickPost(e) {
    const id = e.target.value;
    const p = posts.find((x) => x.id === id);
    setValue("postId", id, { shouldValidate: true });
    if (p) setValue("text", p.text_content, { shouldValidate: true });
  }

  async function onSubmit(values) {
    setResult(null);
    setError(null);
    try {
      const r = await analyzeSentiment(values);
      actions.addSentiment(r);
      setResult(r);
      toast.success(`Sentiment: ${r.sentiment}`);
    } catch (err) {
      setError(err);
      toast.error(err?.message || "Sentiment analysis failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Sentiment analysis"
        subtitle="Run the Arabic CAMeL-Lab sentiment model on any post"
      />

      <Card>
        <CardHeader
          title="Input"
          action={
            <div className={styles.toggle}>
              <button
                type="button"
                className={mode === "pick" ? styles.toggleActive : ""}
                onClick={() => setMode("pick")}
                disabled={posts.length === 0}
              >
                Pick a post
              </button>
              <button
                type="button"
                className={mode === "paste" ? styles.toggleActive : ""}
                onClick={() => setMode("paste")}
              >
                Paste manually
              </button>
            </div>
          }
        />
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            {mode === "pick" ? (
              <Field
                label="Post"
                required
                hint="Only posts created in this session are listed."
                error={errors.postId?.message}
              >
                <select value={currentPostId || ""} onChange={handlePickPost}>
                  <option value="">Select a post</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {shortId(p.id)} - {truncate(p.text_content, 60)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field
                label="Post ID"
                required
                hint="UUID of a post that exists in the database."
                error={errors.postId?.message}
              >
                <div className={styles.inlineInput}>
                  <input
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    {...register("postId")}
                  />
                  {defaultPost ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setValue("postId", defaultPost.id, {
                          shouldValidate: true,
                        });
                        setValue("text", defaultPost.text_content, {
                          shouldValidate: true,
                        });
                      }}
                    >
                      Use latest post
                    </Button>
                  ) : null}
                </div>
              </Field>
            )}

            <Field
              label="Text"
              required
              hint="The post content the model should score. Arabic is supported."
              error={errors.text?.message}
            >
              <textarea rows={4} {...register("text")} />
            </Field>

            <div className={styles.sampleRow}>
              <span className={styles.sampleLabel}>Samples:</span>
              {postSamples.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={styles.chip}
                  onClick={() =>
                    setValue("text", s.text, { shouldValidate: true })
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className={styles.actions}>
              <Button type="submit" size="lg" loading={isSubmitting}>
                Analyze sentiment
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {result ? (
        <Card tone="success">
          <CardBody>
            <div className={styles.bigResult}>
              <div className={styles.bigLabel}>
                <StatusPill tone={toneFor(result.sentiment)}>
                  {result.sentiment}
                </StatusPill>
              </div>
              <div className={styles.confidenceWrap}>
                <div className={styles.confidenceLabel}>Confidence</div>
                <div className={styles.confidenceBar}>
                  <div
                    className={`${styles.confidenceFill} ${styles[`fill--${toneFor(result.sentiment)}`]}`}
                    style={{ width: `${Math.max(2, Math.round(Number(result.confidence) * 100))}%` }}
                  />
                </div>
                <div className={styles.confidenceValue}>
                  {fmtPercent(result.confidence, 1)}
                </div>
              </div>
              <div className={styles.ids}>
                <IdBadge label="postId" value={result.postId} />
              </div>
            </div>
            <ResultCard title="Raw response" data={result} />
          </CardBody>
        </Card>
      ) : null}

      {error ? <ResultCard tone="error" error={error} /> : null}
    </>
  );
}

function toneFor(label) {
  if (label === "positive") return "positive";
  if (label === "negative") return "negative";
  return "neutral";
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}...` : s;
}
