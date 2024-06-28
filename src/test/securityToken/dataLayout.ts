import { expect } from 'chai';
import { getSecurityTokenDataLayout } from '../utils/dataLayout';
import '../utils/chai-eth-layout-snapshot';

describe('SecurityToken - Data Layout', function () {
  it('should not change layout', function () {
    const layout = getSecurityTokenDataLayout('securityToken/SecurityToken.sol');

    expect(layout).to.be.compatibleWithSnapshot(this);
  });
});
