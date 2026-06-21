import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-bar">
      <div className="app-container py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-base-content/60">
          <p>
            &copy; {currentYear} Margea
            <span className="mx-1.5 text-base-content/30" aria-hidden>
              ·
            </span>
            {t('footer.description')}
          </p>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Footer">
            <a
              href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors duration-150"
            >
              {t('footer.how_to_generate_token')}
            </a>
            <a
              href="https://github.com/renovatebot/renovate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors duration-150"
            >
              {t('footer.about_renovate')}
            </a>
            <a
              href="https://github.com/lucasew/margea"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors duration-150"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
