import { useState } from "react";
import Section from "./components/Section.jsx";
import CampaignForm from "./components/CampaignForm.jsx";
import PostForm from "./components/PostForm.jsx";
import SentimentPanel from "./components/SentimentPanel.jsx";
import RoiForm from "./components/RoiForm.jsx";
import IdPill from "./components/IdPill.jsx";
import { config } from "./services/api.js";

export default function App() {
  const [campaign, setCampaign] = useState(null);
  const [post, setPost] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [roi, setRoi] = useState(null);

  function handleCampaign(c) {
    setCampaign(c);
    setPost(null);
    setSentiment(null);
    setRoi(null);
  }

  function handlePost(p) {
    setPost(p);
    setSentiment(null);
    setRoi(null);
  }

  function handleSentiment(s) {
    setSentiment(s);
    setRoi(null);
  }

  function handleRoi(r) {
    setRoi(r);
  }

  function handleReset() {
    setCampaign(null);
    setPost(null);
    setSentiment(null);
    setRoi(null);
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>SmartMENA Analytics</h1>
          <p className="app__subtitle">Demo console - create, analyze, predict</p>
        </div>
        <button className="btn btn--ghost" type="button" onClick={handleReset}>
          Reset flow
        </button>
      </header>

      <div
        className={`config-banner ${
          config.demoUserIdConfigured ? "" : "config-banner--warn"
        }`}
      >
        <span className="config-banner__dot" />
        {config.demoUserIdConfigured ? (
          <span>
            Using demo user id from <code>VITE_DEMO_USER_ID</code> - auto-injected
            into every campaign request.
          </span>
        ) : (
          <span>
            <code>VITE_DEMO_USER_ID</code> is not set. Copy <code>.env.example</code>{" "}
            to <code>.env</code> and fill it in, then restart the dev server.
          </span>
        )}
      </div>

      <div className="session">
        <div className="session__label">Session</div>
        <div className="session__pills">
          <IdPill
            label="campaignId"
            value={campaign?.id}
            tone={campaign ? "ok" : "neutral"}
          />
          <IdPill
            label="postId"
            value={post?.id}
            tone={post ? "ok" : "neutral"}
          />
        </div>
      </div>

      <main className="app__main">
        <Section step={1} title="Create campaign" enabled done={Boolean(campaign)}>
          <CampaignForm campaign={campaign} onCreated={handleCampaign} />
        </Section>

        <Section
          step={2}
          title="Create post"
          enabled={Boolean(campaign)}
          done={Boolean(post)}
        >
          <PostForm
            campaign={campaign}
            post={post}
            onCreated={handlePost}
            disabled={!campaign}
          />
        </Section>

        <Section
          step={3}
          title="Analyze sentiment"
          enabled={Boolean(post)}
          done={Boolean(sentiment)}
        >
          <SentimentPanel
            post={post}
            sentiment={sentiment}
            onAnalyzed={handleSentiment}
            disabled={!post}
          />
        </Section>

        <Section
          step={4}
          title="Predict ROI"
          enabled={Boolean(campaign && sentiment)}
          done={Boolean(roi)}
        >
          <RoiForm
            campaign={campaign}
            sentiment={sentiment}
            roi={roi}
            onPredicted={handleRoi}
            disabled={!(campaign && sentiment)}
          />
        </Section>
      </main>

      <footer className="app__footer">
        API base: <code>{config.baseURL}</code>
      </footer>
    </div>
  );
}
