/**
 * Carregador simples de variáveis .env
 * Evita a dependência do dotenv
 */

const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    const examplePath = path.join(__dirname, '..', '.env.example');

    // Se .env não existe, copia do .env.example
    if (!fs.existsSync(envPath)) {
        if (fs.existsSync(examplePath)) {
            fs.copyFileSync(examplePath, envPath);
            console.log('[ENV] Arquivo .env criado a partir do .env.example');
            console.log('[ENV] ⚠️  Configure suas credenciais no arquivo .env');
        } else {
            console.log('[ENV] ⚠️  Arquivo .env não encontrado! Crie um baseado no .env.example');
            return;
        }
    }

    try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();

            // Ignora comentários e linhas vazias
            if (!trimmed || trimmed.startsWith('#')) continue;

            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) continue;

            const key = trimmed.substring(0, eqIndex).trim();
            let value = trimmed.substring(eqIndex + 1).trim();

            // Remove aspas ao redor do valor
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            // Só define se não existir no ambiente
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }

        console.log('[ENV] Variáveis de ambiente carregadas');
    } catch (error) {
        console.error('[ENV] Erro ao carregar .env:', error.message);
    }
}

loadEnv();
