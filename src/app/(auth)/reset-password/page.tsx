"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type EmailValues = z.infer<typeof emailSchema>;
type NewPasswordValues = z.infer<typeof newPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
  });

  const passwordForm = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
  });

  useEffect(() => {
    const supabase = createClient();

    const syncSession = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setHasSession(!!session);
      });
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const onSendEmail = async (values: EmailValues) => {
    setBanner(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const next = encodeURIComponent("/reset-password");

    const { error } = await supabase.auth.resetPasswordForEmail(
      values.email.trim().toLowerCase(),
      {
        redirectTo: `${origin}/auth/callback?next=${next}`,
      },
    );

    if (error) {
      setBanner(error.message);
      return;
    }

    setBanner(
      "If an account exists for this email, we sent a link. Open it, then choose a new password on this page.",
    );
  };

  const onSetPassword = async (values: NewPasswordValues) => {
    setBanner(null);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setBanner(error.message);
      return;
    }

    await supabase.auth.signOut();
    router.push("/signin?reset=success");
    router.refresh();
  };

  if (hasSession === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (hasSession) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Choose a new password</CardTitle>
          <CardDescription>
            You opened a valid reset link. Set a new password, then sign in
            with it.
          </CardDescription>
        </CardHeader>
        <form onSubmit={passwordForm.handleSubmit(onSetPassword)}>
          <CardContent className="space-y-4">
            {banner && (
              <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                {banner}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("password")}
              />
              {passwordForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register("confirm")}
              />
              {passwordForm.formState.errors.confirm && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.confirm.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={passwordForm.formState.isSubmitting}
            >
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>
          We will email you a link. After you open it, you will return here to
          choose a new password.
        </CardDescription>
      </CardHeader>
      <form onSubmit={emailForm.handleSubmit(onSendEmail)}>
        <CardContent className="space-y-4">
          {banner && (
            <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
              {banner}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...emailForm.register("email")}
            />
            {emailForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={emailForm.formState.isSubmitting}
          >
            Send reset email
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/signin"
              className="text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reset password</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
