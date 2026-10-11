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
  isOccluded?: boolean;    // whether the element is covered by a modal/backdrop
}

export interface VisualElement extends InteractiveElement {
  boundingBox: BoundingBox;
  isInViewport: boolean;
  isOccluded?: boolean;
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
  networkShield?: NetworkShieldConfig;
  hitl?: HITLConfig;
  cdpUrl?: string;
  cdpHeaders?: Record<string, string>;
  remoteCdp?: RemoteCDPConfig;
  ignoreHTTPSErrors?: boolean;
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

export type ChallengeType =
  | 'cloudflare_turnstile'
  | 'recaptcha'
  | 'hcaptcha'
  | 'two_factor_auth'
  | 'generic_challenge';

export interface CaptchaDetectionResult {
  detected: boolean;
  type?: ChallengeType;
  message?: string;
  selector?: string;
}

export type ChallengeStatus =
  | 'detected'
  | 'waiting_for_resolution'
  | 'resolved'
  | 'failed'
  | 'timeout';

export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface ChallengeEvent {
  challengeId: string;
  type: ChallengeType;
  url: string;
  detectedAt: number;
  expiresAt: number;
  screenshotBase64?: string;
  message: string;
  status: ChallengeStatus;
  metadata?: Record<string, any>;
}

export interface ChallengeResolution {
  challengeId: string;
  solved: boolean;
  resolutionToken?: string;
  notes?: string;
  resolvedBy?: 'human' | 'automated_hook' | 'system';
}

export type ChallengeSolverHook = (
  event: ChallengeEvent
) => Promise<ChallengeResolution | boolean | void>;

export interface HITLConfig {
  enabled?: boolean;
  autoBreakOnCaptcha?: boolean;
  defaultTimeoutMs?: number; // e.g. 120000 (2 minutes)
  solverHook?: ChallengeSolverHook;
  onChallengeDetected?: (event: ChallengeEvent) => void;
  onChallengeResolved?: (resolution: ChallengeResolution) => void;
}

export interface NetworkShieldConfig {
  enabled?: boolean;
  blockAnalytics?: boolean;   // Blocks Google Analytics, Facebook Pixel, DoubleClick, etc.
  blockMedia?: boolean;       // Blocks images, audio, video for ultra-fast text/DOM extraction
  blockFonts?: boolean;       // Blocks custom web fonts to save bandwidth
  customBlockedPatterns?: string[];
}

export interface NetworkStats {
  totalRequests: number;
  blockedRequests: number;
  blockedResources: string[];
}

export type ExtractionFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';

export interface ExtractionFieldDef {
  type: ExtractionFieldType;
  description?: string;
  selector?: string;
  required?: boolean;
  items?: ExtractionFieldDef;
  properties?: Record<string, ExtractionFieldDef>;
}

export interface ExtractionSchema {
  name?: string;
  description?: string;
  type?: 'object' | 'array';
  properties?: Record<string, ExtractionFieldDef | any>;
  items?: ExtractionFieldDef | any;
  [key: string]: any;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  author?: string;
  language?: string;
  publishedTime?: string;
  openGraph?: Record<string, string>;
  twitter?: Record<string, string>;
  jsonLd?: any[];
}

export interface StructuredExtractorOptions {
  containerSelector?: string;
  preferMetadata?: boolean;
  maxItems?: number;
  sanitizePromptInjection?: boolean;
}

export interface ExtractionResult<T = any> {
  success: boolean;
  data: T;
  source: 'json-ld' | 'opengraph' | 'microdata' | 'semantic-table' | 'semantic-card' | 'heuristic';
  confidence: number;
  itemCount: number;
  warnings?: string[];
  securityNotices?: string[];
  tokensSavedRatio?: number;
  metadata?: PageMetadata;
}

export interface RemoteCDPConfig {
  endpointUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  slowMo?: number;
}

export interface BrowserPoolConfig {
  mode?: 'local' | 'remote_cdp';
  remoteCdp?: RemoteCDPConfig;
  minSessions?: number;
  maxConcurrentSessions?: number;
  acquireTimeoutMs?: number;
  idleTimeoutMs?: number;
  maxSessionLifetimeMs?: number;
  browserConfig?: BrowserConfig;
  cleanSessionOnRelease?: boolean;
}

export interface PoolStats {
  mode: 'local' | 'remote_cdp';
  totalSessionsCreated: number;
  activeSessions: number;
  idleSessions: number;
  queuedRequests: number;
  recycledSessions: number;
  status: 'healthy' | 'degraded' | 'exhausted';
}

export interface PooledSession {
  id: string;
  session: any; // SessionContext instance
  createdAt: number;
  lastUsedAt: number;
  release: () => Promise<void>;
}
