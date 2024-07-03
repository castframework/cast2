import { expect } from 'chai';
import { validateUpgradeSafety } from '@openzeppelin/upgrades-core';

describe('SecurityTokenV1 - Data Layout', function () {
  it('should not change layout', async function () {
    const report = await validateUpgradeSafety(
      'dist/build-info',
      'SecurityTokenFakeV2',
      'SecurityTokenV1',
    );
    expect(report.ok).true;
  });
  it('should detect unsafe upgrade', async function () {
    const report = await validateUpgradeSafety(
      'dist/build-info',
      'SecurityTokenFakeV3',
      'SecurityTokenV1',
    );
    expect(report.ok).false;
  });
});
