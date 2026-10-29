"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <span className="empty-symbol">✳</span>
      <h1>A little hiccup.</h1>
      <p>Your browser data is still here. Let’s give that another try.</p>
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
