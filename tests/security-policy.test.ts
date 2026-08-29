import assert from 'node:assert/strict';
import test from 'node:test';
import { canAssignRole, canonicalRole, hasPermission, withoutTenantFields } from '../server/security-policy';

test('normalizes all delivery-driver role aliases', () => {
  assert.equal(canonicalRole('entregador'), 'motorista');
  assert.equal(canonicalRole('driver'), 'motorista');
});

test('enforces role permissions', () => {
  assert.equal(hasPermission('master', 'users:write'), true);
  assert.equal(hasPermission('admin', 'deliveries:delete'), true);
  assert.equal(hasPermission('operador', 'deliveries:delete'), false);
  assert.equal(hasPermission('motorista', 'deliveries:own-write'), true);
  assert.equal(hasPermission('motorista', 'users:read'), false);
});

test('prevents role escalation by administrators', () => {
  assert.equal(canAssignRole('admin', 'master'), false);
  assert.equal(canAssignRole('admin', 'operador'), true);
  assert.equal(canAssignRole('master', 'master'), true);
});

test('removes tenant-controlled fields from client payloads', () => {
  assert.deepEqual(withoutTenantFields({ companyId: 'other', organizationId: 'other', tenantId: 'other', nome: 'Registro' }), { nome: 'Registro' });
});
