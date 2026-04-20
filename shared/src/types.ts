/**
 * Core domain types for Clarity.
 *
 * These types are the contract between Extension, Webapp, Engine, and Indexer.
 * Any change here requires review across all consumers.
 */

// --- Primitives ---

export type Address = `0x${string}`;
export type TxHash = `0x${string}`;
export type ChainId = 1 | 8453 | 42161 | 10; // Ethereum, Base, Arbitrum, Optimism
export type Locale = 'en' | 'ru' | 'zh' | 'es' | 'tr' | 'ko' | 'pt';

// --- Transaction analysis (Mode 2 Guardian) ---

export type RiskLevel = 'safe' | 'caution' | 'danger' | 'critical';

export interface TxAnalysis {
  txObject: RawTransaction;
  chainId: ChainId;
  risk: {
    level: RiskLevel;
    flags: RiskFlag[];
    summary: LocalizedString;
  };
  humanReadable: LocalizedString;
  simulation: SimulationResult | null;
  counterparty: CounterpartySnapshot | null;
  alternatives: Alternative[];
}

export interface RawTransaction {
  from: Address;
  to: Address;
  value: string; // hex
  data: string;  // hex
  gas?: string;
  gasPrice?: string;
}

export interface RiskFlag {
  code: RiskFlagCode;
  severity: RiskLevel;
  explanation: LocalizedString;
}

export type RiskFlagCode =
  | 'unlimited_approval'
  | 'unverified_contract'
  | 'known_phishing'
  | 'suspicious_counterparty'
  | 'high_slippage'
  | 'unusual_gas_price'
  | 'first_interaction'
  | 'contract_proxy_mismatch'
  | 'sanctioned_address';

export interface SimulationResult {
  success: boolean;
  balanceChanges: BalanceChange[];
  error?: string;
}

export interface BalanceChange {
  address: Address;
  token: TokenInfo;
  delta: string; // bigint as string
}

export interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
  name?: string;
  logoURI?: string;
}

export interface Alternative {
  description: LocalizedString;
  estimatedSavingsUsd?: number;
  actionUrl?: string;
}

// --- Credit scoring (Mode 3 Inspect) ---

export interface CreditProfile {
  address: Address;
  score: number; // 0-100
  classification: BehaviorType;
  history: {
    totalBorrowed: string; // USD
    totalRepaid: string;
    liquidations: number;
    activeLoans: number;
    protocolsUsed: string[]; // ['aave-v3', 'morpho', 'compound-v3', ...]
    firstActivityAt: number; // unix
    lastActivityAt: number;
  };
  riskFactors: RiskFactor[];
  sybilCluster: SybilCluster | null;
  sizeTier: 'whale' | 'mid' | 'small' | 'dust';
  updatedAt: number;
}

export type BehaviorType =
  | 'hodler'
  | 'trader'
  | 'yield_farmer'
  | 'sybil_farmer'
  | 'responsible_borrower'
  | 'risky_borrower'
  | 'defaulter'
  | 'new_wallet';

export interface RiskFactor {
  code: string;
  severity: RiskLevel;
  description: LocalizedString;
}

export interface SybilCluster {
  clusterId: string;
  memberCount: number;
  confidence: number; // 0-1
  commonFundingSource: Address | null;
}

export interface CounterpartySnapshot {
  address: Address;
  isContract: boolean;
  verified: boolean;
  profile: Pick<CreditProfile, 'score' | 'classification' | 'sizeTier'> | null;
  tags: string[]; // ['uniswap-router', 'aave-v3-pool', 'known-exchange', ...]
}

// --- Onboarding (Mode 1 Copilot) ---

export type OnboardingPath = 'newcomer' | 'has_wallet_no_experience' | 'active_wants_more';

export interface OnboardingStep {
  id: string;
  path: OnboardingPath;
  order: number;
  title: LocalizedString;
  description: LocalizedString;
  action: StepAction;
  completed: boolean;
}

export type StepAction =
  | { type: 'install_wallet'; recommendations: WalletOption[] }
  | { type: 'connect_wallet' }
  | { type: 'on_ramp'; providers: OnRampOption[] }
  | { type: 'first_swap'; defaultFromToken: Address; defaultToToken: Address }
  | { type: 'security_checklist'; items: string[] }
  | { type: 'first_defi'; suggestions: DefiSuggestion[] };

export interface WalletOption {
  name: string;
  custodial: boolean;
  url: string;
  description: LocalizedString;
}

export interface OnRampOption {
  provider: 'moonpay' | 'transak' | 'ramp' | 'direct_bank';
  url: string;
  supportedCountries: string[];
}

export interface DefiSuggestion {
  protocol: string;
  apy: number;
  risk: RiskLevel;
  action: 'stake' | 'lend' | 'lp';
}

// --- Localization ---

export interface LocalizedString {
  /** Translation key for static content. Resolved via i18next. */
  key?: string;
  /** Direct translations if dynamically generated (e.g., via Claude API). */
  translations?: Partial<Record<Locale, string>>;
  /** Fallback text in English. */
  fallback: string;
  /** Optional interpolation variables. */
  vars?: Record<string, string | number>;
}
