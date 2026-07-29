import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

/**
 * Must Be The SQL — product documentation site
 * --------------------------------------------------------------------------
 * Deployment model (per project spec):
 *   - baseUrl = "/docs/"   →  same-domain subpath:  https://example.com/docs/
 *   - docs routeBasePath = "/"  →  docs ARE the site root, so the landing page
 *     is docs/index.mdx and there is NO double "/docs/docs/" prefix.
 *
 * NOTE: for the alternative SUBDOMAIN deployment (docs.example.com), change
 * `baseUrl` to "/" and rebuild — see nginx/docs-subdomain.conf + README.
 */

const config: Config = {
  title: 'Must Be The SQL',
  tagline: '面向数据科学工作流的可视化 SQL 逻辑引擎',
  favicon: 'img/favicon.svg',
  url: 'https://example.com',
  baseUrl: '/docs/',

  // GitHub Pages deploy path (unused when self-hosting via Nginx).
  trailingSlash: false,

  onBrokenLinks: 'warn',

  // Even though the site is self-hosted, this keeps GitHub Pages builds honest.
  organizationName: 'must-be-the-sql',
  projectName: 'docs',

  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          // Docs-only site: docs live at the site root so baseUrl="/docs/"
          // yields clean https://example.com/docs/<doc> URLs (no /docs/docs/).
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/must-be-the-sql/docs/edit/main/MustBeTheSQL/sql-logic-docs/docs/',
          // Show "last updated" time/author per doc. Requires sql-logic-docs to be
          // committed to a git repo (run `git log -- <file>`). If your docs project
          // is NOT yet in git, leave these false to avoid build-time git errors.
          showLastUpdateTime: false,
          showLastUpdateAuthor: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: ['@docusaurus/theme-mermaid'],

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  plugins: [
    // Built-in-style LOCAL (offline) search — no Algolia account required.
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexPages: false,
        docsRouteBasePath: ['/'],
        searchResultLimits: 8,
        searchBarPosition: 'right',
      },
    ],
  ],

  themeConfig: {
    // ── Light / Dark dual mode ────────────────────────────────────────────
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
      disableSwitch: false,
    },

    image: 'img/og-image.png',
    metadata: [{name: 'twitter:card', content: 'summary_large_image'}],

    navbar: {
      title: 'Must Be The SQL',
      logo: {
        alt: 'Must Be The SQL Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo.svg',
        href: '/',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: '文档',
        },
        {
          type: 'doc',
          docId: 'api/overview',
          position: 'left',
          label: 'API',
        },
        {
          href: 'https://github.com/must-be-the-sql',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Must Be The SQL. Built with Docusaurus.`,
      links: [
        {
          title: '文档',
          items: [
            {label: '快速开始', to: '/getting-started/introduction'},
            {label: '项目结构', to: '/constructure/overview'},
            {label: '使用指南', to: '/guide/workflow-design'},
          ],
        },
        {
          title: '资源',
          items: [
            {label: 'API 说明', to: '/api/overview'},
            {label: '常见问题', to: '/faq/general'},
            {label: 'GitHub', href: 'https://github.com/must-be-the-sql'},
          ],
        },
      ],
    },

    prism: {
      theme: prismThemes.vsLight,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['java', 'yaml', 'bash', 'json', 'tsx'],
    },

    // Algolia is intentionally NOT configured — local search plugin is used.
    algolia: undefined,
  } satisfies Preset.ThemeConfig,
};

export default config;
