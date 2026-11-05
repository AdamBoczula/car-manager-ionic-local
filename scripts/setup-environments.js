/**
 * Post-install script – kopiuje pliki środowiskowe z szablonów,
 * jeśli jeszcze nie istnieją (np. po świeżym klonowaniu repo).
 *
 * Uruchamiany automatycznie po `npm install`.
 */

const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, '..', 'apps', 'car-manager', 'src', 'environments');

const files = ['environment.ts', 'environment.prod.ts'];

files.forEach((file) => {
  const target = path.join(envDir, file);
  const source = path.join(envDir, file.replace('.ts', '.example.ts'));

  if (!fs.existsSync(target)) {
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`✅ Utworzono ${file} z szablonu .example`);
    } else {
      console.warn(`⚠️  Brak szablonu ${file.replace('.ts', '.example.ts')} – pomijam`);
    }
  } else {
    console.log(`✔️  ${file} już istnieje – pomijam`);
  }
});
