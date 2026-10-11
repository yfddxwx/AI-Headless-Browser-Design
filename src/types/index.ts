export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InteractiveElement {
  ref: string;             // e.g. "@1", "@2"
  tag: string;             // "a", "button", "input", "select", "textarea"
  role?: string;           // "button", "link", "searchbox", etc.
  name?: string;           // label / aria-label / placeholder / title
  text: string;            // visible text inside
  value?: string;          // input value if present
  href?: string;           // link target if <a>
  type?: string;           // input type (text, password, submit, etc.)
  disabled: boolean;
  selector: string;        // precise CSS or XPath selector
  boundingBox?: BoundingBox;
}

export interface VisualElement extends InteractiveElement {
  boundingBox: BoundingBox;
  isInViewport: boolean;
}

export interface VisualSnapshot {
  url: string;
  title: string;
  viewport: { width: number; height: number };
  annotatedScreenshotBase64: string;
  rawScreenshotBase64?: string;
  visibleElements: VisualElement[];
  totalAnnotatedCount: number;
}

export interface TabInfo {
  tabId: string;
  url: string;
  title: string;
  isActive: boolean;
  openerTabId?: string;
  createdAt: number;
}

export interface TabSwitchResult {
  previousTabId: string;
  currentTabId: string;
  perception: PagePerception;
}

export interface TabCloseResult {
  closedTabId: string;
  activeTabId: string;
  remainingTabs: TabInfo[];
}

export interface PagePerception {
  url: string;
  title: string;
  tabId?: string;
  activeTabs?: TabInfo[];
  compressedMarkdown: string;
  interactiveElements: InteractiveElement[];
  rawHtmlLength: number;
  compressedLength: number;
  compressionRatio: number;
  tokensEstimated: number;
  securityNotice?: string[];
}

export interface ActionResult {
  success: boolean;
  action: string;
  targetRef?: string;
  message: string;
  urlBefore: string;
  urlAfter: string;
  titleBefore: string;
  titleAfter: string;
  diffSummary?: string;
  error?: string;
}

export interface BrowserConfig {
  headless?: boolean;
  stealth?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  allowedDomains?: string[]; // Empty means unrestricted (except private IPs)
  blockPrivateIPs?: boolean;
}

export interface SecurityCheckResult {
  safe: boolean;
  violations: string[];
}

export interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface OriginStorage {
  origin: string;
  localStorage: Record<string, string>;
  sessionStorage?: Record<string, string>;
}

export interface SessionVaultData {
  version: string;
  createdAt: number;
  cookies: BrowserCookie[];
  origins: OriginStorage[];
  userAgent?: string;
}

export interface CaptchaDetectionResult {
  detected: boolean;
  type?: 'cloudflare_turnstile' | 'recaptcha' | 'hcaptcha' | 'generic_challenge';
  message?: string;
  selector?: string;
}
