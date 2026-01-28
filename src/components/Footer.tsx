import { Heart } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-base-300 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 text-primary flex-shrink-0">
                <Logo size={32} className="text-primary" />
              </div>
              <span className="font-bold text-lg">Margea</span>
            </div>
            <p className="text-sm text-base-content/70">
              {t('footer.description')}
            </p>
          </div>

          {/* Links Section */}
          <div>
            <h3 className="font-bold mb-4 text-base-content">
              {t('footer.resources')}
            </h3>
            <ul className="space-y-3 text-base-content/70">
              <li>
                <a
                  href="https://docs.github.com/pt/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {t('footer.how_to_generate_token')}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/renovatebot/renovate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {t('footer.about_renovate')}
                </a>
              </li>
            </ul>
          </div>

          {/* Info Section */}
          <div>
            <h3 className="font-bold mb-4 text-base-content">
              {t('footer.technologies')}
            </h3>
            <ul className="space-y-3 text-base-content/70">
              <li>React + TypeScript</li>
              <li>Relay GraphQL</li>
              <li>GitHub GraphQL API</li>
              <li>Tailwind CSS + DaisyUI</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="divider my-6"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-base-content/60">
          <p className="flex items-center gap-1">
            {t('footer.made_with')}{' '}
            <span className="w-[14px] h-[14px] text-error">
              <Heart size={14} className="text-error fill-error" />
            </span>{' '}
            {t('footer.using')}
          </p>
          <p>
            &copy; {currentYear} Margea. {t('footer.rights_reserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}
