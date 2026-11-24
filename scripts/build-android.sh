#!/bin/bash

echo "🚀 Iniciando processo de build para Android..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale o npm primeiro."
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo "🏗️ Construindo projeto para produção..."
npm run build

echo "⚙️ Inicializando Capacitor..."
npx cap init "Adiantamento Salarial" "com.adiantamento.salarial" --web-dir=dist

echo "📱 Adicionando plataforma Android..."
npx cap add android

echo "🔄 Sincronizando arquivos..."
npx cap sync

echo "✅ Projeto preparado para Android!"
echo ""
echo "📋 Próximos passos:"
echo "1. Abra o Android Studio: npx cap open android"
echo "2. No Android Studio, vá em Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo "3. O APK será gerado em: android/app/build/outputs/apk/debug/"
echo ""
echo "🎉 Processo concluído com sucesso!"