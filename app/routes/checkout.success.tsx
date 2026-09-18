import { useEffect } from "react";
import { data, Link, redirect, useRevalidator } from "react-router";
import type { Route } from "./+types/checkout.success";
import { isLaunchModeEnabled } from "~/lib/launchMode.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  if (isLaunchModeEnabled(context.cloudflare.env)) throw redirect("/");
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const order = sessionId
    ? await context.cloudflare.env.ORDERS_DB.prepare("SELECT status FROM orders WHERE stripe_checkout_session_id = ?")
      .bind(sessionId).first<{ status: string }>()
    : null;
  return data({ status: order?.status ?? "unknown" }, { headers: { "Cache-Control": "no-store" } });
}

export default function CheckoutSuccess({ loaderData }: Route.ComponentProps) {
  const { status } = loaderData;
  const { revalidate } = useRevalidator();
  const pending = status === "checkout_created";
  useEffect(() => {
    if (!pending) return;
    let attempts = 0;
    const timer = setInterval(() => {
      void revalidate();
      if (++attempts >= 10) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [pending, revalidate]);
  const paid = status === "paid";
  const title = paid ? "Payment received" : pending ? "Payment confirmation pending" : status === "failed" ? "Payment failed" : status === "cancelled" ? "Checkout expired" : "Payment not confirmed";
  const message = paid
    ? "Your payment has been confirmed. MNH Creations will use the order details and artwork attached to your order for production."
    : pending
      ? "We are waiting for secure payment confirmation. Please refresh this page in a moment. Do not submit another payment."
      : "We could not confirm a paid order for this checkout. If you completed payment, contact MNH Creations before trying again.";
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center text-[#4A3728]">
      <div className="rounded-[28px] border border-[#F4E9D8] bg-white p-8 shadow-sm">
        <h1 className="mt-2 font-[family-name:var(--font-head)] text-3xl font-semibold">{title}</h1>
        <p className="mt-4 text-[#7A5C46]" role="status">{message}</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-[#C9713D] px-6 py-3 font-extrabold text-white">Return Home</Link>
      </div>
    </main>
  );
}
