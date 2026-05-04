import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
);

describe('database helper scripts', () => {
  it('has db:link:dev script targeting dev project ref', () => {
    expect(pkg.scripts['db:link:dev']).toBeDefined();
    expect(pkg.scripts['db:link:dev']).toContain('supabase link');
    expect(pkg.scripts['db:link:dev']).toContain('locxfzyhfugetawadghu');
  });

  it('has db:link:prod script targeting prod project ref', () => {
    expect(pkg.scripts['db:link:prod']).toBeDefined();
    expect(pkg.scripts['db:link:prod']).toContain('supabase link');
    expect(pkg.scripts['db:link:prod']).toContain('chikljxwgiskyjsnjelf');
  });

  it('has db:push script', () => {
    expect(pkg.scripts['db:push']).toBeDefined();
    expect(pkg.scripts['db:push']).toContain('supabase db push');
  });

  it('has db:push:dry script', () => {
    expect(pkg.scripts['db:push:dry']).toBeDefined();
    expect(pkg.scripts['db:push:dry']).toContain('--dry-run');
  });

  it('has db:seed script', () => {
    expect(pkg.scripts['db:seed']).toBeDefined();
  });

  it('has db:reset:dev script that links to dev first', () => {
    expect(pkg.scripts['db:reset:dev']).toBeDefined();
    expect(pkg.scripts['db:reset:dev']).toContain('db:link:dev');
  });
});
