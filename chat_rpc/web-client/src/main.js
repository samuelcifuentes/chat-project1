import { HomePage } from './pages/HomePage.js';

document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('app');
    const page = new HomePage(root);
    await page.init();
});

