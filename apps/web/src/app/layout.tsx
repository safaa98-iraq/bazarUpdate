// Railway deploy marker: pricing and retired-feature cleanup.
import type { Metadata } from 'next';
import Script from 'next/script';
import { Tajawal, Baloo_Bhaijaan_2 } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { FreePlanTextNormalizer } from '@/components/FreePlanTextNormalizer';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  variable: '--font-tajawal',
  display: 'swap',
});

// Kept on the historical --font-cairo variable name — dozens of pages already
// reference var(--font-cairo) for headings, so swapping the font family here
// re-skins every heading in the app without touching each call site.
const balooBhaijaan2 = Baloo_Bhaijaan_2({
  subsets: ['arabic', 'latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'بازار — ابنِ متجرك الإلكتروني في 5 دقائق',
    template: '%s — بازار',
  },
  description: 'أقوى منصة تجارة إلكترونية في العراق. أنشئ متجرك بدون خبرة تقنية، واستقبل الطلبات فوراً.',
};

const cleanupScript = `
(() => {
  const blocked = [
    /ذكاء/i,
    /اصطناعي/i,
    /\\bAI\\b/i,
    /OpenAI/i,
    /ChatGPT/i,
    /artificial intelligence/i,
    /machine learning/i
  ];

  const productLimitPatterns = [
    /100\\s*منتجات?/g,
    /10\\s*منتجات?/g,
    /١٠٠\\s*منتجات?/g,
    /١٠\\s*منتجات?/g
  ];

  const containsBlockedText = (text) => blocked.some((pattern) => pattern.test(text || ''));

  const normalizeText = (node) => {
    if (!node || !node.nodeValue) return;
    let value = node.nodeValue;
    productLimitPatterns.forEach((pattern) => {
      value = value.replace(pattern, '55 منتج');
    });
    if (value !== node.nodeValue) node.nodeValue = value;
  };

  const chooseTarget = (element) => {
    if (!element) return null;

    const direct = element.closest('tr, li, button, a, [role="button"], [data-feature-row], .feature-row, .pricing-feature, .plan-feature');
    if (direct) return direct;

    let current = element;
    for (let depth = 0; current && current !== document.body && depth < 6; depth += 1) {
      const text = (current.textContent || '').trim();
      const style = window.getComputedStyle(current);
      const isRowLike = style.display === 'flex' || style.display === 'grid' || style.display === 'inline-flex';
      if (isRowLike && text.length > 0 && text.length < 320) return current;
      current = current.parentElement;
    }

    return element;
  };

  const hideForText = (node) => {
    const text = node?.nodeValue || '';
    if (!containsBlockedText(text)) return;
    const target = chooseTarget(node.parentElement);
    if (!target || target === document.body || target === document.documentElement) return;
    target.setAttribute('data-removed-feature', 'true');
    target.setAttribute('aria-hidden', 'true');
    target.style.setProperty('display', 'none', 'important');
  };

  const inspectElement = (element) => {
    if (!(element instanceof Element)) return;
    const attributeText = [
      element.getAttribute('placeholder'),
      element.getAttribute('title'),
      element.getAttribute('aria-label'),
      element.getAttribute('data-label')
    ].filter(Boolean).join(' ');

    if (containsBlockedText(attributeText)) {
      const target = chooseTarget(element);
      if (target && target !== document.body && target !== document.documentElement) {
        target.setAttribute('data-removed-feature', 'true');
        target.setAttribute('aria-hidden', 'true');
        target.style.setProperty('display', 'none', 'important');
      }
    }
  };

  const scan = (root) => {
    if (!root) return;
    if (root instanceof Element) {
      inspectElement(root);
      root.querySelectorAll('*').forEach(inspectElement);
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      normalizeText(node);
      hideForText(node);
      node = walker.nextNode();
    }
  };

  const start = () => {
    scan(document.body);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          normalizeText(mutation.target);
          hideForText(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            normalizeText(node);
            hideForText(node);
          } else if (node instanceof Element) {
            scan(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} ${balooBhaijaan2.variable} font-[family-name:var(--font-tajawal)]`}>
        <Script id="remove-retired-feature-copy" strategy="beforeInteractive">
          {cleanupScript}
        </Script>
        {children}
        <FreePlanTextNormalizer />
        <Toaster richColors position="top-left" />
      </body>
    </html>
  );
}
