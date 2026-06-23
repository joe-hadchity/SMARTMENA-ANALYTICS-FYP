"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LineChart, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

const DEMO_EMAIL = "born2hike@smartmena.local";
const DEMO_PASSWORD = "Born2Hike2026!";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await auth.signIn({ email, password });
      toast.success("Signed in", {
        description: "Your workspace is ready.",
      });
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen text-fg grid place-items-center px-4 py-10 relative overflow-hidden"
      style={{ background: "oklch(var(--bg))" }}
    >
      <div
        className="fixed pointer-events-none z-0"
        style={{ top: -120, right: -120, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, oklch(88% 0.060 320 / 0.45) 0%, transparent 70%)" }}
      />
      <div
        className="fixed pointer-events-none z-0"
        style={{ bottom: -140, left: -100, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, oklch(92% 0.050 60 / 0.5) 0%, transparent 70%)" }}
      />
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0 24px, rgba(50,30,30,0.04) 24px 25px), repeating-linear-gradient(90deg, transparent 0 24px, rgba(50,30,30,0.04) 24px 25px)", backgroundAttachment: "fixed" }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-fg">
            <LineChart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">SmartMENA</h1>
            <p className="text-sm text-fg-muted">Marketing analytics workspace</p>
          </div>
        </div>

        <Card padded={false} elevated>
          <CardHeader>
            <div>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Access your SmartMENA analytics workspace.
              </CardDescription>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" block loading={loading}>
                Sign in
              </Button>
              <Button
                type="button"
                variant="outline"
                block
                onClick={() => {
                  setEmail(DEMO_EMAIL);
                  setPassword(DEMO_PASSWORD);
                }}
              >
                Fill demo account
              </Button>
              <p className="text-center text-xs text-fg-muted">
                New user?{" "}
                <Link href="/register" className="font-medium text-primary">
                  Create an account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
