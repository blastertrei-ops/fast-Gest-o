import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
const client = await readFile(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');

test('password migration accepts only a legacy hash once and upgrades to bcrypt', () => {
  assert.match(server, /isLegacyHash\(user\.senhaHash\)/);
  assert.match(server, /await bcrypt\.hash\(password, 12\)/);
  assert.doesNotMatch(server, /senhaHash:\s*hashPassword\('master123'\)/);
});

test('master routes and company routes have centralized authorization guards', () => {
  assert.match(server, /function requireRole/);
  assert.match(server, /\/api\/master\/companies', authenticateToken, requireRole\('master'\)/);
  assert.match(server, /function requireCompanyAccess/);
  assert.match(server, /app\.use\('\/api\/:resource\/:companyId', authenticateToken, requireCompanyAccess\)/);
});

test('tenant identity and cross-company references cannot be supplied by a client', () => {
  assert.match(server, /function withoutTenantFields/);
  assert.match(server, /companyId', 'organizationId', 'tenantId'/);
  assert.match(server, /function validateCompanyReferences/);
  assert.match(server, /O \$\{label\} informado não pertence a esta empresa/);
  assert.match(server, /tenantWritableCollections/);
  assert.doesNotMatch(server, /const tenantWritableCollections = new Set\([^)]*'usuarios'/);
});

test('the browser cannot use Firestore directly and Firestore rules are closed', () => {
  assert.doesNotMatch(client, /firebase\/firestore|onSnapshot|setDoc\(/);
  assert.match(rules, /allow read, write: if false/);
});
