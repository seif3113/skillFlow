import { createFileRoute, redirect } from "@tanstack/react-router"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { FullWidthDivider } from "@/components/full-width-divider"
import { authClient } from "@/lib/auth/client"

export const Route = createFileRoute("/login")({
  // Guest-only: a signed-in user never sees the login screen.
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: "/" })
    }
  },
  component: Login,
})

export function Login() {
  const [loading, setLoading] = useState(false)

  const continueWithGoogle = async () => {
    setLoading(true)
    try {
      console.log(process.env.APP_URL );
      
      await authClient.signIn.social({
        provider: "google",
        callbackURL: process.env.APP_URL ,
        errorCallbackURL: process.env.APP_URL ,
      })
      // Success redirects the browser to Google, so keep the spinner until then.
    } catch {
      toast.error("Couldn't start Google sign-in. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full overflow-hidden px-4 md:h-screen">
      <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center border-x *:px-6">
        <div className="flex flex-col space-y-6">
          <a aria-label="Home" href="/">
            <Logo className="h-8" />
          </a>
          <div className="space-y-1">
            <h1 className="font-semibold text-xl tracking-wide">
              Hey, welcome!
            </h1>
            <p className="text-base text-muted-foreground">
              Log in or sign up. It only takes a moment.
            </p>
          </div>
        </div>

        <div className="relative my-6 flex size-full flex-col gap-4 py-8">
          <FullWidthDivider position="top" />

          <Button
            className="w-full"
            type="button"
            variant="outline"
            size="lg"
            onClick={continueWithGoogle}
            disabled={loading}
          >
            {loading ? (
              <HugeiconsIcon
                icon={Loading03Icon}
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <div className="size-4 flex items-center justify-center overflow-hidden">
                <img
                  src="/google-logo.svg"
                  alt="Google Logo"
                  data-icon="inline-start"
                  className="size-full object-contain"
                />
              </div>
            )}
            Continue with Google
          </Button>

          <FullWidthDivider position="bottom" />
        </div>

        <p className="text-center text-muted-foreground text-sm">
          By continuing you agree to our{" "}
          <a
            className="underline underline-offset-4 hover:text-primary"
            href="#"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            className="underline underline-offset-4 hover:text-primary"
            href="#"
          >
            Terms of Service
          </a>
          .
        </p>
      </div>
    </div>
  )
}
