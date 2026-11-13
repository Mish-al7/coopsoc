"use client"; // Error boundaries must be Client Components

// Last-resort page when even the root layout fails. It replaces the whole document,
// so it carries its own minimal styles and shows both languages.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  console.error(error);
  return (
    <html lang="ml">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f9fc", color: "#0e314c" }}>
        <title>THWICS</title>
        <div style={{ maxWidth: 420, margin: "15vh auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>ക്ഷമിക്കണം, ഈ പേജ് ലോഡ് ചെയ്യാനായില്ല</h1>
          <p style={{ color: "#5d6b7a", marginTop: 0 }}>Sorry, this page couldn’t load. Please reload and try again.</p>
          <button
            type="button"
            onClick={() => {
              retry();
              window.location.reload();
            }}
            style={{ marginTop: 16, padding: "12px 20px", border: 0, borderRadius: 12, background: "#c94427", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
          >
            വീണ്ടും ലോഡ് ചെയ്യുക / Reload
          </button>
        </div>
      </body>
    </html>
  );
}
