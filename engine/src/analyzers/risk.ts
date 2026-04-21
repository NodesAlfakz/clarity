/**
 * Compose risk flags from multiple sources into a single analysis result.
 *
 * Inputs: contract-parser intent, Tenderly simulation, Blockaid threat scan.
 * Output: merged RiskFlag[] + overall RiskLevel.
 */
import type { RiskFlag, RiskLevel, SimulationResult } from '@clarity/shared';
import { isUnlimitedApproval, type ParsedIntent } from './contractParser';

export interface RiskAssessment {
  level: RiskLevel;
  flags: RiskFlag[];
}

const SEVERITY_ORDER: Record<RiskLevel, number> = {
  safe: 0,
  caution: 1,
  danger: 2,
  critical: 3,
};

export function assessRisk(
  intent: ParsedIntent,
  simulation: SimulationResult | null,
  blockaidFlags: RiskFlag[],
): RiskAssessment {
  const flags: RiskFlag[] = [];

  // 1. Structural flags from the intent itself.
  if (isUnlimitedApproval(intent)) {
    flags.push({
      code: 'unlimited_approval',
      severity: 'danger',
      explanation: {
        fallback:
          'This transaction grants the spender unlimited permission to move your tokens. ' +
          'If the spender contract is ever compromised, your full balance is at risk. ' +
          'Prefer approving only the exact amount you intend to spend.',
      },
    });
  }

  if (intent.kind === 'erc721_approve_all') {
    flags.push({
      code: 'unlimited_approval',
      severity: 'danger',
      explanation: {
        fallback:
          'This transaction grants an operator full control over every NFT in this collection, ' +
          'including ones you acquire later. Revoke after the immediate action completes.',
      },
    });
  }

  if (intent.kind === 'unknown_contract_call') {
    flags.push({
      code: 'unverified_contract',
      severity: 'caution',
      explanation: {
        fallback:
          'The calldata selector is not recognised. The function being called may be safe, ' +
          'but Clarity cannot decode its intent. Review the contract source before signing.',
      },
    });
  }

  // 2. Simulation failures are a hard signal.
  if (simulation && !simulation.success) {
    flags.push({
      code: 'unverified_contract',
      severity: 'danger',
      explanation: {
        fallback:
          simulation.error
            ? `Simulation reports the transaction would revert: ${simulation.error}`
            : 'Simulation reports the transaction would fail when executed.',
      },
    });
  }

  // 3. External threat-scan flags layered on top.
  flags.push(...blockaidFlags);

  // 4. Derive overall level as the max severity seen.
  const level = flags.reduce<RiskLevel>(
    (acc, f) => (SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[acc] ? f.severity : acc),
    'safe',
  );

  return { level, flags };
}
