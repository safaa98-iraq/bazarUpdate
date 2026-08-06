'use client';

import { useEffect } from 'react';

const REPLACEMENTS: Record<string, string> = {
  '100 منتجات': '55 منتج',
  '100 منتج': '55 منتج',
  '10 منتجات': '55 منتج',
  '10 منتج': '55 منتج',
  '75 منتجات': '55 منتج',
  '75 منتج': '55 منتج',
  '١٠٠ منتجات': '٥٥ منتج',
  '١٠٠ منتج': '٥٥ منتج',
  '١٠ منتجات': '٥٥ منتج',
  '١٠ منتج': '٥٥ منتج',
  '٧٥ منتجات': '٥٥ منتج',
  '٧٥ منتج': '٥٥ منتج',
  '100 products': '55 products',
  '10 products': '55 products',
  '75 products': '55 products',
};

const BLOCKED_TEXT_PATTERNS = [
  /ذكاء/i,
  /الذكاء/i,
  /اصطناعي/i,
  /الاصطناعي/i,
  /ذكي/i,
  /\bAI\b/i,
  /OpenAI/i,
  /ChatGPT/i,
  /artificial\s+intelligence/i,
  /machine\s+learning/i,
  /توليد\s+(?:بال|بواسطة|عبر)?\s*الذكاء/i,
  /اقتراح\s*سعر\s+(?:بال|بواسطة|عبر)?\s*الذكاء/i,
  /رصيد\s+(?:ال)?ذكاء/i,
  /أوصاف\s*المنتجات\s+(?:بال|بواسطة|عبر)?\s*الذكاء/i,
  /وصف\s*المنتجات\s+(?:بال|بواسطة|عبر)?\s*الذكاء/i,
  /generate\s*description/i,
  /suggest\s*price/i,
  /AI\s*credits?/i,
];

const HIDE_SELECTOR = [
  'tr',
  'button',
  'a',
  'li',
  '[role="button"]',
  '[data-ai-feature]',
  '.ai-feature',
  '.feature-row',
  '.pricing-feature',
  '.plan-feature',
  'article',
  'div',
].join(',');

const OLD_LIMITS = new Set(['10', '100', '75', '١٠', '١٠٠', '٧٥']);
type SearchRoot = Document | Element | DocumentFragment;

function normalizeNodeText(node: Node) {
  if (!node.nodeValue) return;
  let nextValue = node.nodeValue;
  for (const [from, to] of Object.entries(REPLACEMENTS)) {
    nextValue = nextValue.replaceAll(from, to);
  }
  if (nextValue !== node.nodeValue) node.nodeValue = nextValue;
}

function hasBlockedText(text: string) {
  return BLOCKED_TEXT_PATTERNS.some(pattern => pattern.test(text));
}

function hideTargetFrom(element: Element | null) {
  if (!element) return;

  if (element.closest('#features') && element.parentElement instanceof HTMLElement) {
    const featureItem = element.parentElement;
    if (featureItem !== document.body && featureItem.id !== 'features') {
      featureItem.style.display = 'none';
      featureItem.setAttribute('aria-hidden', 'true');
      return;
    }
  }

  const target = element.closest(HIDE_SELECTOR) as HTMLElement | null;
  if (!target || target === document.body || target === document.documentElement) return;
  target.style.display = 'none';
  target.setAttribute('aria-hidden', 'true');
}

function hideElementForTextNode(node: Node) {
  const text = node.nodeValue ?? '';
  if (!hasBlockedText(text)) return;
  hideTargetFrom(node.parentElement);
}

function hideElementForAttributes(element: Element) {
  const text = [
    element.getAttribute('placeholder') ?? '',
    element.getAttribute('title') ?? '',
    element.getAttribute('aria-label') ?? '',
    element.getAttribute('data-label') ?? '',
  ].join(' ');
  if (hasBlockedText(text)) hideTargetFrom(element);
}

function enforceFreeProductLimit(root: SearchRoot = document) {
  root.querySelectorAll('tr').forEach(row => {
    const cells = row.querySelectorAll('td, th');
    const rowText = row.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (!rowText.includes('عدد المنتجات') || cells.length < 2) return;
    if ((cells[1].textContent ?? '').trim() !== '55') cells[1].textContent = '55';
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const value = node.nodeValue?.trim() ?? '';
    if (OLD_LIMITS.has(value)) {
      let container = node.parentElement;
      for (let depth = 0; container && depth < 5; depth += 1) {
        const text = container.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        const inPricingArea = Boolean(container.closest('#pricing, #plan-comparison, [data-pricing], [data-plan-card]'));
        if (inPricingArea && /منتج|منتجات|products?/i.test(text) && text.length <= 45) {
          node.nodeValue = /[١٠]/.test(value) ? '٥٥' : '55';
          break;
        }
        container = container.parentElement;
      }
    }
    node = walker.nextNode();
  }
}

function getSearchRoot(root: Node): SearchRoot {
  if (root instanceof Document || root instanceof Element || root instanceof DocumentFragment) return root;
  return document;
}

function normalizeVisibleText(root: Node = document.body) {
  if (root instanceof Element) {
    hideElementForAttributes(root);
    root.querySelectorAll('*').forEach(hideElementForAttributes);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    normalizeNodeText(node);
    hideElementForTextNode(node);
    node = walker.nextNode();
  }

  enforceFreeProductLimit(getSearchRoot(root));
}

export function FreePlanTextNormalizer() {
  useEffect(() => {
    normalizeVisibleText();

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          normalizeNodeText(mutation.target);
          hideElementForTextNode(mutation.target);
          continue;
        }

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          hideElementForAttributes(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            normalizeNodeText(node);
            hideElementForTextNode(node);
          } else if (node instanceof HTMLElement) {
            normalizeVisibleText(node);
          }
        });
      }

      enforceFreeProductLimit();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'data-label'],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
