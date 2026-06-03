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
/>

      <h1
        style={{
          fontSize: "3rem",
          letterSpacing: "0.15em",
          margin: "0 0 1rem",
          color: "#1f1f1f",
          fontWeight: 800,
        }}
      >
        COMING SOON
      </h1>

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