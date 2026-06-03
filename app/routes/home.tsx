export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: "#fff7ec",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <img
        src="/logo.PNG"
        alt="MNH Creations Logo"
        style={{
          width: "300px",
          maxWidth: "80%",
          marginBottom: "2rem",
        }}
      />

      <h1
  style={{
    fontSize: "clamp(2.5rem, 8vw, 4rem)",
    letterSpacing: "-0.02em",
    margin: 0,
    color: "#1f1f1f",
    fontWeight: 900,
    lineHeight: 1,
  }}
>
  MNH Creations
</h1>

      <p
        style={{
          fontSize: "1.5rem",
          color: "#666",
          marginTop: "1rem",
          marginBottom: "2rem",
          fontWeight: 500,
        }}
      >
        Custom Creations • Personalized Gifts • Handmade Designs
      </p>

      <h2
        style={{
          fontSize: "2rem",
          color: "#1f1f1f",
          marginBottom: "1rem",
          letterSpacing: "0.1em",
        }}
      >
        COMING SOON
      </h2>

      <p
        style={{
          fontSize: "1.2rem",
          color: "#444",
          margin: 0,
        }}
      >
        Contact us at{" "}
        <a
          href="mailto:info@mnhcreations.com"
          style={{
            color: "#1f1f1f",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          info@mnhcreations.com
        </a>
      </p>
    </main>
  );
}