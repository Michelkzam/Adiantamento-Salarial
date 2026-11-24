#!/bin/bash

echo "🔧 Configurando ambiente para desenvolvimento Android..."

# Verificar sistema operacional
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "Sistema detectado: $MACHINE"

# Verificar Java
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
    echo "✅ Java encontrado: $JAVA_VERSION"
else
    echo "❌ Java não encontrado. Por favor, instale o Java JDK 11 ou superior."
    echo "Download: https://adoptium.net/"
fi

# Verificar Android Studio / SDK
if [ -d "$ANDROID_HOME" ]; then
    echo "✅ ANDROID_HOME configurado: $ANDROID_HOME"
else
    echo "❌ ANDROID_HOME não configurado."
    echo "Por favor, instale o Android Studio e configure as variáveis de ambiente:"
    echo ""
    echo "export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "export PATH=\$PATH:\$ANDROID_HOME/emulator"
    echo "export PATH=\$PATH:\$ANDROID_HOME/tools"
    echo "export PATH=\$PATH:\$ANDROID_HOME/tools/bin"
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
fi

# Verificar ADB
if command -v adb &> /dev/null; then
    echo "✅ ADB encontrado"
else
    echo "❌ ADB não encontrado. Verifique se o Android SDK está instalado."
fi

# Verificar Gradle
if command -v gradle &> /dev/null; then
    GRADLE_VERSION=$(gradle --version | grep "Gradle" | head -n 1)
    echo "✅ Gradle encontrado: $GRADLE_VERSION"
else
    echo "⚠️ Gradle não encontrado globalmente (será usado o wrapper do projeto)"
fi

echo ""
echo "📋 Resumo da configuração:"
echo "- Node.js: $(node --version 2>/dev/null || echo 'Não instalado')"
echo "- npm: $(npm --version 2>/dev/null || echo 'Não instalado')"
echo "- Java: $(java -version 2>&1 | head -n 1 | cut -d'"' -f2 2>/dev/null || echo 'Não instalado')"
echo "- Android SDK: $([ -d "$ANDROID_HOME" ] && echo 'Configurado' || echo 'Não configurado')"
echo ""

if [ -d "$ANDROID_HOME" ] && command -v java &> /dev/null && command -v node &> /dev/null; then
    echo "🎉 Ambiente configurado corretamente!"
    echo "Execute: ./scripts/build-android.sh para construir o APK"
else
    echo "⚠️ Ambiente incompleto. Verifique os itens marcados com ❌"
fi