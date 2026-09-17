import { Link } from "react-router";

export default function CheckoutSuccess() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center text-[#4A3728]">
      <div className="rounded-[28px] border border-[#F4E9D8] bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-[#C9713D]">Payment received</p>
        <h1 className="mt-2 font-[family-name:var(--font-head)] text-3xl font-semibold">Thank you for your MNH Creations order.</h1>
        <p className="mt-4 text-[#7A5C46]">Your payment is being confirmed securely. MNH Creations will use the order details and artwork attached to your order for production.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-[#C9713D] px-6 py-3 font-extrabold text-white">Return Home</Link>
      </div>
    </main>
  );
}
