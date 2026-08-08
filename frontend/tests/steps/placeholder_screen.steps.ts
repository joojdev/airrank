import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

Given('the app is running', async ({ page }) => {
  await page.goto('/')
})

When('the player opens the app', async () => {
  // Navigation already happened in the Given step; this step documents intent.
})

Then('they see a placeholder screen with a heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Airplane Guessing Game' })).toBeVisible()
})
