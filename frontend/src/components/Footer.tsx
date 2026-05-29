export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 mt-8 py-4 text-center text-xs text-neutral-500">
      Built by <span className="font-medium text-neutral-700">Dev Rathore</span>{' '}
      ·{' '}
      <a
        className="underline hover:text-neutral-800"
        href="https://github.com/YOUR_GITHUB"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>{' '}
      ·{' '}
      <a
        className="underline hover:text-neutral-800"
        href="https://www.linkedin.com/in/YOUR_LINKEDIN"
        target="_blank"
        rel="noreferrer"
      >
        LinkedIn
      </a>
    </footer>
  );
}
