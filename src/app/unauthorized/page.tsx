import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="empty" id="main-content">
      <span className="empty-symbol">✳</span>
      <h1>That space is not yours to enter.</h1>
      <p>
        Your signed-in account does not have the required marketplace access.
      </p>
      <Link className="btn" href="/auth/redirect">
        Go to your account
      </Link>
    </main>
  );
}
