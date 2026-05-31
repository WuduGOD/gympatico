// frontend/tests/gympatico.spec.js
import { test, expect } from '@playwright/test';

test.describe('GymPatico Full E2E Mobile Workflow', () => {

  test('Rejestracja -> Logowanie -> Trening -> Filtry Kapsułkowe', async ({ page }) => {
    const uniqueId = Date.now();
    const botEmail = `bot_${uniqueId}@gympatico.pl`;
    const botNick = `RobotTester_${uniqueId}`;

    // 1. OTWARCIE STRONY I KLIKNIĘCIE LINKU REJESTRACJI
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Klikamy w przełącznik na dole karty, aby wejść w tryb rejestracji
    await page.click('text=Nie masz konta? Zarejestruj się');

    // Wypełniamy pole Nick, które pojawia się tylko przy rejestracji
    await page.locator('input[placeholder="np. Koksik99"]').fill(botNick);
    
    // Wypełniamy e-mail oraz hasło
    await page.locator('input[type="email"]').fill(botEmail);
    await page.locator('input[type="password"]').fill('BotPassword2026!');

    // Przygotowanie nasłuchiwania odpowiedzi sieciowej na rejestrację
    const registerPromise = page.waitForResponse(resp => 
      resp.url().includes('/api/auth/register') && resp.status() === 201
    );

    // Wysyłamy formularz przyciskiem rejestracji
    await page.click('button:has-text("Zarejestruj się 🚀")');
    await registerPromise; // Czekamy na potwierdzenie zapisu w bazie danych

    // 2. PROCES LOGOWANIA
    // Po udanej rejestracji komponent automatycznie resetuje formularz do trybu logowania
    await page.waitForLoadState('networkidle');
    
    // Email zostaje zachowany w stanie komponentu, wpisujemy tylko hasło ponownie
    await page.locator('input[type="password"]').fill('BotPassword2026!');

    // Przygotowanie nasłuchiwania na udany token JWT
    const loginPromise = page.waitForResponse(resp => 
      resp.url().includes('/api/auth/login') && resp.status() === 200
    );

    // Klikamy przycisk logowania
    await page.click('button:has-text("Zaloguj się 🦾")');
    await loginPromise;

    // Czekamy na poprawne przekierowanie na Dashboard i weryfikujemy stan autoryzacji
    await page.waitForURL('**/');
    await expect(page.getByText(botNick)).toBeVisible();

    // 3. ROZPOCZĘCIE TRENINGU W LOGGERZE
    await page.goto('/new-workout');
    await page.click('text=Pusty trening ➕');
    
    // Sprawdzamy czy załadował się nasz autorski Sticky Button
    const stickyAddButton = page.locator('text=Dodaj ćwiczenie do planu sesji');
    await expect(stickyAddButton).toBeVisible();
    await stickyAddButton.click();

    // 4. TEST WYSZUKIWARKI I FILTRÓW KAPSUŁKOWYCH W DRAWERZE
    await expect(page.locator('input[type="search"]')).toBeVisible();

    // Klikamy w kapsułkę filtrowania po klatce piersiowej
    await page.click('button:has-text("Klatka piersiowa")');
    
    // Sprawdzamy czy na liście zostało wyciskanie, a zniknęły przysiady ze sztangą
    await expect(page.locator('text=Wyciskanie sztangi na ławce poziomej')).toBeVisible();
    await expect(page.getByText('Przysiad ze sztangą na plecach')).not.toBeVisible();

    // Dodajemy ćwiczenie, klikając bezpośrednio w wiersz ćwiczenia w Atlasie
    await page.click('text=Wyciskanie sztangi na ławce poziomej');
    
    // 5. INLINE LOGOWANIE W TABELI SERII
    // Pierwszy input liczbowy to waga serii pierwszej
    await page.locator('input[type="number"]').first().fill('60');
    // Drugi input to powtórzenia serii pierwszej
    await page.locator('input[type="number"]').nth(1).fill('10');

    // Klikamy zatwierdzenie serii fajką ✓ (uruchamia timer przerwy)
    await page.locator('button:has-text("✓")').first().click();

    const skipTimer = page.getByRole('button', { name: 'Pomiń ✕' });
    if (await skipTimer.isVisible()) {
      await skipTimer.click();
    }

    const saveWorkout = page.waitForResponse(
      (resp) => resp.url().includes('/api/workouts') && resp.request().method() === 'POST' && resp.status() === 201
    );

    await page.getByRole('button', { name: 'Zakończ trening' }).click();
    await saveWorkout;
    await page.waitForURL('**/history');
    await expect(page.locator('text=Twoja historia aktywności')).toBeVisible();
  });
});