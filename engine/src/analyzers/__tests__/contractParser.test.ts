/**
 * Unit tests for contract parser.
 *
 * Run:  npm test --workspace=@clarity/engine
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTransaction,
  isUnlimitedApproval,
  MAX_UINT256,
} from '../contractParser';

describe('parseTransaction', () => {
  it('recognises plain ETH transfer', () => {
    const intent = parseTransaction({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      value: '0x16345785d8a0000', // 0.1 ETH
      data: '0x',
    });
    assert.equal(intent.kind, 'native_transfer');
    assert.equal(intent.selector, '0x');
  });

  it('recognises ERC-20 approve', () => {
    const data =
      '0x095ea7b3' +
      '000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
      '00000000000000000000000000000000000000000000000000000000000003e8';
    const intent = parseTransaction({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x3333333333333333333333333333333333333333',
      value: '0x0',
      data,
    });
    assert.equal(intent.kind, 'erc20_approve');
    assert.equal(intent.selector, '0x095ea7b3');
    assert.equal(intent.fields.spender, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assert.equal(
      intent.fields.amount,
      '0x00000000000000000000000000000000000000000000000000000000000003e8',
    );
  });

  it('flags unlimited approval', () => {
    const data =
      '0x095ea7b3' +
      '000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
      MAX_UINT256.slice(2);
    const intent = parseTransaction({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x3333333333333333333333333333333333333333',
      value: '0x0',
      data,
    });
    assert.equal(intent.kind, 'erc20_approve');
    assert.equal(isUnlimitedApproval(intent), true);
  });

  it('does not flag bounded approval as unlimited', () => {
    const data =
      '0x095ea7b3' +
      '000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' +
      '00000000000000000000000000000000000000000000000000000000000003e8';
    const intent = parseTransaction({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x3333333333333333333333333333333333333333',
      value: '0x0',
      data,
    });
    assert.equal(isUnlimitedApproval(intent), false);
  });

  it('recognises ERC-721 setApprovalForAll', () => {
    const data =
      '0xa22cb465' +
      '000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' +
      '0000000000000000000000000000000000000000000000000000000000000001';
    const intent = parseTransaction({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x4444444444444444444444444444444444444444',
      value: '0x0',
      data,
    });
    assert.equal(intent.kind, 'erc721_approve_all');
  });

  it('recognises Uniswap V3 swap', () => {
    const intent = parseTransaction({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x5555555555555555555555555555555555555555',
      value: '0x0',
      data: '0x414bf389' + '00'.repeat(200), // stub tail
    });
    assert.equal(intent.kind, 'uniswap_v3_exact_input');
  });

  it('recognises Aave borrow', () => {
    const intent = parseTransaction({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x6666666666666666666666666666666666666666',
      value: '0x0',
      data: '0xa415bcad' + '00'.repeat(100),
    });
    assert.equal(intent.kind, 'aave_borrow');
  });

  it('falls back to unknown_contract_call for unknown selectors', () => {
    const intent = parseTransaction({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x7777777777777777777777777777777777777777',
      value: '0x0',
      data: '0xdeadbeef',
    });
    assert.equal(intent.kind, 'unknown_contract_call');
  });

  it('detects empty/malformed calldata', () => {
    const intent = parseTransaction({
      from: '0x1111111111111111111111111111111111111111',
      to: '0x8888888888888888888888888888888888888888',
      value: '0x0',
      data: '0x12',
    });
    assert.equal(intent.kind, 'unknown_contract_call');
  });
});
