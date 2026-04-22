import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" subtitle="That route doesn't exist." />
      <Card>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
            The page you tried to open isn't part of the beta.
          </p>
          <Link to="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    </>
  );
}
