import Link from "next/link";

export default function SkinLogLandingPage() {
  return (
    <div className="skinlog__inner">
      <header className="skinlog__header">
        <Link href="/skinlog" className="skinlog__logo">
          SkinLog
        </Link>
      </header>

      <main className="skinlog__section">
        <h1 className="skinlog__title">Track changes over time.</h1>
        <p className="skinlog__lead">
          Photograph skin lesions or run a guided full-body scan. Descriptions
          are saved by date so you can review your history with your care team.
        </p>

        <Link href="/skinlog/capture" className="skinlog__btn">
          Get started
        </Link>

        <Link href="/skinlog/history" className="skinlog__link">
          View history
        </Link>

        <p className="skinlog__disclaimer">
          For personal tracking only. SkinLog does not provide a medical
          diagnosis.
        </p>
      </main>
    </div>
  );
}
