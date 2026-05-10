"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LineChart, UserPlus } from "lucide-react";
import { toast } from "sonner";

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

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [region, setRegion] = useState("LB");
  const [industry, setIndustry] = useState("general");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await auth.register({
        name,
        email,
        password,
        workspaceName: workspaceName || `${name}'s Workspace`,
        region,
        locale: "en",
        industry,
      });
      toast.success("Account created", {
        description: "Your workspace is ready.",
      });
      router.replace("/");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create account",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg text-fg grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-fg">
            <LineChart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">SmartMENA</h1>
            <p className="text-sm text-fg-muted">Create your analytics account</p>
          </div>
        </div>

        <Card padded={false} elevated>
          <CardHeader>
            <div>
              <CardTitle>Register</CardTitle>
              <CardDescription>
                Create a user and a first workspace.
              </CardDescription>
            </div>
            <UserPlus className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="workspace">Workspace name</Label>
                <Input
                  id="workspace"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="Business or brand name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={region}
                    onChange={(event) => setRegion(event.target.value.toUpperCase())}
                    maxLength={8}
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" block loading={loading}>
                Create account
              </Button>
              <p className="text-center text-xs text-fg-muted">
                Already registered?{" "}
                <Link href="/login" className="font-medium text-primary">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
