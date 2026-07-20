import { expect, test } from '@playwright/test';

const apiBase = process.env.E2E_API_BASE ?? `${process.env.E2E_BASE_URL ?? 'http://localhost:8080'}/api/v1`;
const projectSource =
  process.env.E2E_PROJECT_PATH ?? '/repos/sample-project';

async function isStackHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase.replace(/\/api\/v1$/, '')}/api/v1/health`);
    return response.ok;
  } catch {
    return false;
  }
}

test.describe('analysis flow (SC-004)', () => {
  test.beforeAll(async () => {
    const healthy = await isStackHealthy();
    test.skip(!healthy, 'Docker stack not running (profile full on :8080)');
  });

  test('sync → language modal → changes modal → success toast', async ({ page, request }) => {
    const registerResponse = await request.post(`${apiBase}/projects`, {
      data: {
        source_type: 'local_path',
        source_value: projectSource,
        name: `e2e-analysis-${Date.now()}`,
      },
    });
    expect(registerResponse.ok()).toBeTruthy();
    const project = (await registerResponse.json()) as { id: string };

    await page.goto(`/projects/${project.id}`);

    const syncButton = page.getByRole('button', { name: /^Sync/ });
    await expect(syncButton).toBeEnabled({ timeout: 30_000 });
    await syncButton.click();

    await expect(page.getByRole('dialog', { name: 'Project languages and artifacts' })).toBeVisible({
      timeout: 120_000,
    });
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('dialog', { name: 'Code changes' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('status')).toContainText(/Analysis complete/, {
      timeout: 180_000,
    });
  });
});
