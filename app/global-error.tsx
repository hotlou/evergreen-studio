"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#F5F6F8",
          color: "#44546C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
            {error.message || "An unexpected error occurred."}
          </p>
          <pre
            style={{
              fontSize: 11,
              background: "#fff",
              border: "1px solid #D6D8DD",
              borderRadius: 8,
              padding: 12,
              textAlign: "left",
              overflow: "auto",
              marginBottom: 16,
              maxHeight: 200,
            }}
          >
            {error.digest ? `Digest: ${error.digest}\n` : ""}
            {error.stack ?? "No stack trace available."}
          </pre>
          <button
            onClick={reset}
            style={{
              background: "#4EB35E",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
