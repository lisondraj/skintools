"use client";

import Link from "next/link";
import { useState } from "react";

const TOOLS = [
  {
    name: "Skin Archive",
    href: "/skinlog",
    meta: "Track skin changes over time",
  },
  {
    name: "Remorph",
    href: "/remorph",
    meta: "Region-targeted lesion editing",
  },
  {
    name: "Infographic Builder",
    href: "/infographic",
    meta: "AI patient education posters",
  },
  {
    name: "Modules",
    href: "/modules",
    meta: "Slides + virtual patient voice sim",
  },
  {
    name: "Virtual Patient",
    href: "/vsp",
    meta: "Voice encounter practice + transcript",
  },
  {
    name: "Live Translate",
    href: "/translate",
    meta: "Real-time speech translation",
  },
] as const;

const SPACES = [
  {
    name: "Kitchen Studio",
    meta: "0.4 mi · $42/hr",
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Garden Terrace",
    meta: "0.8 mi · $38/hr",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Warehouse Loft",
    meta: "1.2 mi · $55/hr",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Photo Lab",
    meta: "1.5 mi · $48/hr",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=400&q=80",
  },
] as const;

const upRightArrow = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

const menuIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const closeIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden
  >
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main style={{ minHeight: "100vh", overflowX: "hidden", maxWidth: "100%" }}>
      {/* Desktop — unchanged from bino pattern */}
      <section className="desktop-view">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "1rem",
            padding: "2rem",
          }}
        >
          <h1 style={{ fontSize: "3.5rem", letterSpacing: "-0.02em" }}>
            hello
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#444" }}>
            Desktop view — Geist Mono headings, Inter body.
          </p>
        </div>
      </section>

      {/* Mobile — nav, hero, first section, footer (no em zoom scaling) */}
      <section className="mobile-view mobile-view--skin">
        <header>
          <div className="skin-nav">
            <button
              type="button"
              className="skin-nav__logo"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Skin
            </button>
            <button
              type="button"
              className="skin-nav__menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? closeIcon : menuIcon}
            </button>
          </div>
          <nav
            className="skin-nav__panel"
            aria-label="Mobile navigation"
            hidden={!menuOpen}
          >
            <button type="button" className="skin-nav__link">
              Host
            </button>
            <button type="button" className="skin-nav__link">
              Book
            </button>
          </nav>
        </header>

        <section className="skin-hero" aria-label="Hero">
          <div className="skin-hero__content">
            <h1 className="skin-hero__title">Skin</h1>
            <p className="skin-hero__description">
              <span>Book spaces for</span>
              <span>physical intelligence.</span>
            </p>
            <div className="skin-hero__actions">
              <button type="button" className="skin-btn skin-btn--primary-on-dark">
                Host
                {upRightArrow}
              </button>
              <button type="button" className="skin-btn skin-btn--secondary-on-dark">
                Book
                {upRightArrow}
              </button>
            </div>
          </div>
        </section>

        <section className="skin-section" aria-labelledby="tools-heading">
          <div className="skin-section__header">
            <h2 id="tools-heading" className="skin-section__title">
              Tools
            </h2>
          </div>
          <div className="skin-section__scroll">
            {TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href} className="skin-card skin-card--link">
                <div className="skin-card__body">
                  <h3 className="skin-card__name">{tool.name}</h3>
                  <p className="skin-card__meta">{tool.meta}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="skin-section" aria-labelledby="spaces-heading">
          <div className="skin-section__header">
            <h2 id="spaces-heading" className="skin-section__title">
              Spaces
            </h2>
          </div>
          <div className="skin-section__scroll">
            {SPACES.map((space) => (
              <article key={space.name} className="skin-card">
                <div className="skin-card__media">
                  <img src={space.image} alt={space.name} loading="lazy" />
                </div>
                <div className="skin-card__body">
                  <h3 className="skin-card__name">{space.name}</h3>
                  <p className="skin-card__meta">{space.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="skin-footer">
          <div className="skin-footer__main">
            <div className="skin-footer__brand">
              <p className="skin-footer__company">Embark LLC</p>
              <a className="skin-footer__email" href="mailto:hi@embark.ai">
                hi@embark.ai
              </a>
              <p className="skin-footer__address">
                548 Market Street
                <br />
                San Francisco, CA 94104
              </p>
            </div>
            <nav className="skin-footer__pages" aria-label="Footer pages">
              <a className="skin-footer__page-link" href="#">
                Book
              </a>
              <a className="skin-footer__page-link" href="#spaces-heading">
                Spaces
              </a>
              <a className="skin-footer__page-link" href="#">
                People
              </a>
              <a className="skin-footer__page-link" href="#">
                Audiences
              </a>
            </nav>
          </div>
          <div className="skin-footer__chrome">
            <p className="skin-footer__wordmark">Skin</p>
            <div className="skin-footer__social">
              <a
                className="skin-footer__social-link"
                href="https://www.linkedin.com/"
                aria-label="LinkedIn"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.45 20.45h-3.56v-5.59c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.69H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.62 0 4.28 2.38 4.28 5.48v6.26zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
                </svg>
              </a>
              <a
                className="skin-footer__social-link"
                href="https://twitter.com/"
                aria-label="Twitter"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.24 7.57c.01.14.01.28.01.43 0 4.39-3.34 9.45-9.45 9.45-1.88 0-3.63-.55-5.1-1.5.26.03.53.04.8.04 1.56 0 2.99-.53 4.13-1.43-1.46-.03-2.69-.99-3.11-2.31.2.04.41.06.63.06.3 0 .6-.04.88-.11-1.53-.31-2.68-1.65-2.68-3.27v-.04c.45.25.97.4 1.52.42-.9-.6-1.49-1.63-1.49-2.79 0-.61.16-1.19.45-1.69 1.64 2.01 4.09 3.33 6.85 3.47-.05-.22-.08-.46-.08-.7 0-1.7 1.38-3.08 3.08-3.08.89 0 1.69.37 2.25.97.7-.14 1.36-.39 1.95-.74-.23.72-.72 1.33-1.36 1.71.63-.07 1.23-.24 1.79-.49-.42.62-.94 1.17-1.55 1.61z" />
                </svg>
              </a>
              <a
                className="skin-footer__social-link"
                href="https://www.instagram.com/"
                aria-label="Instagram"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2zm-.2 2C5.6 4 4 5.6 4 7.6v8.8c0 2 1.6 3.6 3.6 3.6h8.8c2 0 3.6-1.6 3.6-3.6V7.6c0-2-1.6-3.6-3.6-3.6H7.6zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
