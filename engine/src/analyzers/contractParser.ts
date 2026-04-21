/**
 * Contract-level parser.
 *
 * Recognises the most common ERC-20 / ERC-721 / Uniswap / Aave / approval patterns
 * directly from tx `data` by matching the 4-byte selector prefix. Returns a typed
 * intent object that downstream risk-flag logic can reason about.
 *
 * Does not hit the network — pure decode. Reality-check against on-chain state
 * happens in the Tenderly simulation layer.
 */
import type { RawTransaction } from '@clarity/shared';

export interface ParsedIntent {
  kind: IntentKind;
  selector: string; // 0x...
  summary: string;  // english fallback, localized later
  fields: Record<string, string>;
}

export type IntentKind =
  | 'native_transfer'
  | 'erc20_transfer'
  | 'erc20_approve'
  | 'erc20_increase_allowance'
  | 'erc721_transfer'
  | 'erc721_approve_all'
  | 'uniswap_v2_swap'
  | 'uniswap_v3_exact_input'
  | 'aave_supply'
  | 'aave_borrow'
  | 'aave_repay'
  | 'aave_withdraw'
  | 'permit2_approve'
  | 'multicall'
  | 'unknown_contract_call'
  | 'empty';

// 4-byte selectors for known methods. Add sparingly — this table drives detection.
const SELECTOR_MAP: Record<string, IntentKind> = {
  '0xa9059cbb': 'erc20_transfer',                // transfer(address,uint256)
  '0x095ea7b3': 'erc20_approve',                 // approve(address,uint256)
  '0x39509351': 'erc20_increase_allowance',      // increaseAllowance(address,uint256)
  '0x23b872dd': 'erc20_transfer',                // transferFrom(address,address,uint256) — treat as transfer
  '0x42842e0e': 'erc721_transfer',               // safeTransferFrom(address,address,uint256)
  '0xa22cb465': 'erc721_approve_all',            // setApprovalForAll(address,bool)
  '0x38ed1739': 'uniswap_v2_swap',               // swapExactTokensForTokens
  '0x7ff36ab5': 'uniswap_v2_swap',               // swapExactETHForTokens
  '0x18cbafe5': 'uniswap_v2_swap',               // swapExactTokensForETH
  '0x414bf389': 'uniswap_v3_exact_input',        // exactInputSingle
  '0xc04b8d59': 'uniswap_v3_exact_input',        // exactInput
  '0x617ba037': 'aave_supply',                   // supply (Aave V3)
  '0xa415bcad': 'aave_borrow',                   // borrow (Aave V3)
  '0x573ade81': 'aave_repay',                    // repay (Aave V3)
  '0x69328dec': 'aave_withdraw',                 // withdraw (Aave V3)
  '0xac9650d8': 'multicall',                     // Multicall3
  '0x5ae401dc': 'multicall',                     // Multicall V4 on Uniswap router
  '0x36c78516': 'permit2_approve',               // permit2 approve
};

export function parseTransaction(tx: RawTransaction): ParsedIntent {
  const data = (tx.data ?? '0x').toLowerCase();
  const value = tx.value ?? '0x0';

  // Plain ETH transfer — no calldata or just "0x"
  if (data === '0x' || data === '') {
    return {
      kind: 'native_transfer',
      selector: '0x',
      summary: `Native transfer of ${value} wei to ${tx.to}`,
      fields: { to: tx.to, value },
    };
  }

  if (data.length < 10) {
    return {
      kind: 'unknown_contract_call',
      selector: data,
      summary: 'Malformed calldata (too short for a selector)',
      fields: {},
    };
  }

  const selector = data.slice(0, 10);
  const kind = SELECTOR_MAP[selector] ?? 'unknown_contract_call';

  const intent: ParsedIntent = {
    kind,
    selector,
    summary: summaryForKind(kind, tx, data),
    fields: extractFields(kind, data),
  };
  return intent;
}

function summaryForKind(kind: IntentKind, tx: RawTransaction, _data: string): string {
  switch (kind) {
    case 'erc20_approve':
      return `ERC-20 approval to contract ${tx.to}`;
    case 'erc20_increase_allowance':
      return `ERC-20 allowance increase to contract ${tx.to}`;
    case 'erc20_transfer':
      return `ERC-20 transfer via ${tx.to}`;
    case 'erc721_transfer':
      return `NFT transfer via ${tx.to}`;
    case 'erc721_approve_all':
      return `NFT collection-wide approval to operator on ${tx.to}`;
    case 'uniswap_v2_swap':
    case 'uniswap_v3_exact_input':
      return `Uniswap-style swap via router ${tx.to}`;
    case 'aave_supply':
      return `Aave supply to pool ${tx.to}`;
    case 'aave_borrow':
      return `Aave borrow from pool ${tx.to}`;
    case 'aave_repay':
      return `Aave repayment to pool ${tx.to}`;
    case 'aave_withdraw':
      return `Aave withdrawal from pool ${tx.to}`;
    case 'permit2_approve':
      return `Permit2 signature-based approval to ${tx.to}`;
    case 'multicall':
      return `Batched multi-call to ${tx.to}`;
    default:
      return `Contract call to ${tx.to} (selector ${_data.slice(0, 10)})`;
  }
}

/**
 * Extract a best-effort set of fields from calldata for the known intents.
 * Returns hex-padded values — consumers are expected to decode further.
 */
function extractFields(kind: IntentKind, data: string): Record<string, string> {
  // Calldata after 4-byte selector is 32-byte aligned (0x...).
  const tail = data.slice(10);
  const word = (i: number): string => '0x' + tail.slice(i * 64, (i + 1) * 64);

  switch (kind) {
    case 'erc20_approve':
    case 'erc20_increase_allowance':
      return { spender: addr(word(0)), amount: word(1) };
    case 'erc20_transfer':
      return { recipient: addr(word(0)), amount: word(1) };
    case 'erc721_approve_all':
      return { operator: addr(word(0)), approved: word(1) };
    case 'aave_supply':
    case 'aave_withdraw':
      return { asset: addr(word(0)), amount: word(1) };
    case 'aave_borrow':
    case 'aave_repay':
      return { asset: addr(word(0)), amount: word(1), interestRateMode: word(2) };
    default:
      return {};
  }
}

/** Extract right-most 20 bytes (address) from a 32-byte hex word. */
function addr(word: string): string {
  if (word.length !== 66) return word;
  return '0x' + word.slice(26);
}

/**
 * Known danger pattern: ERC-20 approve(spender, MAX_UINT256).
 * This is the single biggest cause of approval-related losses in crypto.
 */
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

export function isUnlimitedApproval(intent: ParsedIntent): boolean {
  if (intent.kind !== 'erc20_approve' && intent.kind !== 'erc20_increase_allowance') {
    return false;
  }
  return intent.fields.amount?.toLowerCase() === MAX_UINT256;
}
