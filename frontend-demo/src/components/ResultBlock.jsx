export default function ResultBlock({ title, data, error, summary }) {
  if (!data && !error) return null;

  if (error) {
    const headline = friendlyHeadline(error);
    const detailsText = detailsBlock(error);
    return (
      <div className="result result--error">
        <div className="result__title">Something went wrong</div>
        <div className="result__summary">{headline}</div>
        {detailsText ? <pre className="result__pre">{detailsText}</pre> : null}
      </div>
    );
  }

  return (
    <div className="result result--ok">
      <div className="result__title">{title || "Response"}</div>
      {summary ? <div className="result__summary">{summary}</div> : null}
      <pre className="result__pre">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function friendlyHeadline(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;

  const status = error.status;
  const message = error.message || "Request failed";

  if (!status) return `${message} (is the backend running on the configured base URL?)`;
  if (status === 400) return `Invalid request - ${message}`;
  if (status === 404) return `Not found - ${message}`;
  if (status === 502) return `Upstream ML service error - ${message}`;
  if (status >= 500) return `Server error (${status}) - ${message}`;
  return `${status} - ${message}`;
}

function detailsBlock(error) {
  if (!error || typeof error === "string") return "";
  if (error.details == null) return "";
  if (typeof error.details === "string") return error.details;
  return JSON.stringify(error.details, null, 2);
}
