"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDbError =
    error.message?.includes("prisma") ||
    error.message?.includes("ECONNREFUSED") ||
    error.message?.includes("connection") ||
    error.message?.includes("database");

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#F5F6F8", fontFamily: "system-ui, sans-serif" }}
    >
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#44546C" }}>
          {isDbError ? "Database not connected" : "Something went wrong"}
        </h1>
        <p className="text-sm mb-4" style={{ color: "#6B7A90", lineHeight: 1.6 }}>
          {isDbError ? (
            <>
              Evergreen Studio needs a Postgres database. Set{" "}
              <code
                style={{
                  background: "#fff",
                  border: "1px solid #D6D8DD",
                  borderRadius: 4,
                  padding: "1px 4px",
                  fontSize: 12,
                }}
              >
                DATABASE_URL
              </code>{" "}
              in your environment variables and run{" "}
              <code
                style={{
                  background: "#fff",
                  border: "1px solid #D6D8DD",
                  borderRadius: 4,
                  padding: "1px 4px",
                  fontSize: 12,
                }}
              >
                npx prisma db push
              </code>
              .
            </>
          ) : (
            error.message || "An unexpected error occurred."
          )}
        </p>
        <div className="flex justify-center gap-3">
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
          <Link
            href="/"
            style={{
              background: "#fff",
              color: "#44546C",
              border: "1px solid #D6D8DD",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
